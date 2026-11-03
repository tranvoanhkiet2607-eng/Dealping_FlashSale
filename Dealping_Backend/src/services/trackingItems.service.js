const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { parseProductLink, extractProductNameFromUrl } = require("./linkParser.service");
const shopeePriceService = require("./shopeePriceService");
const tiktokPriceService = require("./tiktokPriceService");
const lazadaPriceService = require("./lazadaPriceService");
const affiliateService = require("./affiliate.service");
const axios = require("axios");
const {
  enqueueShopeeTask,
  requestWorkerLivePrice,
  getCachedVoucherPrice,
  getCachedVoucherData,
  updateCachedProductMeta,
  isItemPendingOrInFlight,
} = require("../routes/worker.routes");

/**
 * unlockedSlot2 = false -> tối đa 1 item
 * unlockedSlot2 = true  -> tối đa 2 item (hard cap theo yêu cầu)
 */
function getMaxSlots(user) {
  return user.unlockedSlot2 ? 2 : 1;
}

async function createTrackingItem({
  userId,
  shopeeUrl, // frontend vẫn gửi shopeeUrl hoặc productUrl
  productUrl,
  targetPrice,
  variantName,
  selectedModelId,
  productName: inputProductName,
  originalPrice: inputOriginalPrice,
  imageUrl: inputImageUrl,
}) {
  const finalUrl = shopeeUrl || productUrl;
  if (!userId || !finalUrl || targetPrice === undefined) {
    throw new ApiError(400, "Thiếu userId, productUrl hoặc targetPrice");
  }

  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    // Tự động tạo user tạm thời nếu chưa có để phục vụ việc test/guest
    user = await prisma.user.create({
      data: {
        id: userId,
        email: `guest_${userId.substring(0, 8)}@dealping.com`,
      },
    });
  }

  const currentCount = await prisma.trackingItem.count({ where: { userId } });

  if (currentCount >= 3) {
    const oldestItem = await prisma.trackingItem.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    if (oldestItem) {
      await prisma.trackingItem.delete({ where: { id: oldestItem.id } });
    }
  }

  const { platform, itemId, shopId, resolvedUrl } = await parseProductLink(finalUrl);

  const existingWhere = itemId
    ? { userId, itemId: BigInt(itemId) }
    : { userId, productUrl: resolvedUrl };

  const existing = await prisma.trackingItem.findFirst({
    where: existingWhere,
  });

  if (existing) {
    const updateData = { targetPrice, variantName, lastCheckedAt: new Date() };
    if (inputImageUrl) {
      updateData.imageUrl = inputImageUrl;
    }
    const updated = await prisma.trackingItem.update({
      where: { id: existing.id },
      data: updateData,
    });
    return serializeItem(updated);
  }

  let currentPrice = inputOriginalPrice || null;
  let productName = inputProductName?.trim() || null;
  let affiliateUrl = resolvedUrl;

  if (resolvedUrl.includes("shopee.vn")) {
    affiliateUrl = affiliateService.generateShopeeAffiliate(resolvedUrl);
  } else if (resolvedUrl.includes("tiktok.com")) {
    affiliateUrl = await affiliateService.generateTikTokAffiliate(resolvedUrl);
  } else if (resolvedUrl.includes("lazada.vn")) {
    affiliateUrl = await affiliateService.generateLazadaAffiliate(resolvedUrl);
  }

  let imageUrl = inputImageUrl || null;
  let voucherPrice = null;
  let variants = [];

  try {
    if (platform === "SHOPEE") {
      if (itemId) {
        enqueueShopeeTask(itemId, resolvedUrl || finalUrl);
      }
      const priceInfo = await shopeePriceService.fetchCurrentPrice(itemId, shopId, resolvedUrl);
      if (!currentPrice && priceInfo.price > 0) currentPrice = priceInfo.price;
      if (!productName) productName = priceInfo.productName;
      if (priceInfo.imageUrl) imageUrl = priceInfo.imageUrl;
      variants = priceInfo.variants || [];
      // Use actual voucher/commission data from API only — no guessing
      if (priceInfo.isXtra && Number(priceInfo.sellerComFinal) > 0) {
        const voucherDiscount = Math.floor(Number(priceInfo.sellerComFinal) / 10000) * 10000;
        voucherPrice = voucherDiscount > 0 ? Number(priceInfo.price) - voucherDiscount : null;
      }
      // Ưu tiên giá sau voucher từ máy trạm (Worker Extension DOM) nếu có
      let workerVoucher = getCachedVoucherPrice(itemId);
      if (!workerVoucher && itemId) {
        try {
          const dbCache = await prisma.shopeeProductCache.findUnique({
            where: { itemId: BigInt(itemId) },
          });
          if (dbCache && Number(dbCache.price) > 0) {
            workerVoucher = Number(dbCache.price);
          }
        } catch (e) {}
      }
      if (workerVoucher && workerVoucher > 0) {
        voucherPrice = workerVoucher;
        currentPrice = workerVoucher;
      }
    } else if (platform === "TIKTOK") {
      const priceInfo = await tiktokPriceService.fetchCurrentPrice(resolvedUrl || finalUrl, itemId, finalUrl);
      if (!currentPrice && priceInfo.price > 0) currentPrice = priceInfo.price;
      if (!productName) productName = priceInfo.productName;
      if (priceInfo.imageUrl) imageUrl = priceInfo.imageUrl;
    } else if (platform === "LAZADA") {
      const priceInfo = await lazadaPriceService.fetchCurrentPrice(resolvedUrl);
      if (!currentPrice && priceInfo.price > 0) currentPrice = priceInfo.price;
      if (!productName) productName = priceInfo.productName;
      if (priceInfo.imageUrl) imageUrl = priceInfo.imageUrl;
    }
  } catch (err) {
    console.error("Error fetching price in create:", err.message);
  }

  if (!productName || productName === "Không thể lấy tên sản phẩm") {
    productName = extractProductNameFromUrl(resolvedUrl) || "Sản phẩm theo dõi";
  }

  const item = await prisma.trackingItem.create({
    data: {
      userId,
      productName,
      itemId: itemId ? BigInt(itemId) : null,
      shopId: shopId ? BigInt(shopId) : null,
      originalPrice: currentPrice,
      targetPrice,
      productUrl: resolvedUrl,
      imageUrl: imageUrl,
      platform: platform || "SHOPEE",
      affiliateUrl: affiliateUrl,
      status: "TRACKING",
      variantName,
      selectedModelId: selectedModelId ? BigInt(selectedModelId) : null,
      lastCheckedAt: new Date(),
    },
  });

  const serialized = serializeItem(item);
  serialized.imageUrl = imageUrl;
  serialized.voucherPrice = voucherPrice;
  serialized.affiliateUrl = affiliateUrl;
  return serialized;
}

async function listTrackingItems(userId) {
  if (!userId) throw new ApiError(400, "Thiếu userId");
  const items = await prisma.trackingItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return items.map(serializeItem);
}

async function deleteTrackingItem(id, userId) {
  const item = await prisma.trackingItem.findUnique({ where: { id } });
  if (!item || item.userId !== userId) {
    throw new ApiError(404, "Không tìm thấy item để xoá");
  }
  await prisma.trackingItem.delete({ where: { id } });
}

function formatTimeAgo(date) {
  if (!date) return "Vừa xong";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();

  if (isNaN(diffMs) || diffMs < 30 * 1000) {
    return "Vừa xong";
  }
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return `${Math.floor(diffDay / 30)} tháng trước`;
}

function serializeItem(item) {
  const lastCheckedAtDate = item.lastCheckedAt || item.createdAt || new Date();
  const lastCheckedAgo = formatTimeAgo(lastCheckedAtDate);

  // Trạng thái theo dõi và lời khuyên rà soát giá
  let displayStatus = "monitoring";
  let statusLabel = "Đang rình giá";
  let advice = "Giá vẫn neo cao, khuyên chưa nên mua vội";

  if (item.status === "TARGET_HIT") {
    displayStatus = "target_hit";
    statusLabel = "Đã sập giá";
    advice = "Giá đã chạm đáy mục tiêu, nên mua ngay kẻo lỡ!";
  } else if (item.status === "PAUSED") {
    displayStatus = "paused";
    statusLabel = "Tạm dừng";
    advice = "Đang tạm dừng theo dõi sản phẩm này";
  }

  return {
    ...item,
    itemId: item.itemId?.toString() ?? null,
    shopId: item.shopId?.toString() ?? null,
    selectedModelId: item.selectedModelId?.toString() ?? null,
    rawStatus: item.status,
    status: displayStatus,
    statusLabel,
    statusText: statusLabel,
    advice,
    recommendation: advice,
    lastCheckedAt: lastCheckedAtDate instanceof Date ? lastCheckedAtDate.toISOString() : new Date(lastCheckedAtDate).toISOString(),
    lastCheckedAgo,
    lastCheckedText: lastCheckedAgo,
  };
}

async function getTrackingItemHistory(id) {
  const item = await prisma.trackingItem.findUnique({ where: { id } });
  if (!item) {
    throw new ApiError(404, "Không tìm thấy item");
  }

  const history = await prisma.priceHistory.findMany({
    where: { trackingItemId: id },
    orderBy: { timestamp: "desc" },
  });

  return history;
}

async function getTrackingItemChartHistory(id) {
  const item = await prisma.trackingItem.findUnique({ where: { id } });
  if (!item) {
    throw new ApiError(404, "Không tìm thấy item");
  }

  if (item.platform === "SHOPEE" && item.itemId) {
    return await shopeePriceService.fetchPriceHistory(item.itemId.toString());
  }

  return { labels: [], price: [] };
}

async function listBatchTrackingItems(userId) {
  if (!userId) throw new ApiError(400, "Thiếu userId");

  const items = await prisma.trackingItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (items.length === 0) return [];

  // Lọc ra các item thuộc Shopee và có itemId
  const shopeeItemIds = items
    .filter((item) => item.platform === "SHOPEE" && item.itemId)
    .map((item) => item.itemId.toString());

  let batchPrices = {};
  if (shopeeItemIds.length > 0) {
    batchPrices = await shopeePriceService.fetchBatchPrices(shopeeItemIds);
  }

  return items.map((item) => {
    const serialized = serializeItem(item);

    // Gắn thêm dữ liệu giá mới nhất nếu có
    if (item.platform === "SHOPEE" && item.itemId) {
      const cachedVoucher = getCachedVoucherPrice(item.itemId);
      if (cachedVoucher) {
        serialized.voucherPrice = cachedVoucher;
      }
      const liveData = batchPrices[item.itemId.toString()];
      if (liveData) {
        let livePrice = liveData.price;

        // Nếu item có chọn model cụ thể, lấy giá của model đó
        if (item.selectedModelId && liveData.variants && liveData.variants.length > 0) {
          const selectedVariant = liveData.variants.find(
            (v) => v.modelId && v.modelId.toString() === item.selectedModelId.toString()
          );
          if (selectedVariant && selectedVariant.price > 0) {
            livePrice = selectedVariant.price;
          }
        }

        serialized.livePrice = cachedVoucher || livePrice;
        serialized.liveProductName = liveData.productName;
        serialized.liveImageUrl = liveData.imageUrl;
        serialized.lastCheckedAt = new Date().toISOString();
        serialized.lastCheckedAgo = "Vừa xong";
        serialized.lastCheckedText = "Vừa xong";

        // Cập nhật ngầm timestamp quét giá mới nhất vào database
        prisma.trackingItem
          .update({
            where: { id: item.id },
            data: { lastCheckedAt: new Date() },
          })
          .catch(() => {});
      }
    }

    return serialized;
  });
}

async function previewTrackingItem(urlParams) {
  // urlParams có thể là shopeeUrl do FE gửi lên
  const finalUrl = urlParams;
  if (!finalUrl) throw new ApiError(400, "Thiếu đường dẫn sản phẩm");

  const { platform, itemId, shopId, resolvedUrl } = await parseProductLink(finalUrl);

  let productName = null;
  let currentPrice = null;
  let imageUrl = null;
  let voucherPrice = null;
  let voucherPending = false;
  let variants = [];
  let affiliateUrl = resolvedUrl;

  if (resolvedUrl.includes("shopee.vn")) {
    affiliateUrl = affiliateService.generateShopeeAffiliate(resolvedUrl);
  } else if (resolvedUrl.includes("tiktok.com")) {
    affiliateUrl = await affiliateService.generateTikTokAffiliate(resolvedUrl);
  } else if (resolvedUrl.includes("lazada.vn")) {
    affiliateUrl = await affiliateService.generateLazadaAffiliate(resolvedUrl);
  }

  let originalPrice = null;

  // 1. Ngay khi tách được itemId và resolvedUrl: kiểm tra ngay getCachedVoucherPrice(itemId).
  // Nếu đã có sẵn trong Cache (< 30 phút) -> Trả kết quả ngay lập tức trong 0.05s!
  if (platform === "SHOPEE" && itemId) {
    const cachedVoucherPrice = getCachedVoucherPrice(itemId);
    if (cachedVoucherPrice && cachedVoucherPrice > 0) {
      const cachedData = getCachedVoucherData(itemId) || {};
      const detectedPrice = Number(cachedVoucherPrice);
      const cachedName =
        cachedData.productName &&
        cachedData.productName !== "Không thể lấy tên sản phẩm" &&
        cachedData.productName !== "Đang cập nhật..."
          ? cachedData.productName
          : extractProductNameFromUrl(resolvedUrl) || "Sản phẩm theo dõi";
      const cachedOriginalPrice =
        cachedData.originalStrikePrice && Number(cachedData.originalStrikePrice) > detectedPrice
          ? Number(cachedData.originalStrikePrice)
          : Math.max(Number(cachedData.originalPrice || 0), Math.round(detectedPrice * 1.15));

      return {
        productName: cachedName,
        currentPrice: detectedPrice,
        originalPrice: cachedOriginalPrice,
        price: detectedPrice,
        resolvedUrl,
        platform,
        variants: cachedData.variants || [],
        imageUrl: cachedData.imageUrl || null,
        voucherPrice: detectedPrice,
        voucherPending: false,
        affiliateUrl,
        itemId: itemId.toString(),
      };
    }
  }

  try {
    if (platform === "SHOPEE") {
      // 2. Nếu chưa có trong Cache -> Lập tức gọi SONG SONG (Promise.all) ngay từ giây 0.2
      const [workerData, priceInfo] = await Promise.all([
        itemId ? requestWorkerLivePrice(itemId, resolvedUrl || finalUrl, 4000) : Promise.resolve(null),
        shopeePriceService.fetchCurrentPrice(itemId, shopId, resolvedUrl),
      ]);

      if (priceInfo) {
        currentPrice = priceInfo.price;
        originalPrice = priceInfo.originalPrice || currentPrice;
        productName = priceInfo.productName;
        imageUrl = priceInfo.imageUrl || null;
        variants = priceInfo.variants || [];

        if (itemId) {
          updateCachedProductMeta(itemId, {
            productName: priceInfo.productName,
            imageUrl: priceInfo.imageUrl || null,
            variants: priceInfo.variants || [],
            originalPrice: priceInfo.originalPrice || priceInfo.price || 0,
          });
        }
      }

      if (workerData && Number(workerData.detectedPrice) > 0) {
        // Extension đang bật (online), trả Giá Sau Voucher trong vòng 4.0s
        const price = Number(workerData.detectedPrice);
        currentPrice = price;
        voucherPrice = price;
        originalPrice =
          workerData.originalStrikePrice && Number(workerData.originalStrikePrice) > price
            ? Number(workerData.originalStrikePrice)
            : Math.max(
                (priceInfo && (priceInfo.originalPrice || priceInfo.price)) || 0,
                Math.round(price * 1.15)
              );

        if (
          (!productName ||
            productName === "Không thể lấy tên sản phẩm" ||
            productName === "Đang cập nhật...") &&
          workerData.productName
        ) {
          productName = workerData.productName;
        }
        if (!imageUrl && workerData.imageUrl) {
          imageUrl = workerData.imageUrl;
        }
        voucherPending = false;
      } else {
        // Cầu chì an toàn sau 4.0s: trả giá của addlivetag về trước kèm cờ voucherPending: true
        if (priceInfo && priceInfo.voucherPrice && Number(priceInfo.voucherPrice) > 0) {
          voucherPrice = Number(priceInfo.voucherPrice);
          currentPrice = voucherPrice;
        } else if (priceInfo && priceInfo.isXtra && Number(priceInfo.sellerComFinal) > 0) {
          const voucherDiscount = Math.floor(Number(priceInfo.sellerComFinal) / 10000) * 10000;
          voucherPrice = voucherDiscount > 0 ? Number(priceInfo.price) - voucherDiscount : null;
        }
        voucherPending = Boolean(itemId);
      }
    } else if (platform === "TIKTOK") {
      const priceInfo = await tiktokPriceService.fetchCurrentPrice(resolvedUrl || finalUrl, itemId, finalUrl);
      currentPrice = priceInfo.price;
      originalPrice = priceInfo.originalPrice || currentPrice;
      productName = priceInfo.productName;
      if (priceInfo.imageUrl) imageUrl = priceInfo.imageUrl;
      variants = priceInfo.variants || [];
      voucherPrice = priceInfo.voucherPrice || null;
    } else if (platform === "LAZADA") {
      const priceInfo = await lazadaPriceService.fetchCurrentPrice(resolvedUrl);
      currentPrice = priceInfo.price;
      originalPrice = priceInfo.originalPrice || currentPrice;
      productName = priceInfo.productName;
      if (priceInfo.imageUrl) imageUrl = priceInfo.imageUrl;
    }
  } catch (err) {
    console.error("Preview error:", err.message);
  }

  if (!productName || productName === "Không thể lấy tên sản phẩm") {
    productName = extractProductNameFromUrl(resolvedUrl) || "Sản phẩm theo dõi";
  }

  return {
    productName,
    currentPrice,
    originalPrice: originalPrice || currentPrice,
    price: currentPrice,
    resolvedUrl,
    platform,
    variants,
    imageUrl,
    voucherPrice,
    voucherPending,
    affiliateUrl,
    itemId: itemId ? itemId.toString() : null,
  };
}

/**
 * API: GET /api/tracking-items/live-voucher/:itemId
 * Trả về dữ liệu mới nhất từ processedVoucherCache để Frontend tự đồng bộ lại nếu tab quét xong trễ
 */
async function getLiveVoucher(itemId) {
  if (!itemId) {
    return { status: "pending", found: false, detectedPrice: null, voucherPrice: null };
  }
  const idStr = itemId.toString();
  const cachedData = getCachedVoucherData(idStr);

  if (cachedData && Number(cachedData.voucherPrice) > 0) {
    const detectedPrice = Number(cachedData.voucherPrice);
    const originalPrice =
      cachedData.originalStrikePrice && Number(cachedData.originalStrikePrice) > detectedPrice
        ? Number(cachedData.originalStrikePrice)
        : Math.max(Number(cachedData.originalPrice || 0), Math.round(detectedPrice * 1.15));

    return {
      status: "success",
      found: true,
      voucherPending: false,
      itemId: idStr,
      price: detectedPrice,
      currentPrice: detectedPrice,
      voucherPrice: detectedPrice,
      detectedPrice,
      originalPrice,
      originalStrikePrice: cachedData.originalStrikePrice || null,
      productName: cachedData.productName || null,
      imageUrl: cachedData.imageUrl || null,
      shopVouchers: cachedData.shopVouchers || [],
      capturedAt: cachedData.capturedAt,
    };
  }

  return {
    status: "pending",
    found: false,
    voucherPending: isItemPendingOrInFlight(idStr),
    itemId: idStr,
    price: null,
    currentPrice: null,
    voucherPrice: null,
    detectedPrice: null,
    originalPrice: null,
    capturedAt: null,
  };
}

const getLiveVoucherPrice = getLiveVoucher;

async function updateTargetPrice(id, targetPrice, userId) {
  const where = userId ? { id, userId } : { id };
  const item = await prisma.trackingItem.findFirst({ where });
  if (!item) {
    throw new ApiError(404, "Không tìm thấy sản phẩm để cập nhật giá mong muốn");
  }
  const updated = await prisma.trackingItem.update({
    where: { id: item.id },
    data: {
      targetPrice: Number(targetPrice),
      lastCheckedAt: new Date(),
    },
  });
  return serializeItem(updated);
}

async function simulatePriceDrop(id, userId) {
  const where = userId ? { id, userId } : { id };
  const item = await prisma.trackingItem.findFirst({
    where,
    include: { user: true },
  });
  if (!item) {
    throw new ApiError(404, "Không tìm thấy sản phẩm để kích hoạt sập giá");
  }
  const dropPrice = item.targetPrice ? Number(item.targetPrice) : 100000;
  const now = new Date();

  // 1. Cập nhật trạng thái sập giá vào Database
  const updated = await prisma.trackingItem.update({
    where: { id: item.id },
    data: {
      status: "TARGET_HIT",
      lastCheckedAt: now,
    },
  });

  // 2. Ghi lịch sử giá sập vào priceHistory trong Database
  try {
    await prisma.priceHistory.create({
      data: {
        trackingItemId: item.id,
        price: dropPrice,
        timestamp: now,
      },
    });
  } catch (e) {}

  // 3. Tạo thông báo trong Database & bắn Push Notification
  const notificationService = require("./notificationService");
  try {
    await notificationService.notifyPriceDrop({
      userId: item.userId,
      deviceToken: item.user ? item.user.deviceToken : null,
      trackingItemId: item.id,
      productName: item.productName || "Sản phẩm bạn đang theo dõi",
      productUrl: item.productUrl || "",
      oldPrice: item.originalPrice ? Number(item.originalPrice) : Math.round(dropPrice * 1.3),
      newPrice: dropPrice,
      targetPrice: dropPrice,
    });
  } catch (e) {}

  return serializeItem(updated);
}

module.exports = {
  getMaxSlots,
  createTrackingItem,
  listTrackingItems,
  deleteTrackingItem,
  getTrackingItemHistory,
  previewTrackingItem,
  getLiveVoucher,
  getLiveVoucherPrice,
  getTrackingItemChartHistory,
  listBatchTrackingItems,
  serializeItem,
  formatTimeAgo,
  updateTargetPrice,
  simulatePriceDrop,
};
