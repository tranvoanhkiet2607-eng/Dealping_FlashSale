const cron = require("node-cron");
const prisma = require("../config/prisma");
const shopeePriceService = require("./shopeePriceService");
const tiktokPriceService = require("./tiktokPriceService");
const lazadaPriceService = require("./lazadaPriceService");
const { notifyPriceDrop } = require("./notificationService");
const { getCachedVoucherPrice } = require("../routes/worker.routes");

// Các khung giờ vàng Shopee tung mã giảm giá (0h, 9h, 12h, 20h, 21h)
const SHOPEE_VOUCHER_HOURS = [0, 9, 12, 20, 21];

/**
 * Chia mảng thành các chunk nhỏ hơn
 */
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Xử lý khi có giá mới hoặc khi bot rà soát giá xong
 */
async function processPriceUpdate(item, currentPrice, itemData = {}) {
  const now = new Date();
  const itemId = item.itemId ? item.itemId.toString() : null;
  const targetPriceNum =
    item.targetPrice && typeof item.targetPrice.toNumber === "function"
      ? item.targetPrice.toNumber()
      : Number(item.targetPrice);

  // Ưu tiên lấy giá thực tế: Giá Sau Voucher từ máy trạm -> Giá Flash Sale -> Giá hiện tại
  const effectivePrice =
    (item.platform === "SHOPEE" && itemId ? getCachedVoucherPrice(itemId) : null) ||
    (itemData && itemData.flashSalePrice) ||
    currentPrice;

  const hasValidPrice = Boolean(effectivePrice && effectivePrice > 0);

  // Kiểm tra khung giờ Shopee tung mã (0h, 9h, 12h, 20h, 21h) theo giờ Việt Nam & giờ hệ thống
  const vnHour =
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "numeric",
        hour12: false,
      }).format(now)
    ) % 24;
  const isShopeeVoucherHour =
    SHOPEE_VOUCHER_HOURS.includes(now.getHours()) ||
    SHOPEE_VOUCHER_HOURS.includes(vnHour);

  const isDirectHit = Boolean(hasValidPrice && effectivePrice <= targetPriceNum);
  const baseListedPrice = currentPrice && currentPrice > 0 ? currentPrice : effectivePrice;
  const isVoucherHourHit = Boolean(
    hasValidPrice &&
    item.platform === "SHOPEE" &&
    isShopeeVoucherHour &&
    (baseListedPrice * 0.85 <= targetPriceNum || effectivePrice * 0.85 <= targetPriceNum)
  );

  const isTargetHit = isDirectHit || isVoucherHourHit;
  const finalAlertPrice = isDirectHit
    ? effectivePrice
    : isVoucherHourHit
      ? Math.round(Math.min(baseListedPrice, effectivePrice) * 0.85)
      : effectivePrice;

  try {
    // Luôn cập nhật lastCheckedAt để chứng minh bot vừa quét thật
    await prisma.trackingItem.update({
      where: { id: item.id },
      data: {
        lastCheckedAt: now,
        ...(isTargetHit ? { status: "TARGET_HIT" } : {}),
        ...(hasValidPrice && !item.originalPrice ? { originalPrice: effectivePrice } : {}),
      },
    });
  } catch (err) {
    console.error(`[CRON] Lỗi cập nhật lastCheckedAt cho item ${item.id}:`, err.message);
  }

  if (!hasValidPrice) return;

  // Lưu vào lịch sử giá
  try {
    await prisma.priceHistory.create({
      data: {
        trackingItemId: item.id,
        price: finalAlertPrice,
        timestamp: now,
      },
    });
  } catch (err) {
    console.error(`[CRON] Lỗi lưu priceHistory cho item ${item.id}:`, err.message);
  }

  // So sánh giá với targetPrice
  if (isTargetHit) {
    console.log(
      `[CRON] 🎯 TING TING SẬP GIÁ: Sản phẩm ${item.productName || item.id
      } đã đạt giá mục tiêu (${finalAlertPrice} <= ${targetPriceNum})!`
    );

    // Tạo thông báo sập giá in-app & gửi Push Notification
    try {
      await notifyPriceDrop({
        userId: item.userId,
        deviceToken: item.user ? item.user.deviceToken : null,
        trackingItemId: item.id,
        productName: item.productName || "Sản phẩm bạn đang theo dõi",
        productUrl: item.productUrl || "",
        oldPrice: item.originalPrice
          ? typeof item.originalPrice.toNumber === "function"
            ? item.originalPrice.toNumber()
            : Number(item.originalPrice)
          : Math.round(finalAlertPrice * 1.3),
        newPrice: finalAlertPrice,
        targetPrice: targetPriceNum,
      });
      console.log(`[CRON] Đã ghi nhận thông báo sập giá cho user ${item.userId}`);
    } catch (notifyErr) {
      console.error(`[CRON] Lỗi khi tạo thông báo sập giá:`, notifyErr.message);
    }
  } else {
    console.log(
      `[CRON] 🔍 [Rình giá] Sản phẩm ${item.productName || item.id
      } giá: ${effectivePrice}đ (Mục tiêu: ${targetPriceNum}đ). lastCheckedAt đã cập nhật.`
    );
  }
}

// Khóa chống quét chồng lấn (concurrency guard)
let isScanning = false;

/**
 * Hàm thực hiện 1 chu kỳ quét toàn bộ sản phẩm đang TRACKING
 */
async function runPriceCheckBot() {
  if (isScanning) {
    console.log("[CRON] Tiến trình quét giá trước đó vẫn đang chạy, bỏ qua chu kỳ này...");
    return;
  }
  isScanning = true;
  const startTime = Date.now();
  console.log(`[CRON] [${new Date().toISOString()}] Bắt đầu chu kỳ rà soát giá tự động...`);

  try {
    const trackingItems = await prisma.trackingItem.findMany({
      where: { status: "TRACKING" },
      include: { user: true },
    });

    if (trackingItems.length === 0) {
      console.log("[CRON] Không có sản phẩm nào đang ở trạng thái TRACKING.");
      return;
    }

    console.log(`[CRON] Đang rà soát ${trackingItems.length} sản phẩm theo dõi...`);

    // Phân tách Shopee và các nền tảng khác
    const shopeeItems = trackingItems.filter(
      (item) => item.platform === "SHOPEE" && item.itemId != null
    );
    const otherItems = trackingItems.filter(
      (item) => item.platform !== "SHOPEE" || item.itemId == null
    );

    // 1. Xử lý Shopee qua Batch API
    const shopeeChunks = chunkArray(shopeeItems, 100);
    for (const chunk of shopeeChunks) {
      const itemIds = chunk.map((i) => i.itemId.toString());
      try {
        const batchResults = await shopeePriceService.fetchBatchPrices(itemIds);
        for (const item of chunk) {
          const itemId = item.itemId.toString();
          const itemData = batchResults[itemId] || {};
          let currentPrice = itemData ? itemData.price : null;

          if (
            itemData &&
            item.selectedModelId &&
            itemData.variants &&
            itemData.variants.length > 0
          ) {
            const selectedVariant = itemData.variants.find(
              (v) => v.modelId && v.modelId.toString() === item.selectedModelId.toString()
            );
            if (selectedVariant && selectedVariant.price > 0) {
              currentPrice = selectedVariant.price;
            }
          }

          const effectivePrice =
            getCachedVoucherPrice(itemId) || itemData.flashSalePrice || currentPrice;

          await processPriceUpdate(item, effectivePrice, itemData);
        }
      } catch (e) {
        console.error("[CRON] Lỗi khi gọi Shopee Batch API:", e.message);
        // Vẫn cập nhật lastCheckedAt cho chunk để dữ liệu luôn mới
        for (const item of chunk) {
          await processPriceUpdate(item, null);
        }
      }
    }

    // 2. Xử lý TikTok và Lazada (hoặc Shopee không có itemId)
    for (const item of otherItems) {
      let currentPrice = null;
      let itemData = {};
      try {
        const url = item.productUrl;

        if (item.platform === "SHOPEE") {
          const shopeeInfo = await shopeePriceService.fetchCurrentPrice(null, null, url);
          currentPrice = shopeeInfo ? shopeeInfo.price : null;
          itemData = shopeeInfo || {};
        } else if (item.platform === "TIKTOK") {
          const tiktokInfo = await tiktokPriceService.fetchCurrentPrice(url);
          currentPrice = tiktokInfo ? tiktokInfo.price : null;
        } else if (item.platform === "LAZADA") {
          const lazadaInfo = await lazadaPriceService.fetchCurrentPrice(url);
          currentPrice = lazadaInfo ? lazadaInfo.price : null;
        }
      } catch (error) {
        console.error(`[CRON] Lỗi khi quét giá cho sản phẩm ${item.id}:`, error.message);
      }

      const itemId = item.itemId ? item.itemId.toString() : null;
      const effectivePrice =
        (item.platform === "SHOPEE" && itemId ? getCachedVoucherPrice(itemId) : null) ||
        itemData.flashSalePrice ||
        currentPrice;

      await processPriceUpdate(item, effectivePrice, itemData);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[CRON] Hoàn thành chu kỳ rà soát giá trong ${elapsed}s.`);
  } catch (err) {
    console.warn("[CRON] Thông báo quét giá (đang kết nối DB):", err.message || "Đang thử lại chu kỳ sau...");
  } finally {
    isScanning = false;
  }
}

/**
 * Bắt đầu các cron jobs để lấy giá tự động.
 */
function startCronJobs() {
  // Chu kỳ quét tự động: Mặc định mỗi 10 phút (hoặc cấu hình qua biến môi trường CRON_SCHEDULE)
  const cronSchedule = process.env.CRON_SCHEDULE || "*/10 * * * *";

  cron.schedule(cronSchedule, runPriceCheckBot);
  console.log(`[CRON] Đã thiết lập cron job quét giá tự động (mỗi 10 phút: ${cronSchedule}).`);

  // Kích hoạt 1 lượt quét ngay khi server khởi động (delay 3s để hoàn tất khởi động)
  setTimeout(() => {
    console.log("[CRON] Chạy lượt quét khởi động ban đầu để làm mới lastCheckedAt...");
    runPriceCheckBot().catch((err) => console.error("[CRON] Lỗi quét khởi động:", err));
  }, 3000);
}

module.exports = { startCronJobs, runPriceCheckBot, processPriceUpdate };
