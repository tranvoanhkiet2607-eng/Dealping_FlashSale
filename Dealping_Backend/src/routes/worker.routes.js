const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

// Thời gian sống của Cache giá Voucher (30 phút) và trạng thái đang mở tab (15 giây)
const VOUCHER_CACHE_TTL_MS = 30 * 60 * 1000;
const IN_FLIGHT_TTL_MS = 15 * 1000;

// Hàng đợi các link Shopee đang chờ máy trạm Kiệt/Quân/Huy đọc DOM
// Lưu trong RAM để phản hồi siêu tốc độ (0.01 giây), không cần query DB nặng
const pendingQueue = [];
const processedVoucherCache = new Map(); // itemId -> { voucherPrice, detectedPrice, originalStrikePrice, productName, imageUrl, variants, originalPrice, capturedAt }
const inFlightItems = new Map(); // itemId -> timestamp đang được máy trạm mở tab quét trong vòng 15s qua
const itemWaiters = new Map(); // itemId -> Set<function(workerData)> (Gom trùng: các request cùng chờ chung 1 tab đang mở)
const productMetaCache = new Map(); // itemId -> { productName, imageUrl, variants, originalPrice }

function isItemInFlight(itemId) {
  if (!itemId) return false;
  const idStr = itemId.toString();
  const startedAt = inFlightItems.get(idStr);
  if (!startedAt) return false;
  if (Date.now() - startedAt < IN_FLIGHT_TTL_MS) {
    return true;
  }
  inFlightItems.delete(idStr);
  return false;
}

function isItemInPendingQueue(itemId) {
  if (!itemId) return false;
  const idStr = itemId.toString();
  return pendingQueue.some((t) => t.itemId === idStr);
}

function isItemPendingOrInFlight(itemId) {
  return isItemInPendingQueue(itemId) || isItemInFlight(itemId);
}

function getCachedVoucherData(itemId) {
  if (!itemId) return null;
  const idStr = itemId.toString();
  const item = processedVoucherCache.get(idStr);
  if (!item) return null;

  if (Date.now() - item.capturedAt >= VOUCHER_CACHE_TTL_MS) {
    processedVoucherCache.delete(idStr);
    return null;
  }

  const meta = productMetaCache.get(idStr);
  if (meta) {
    return {
      ...meta,
      ...item,
      productName: item.productName || meta.productName || null,
      imageUrl: item.imageUrl || meta.imageUrl || null,
      variants: item.variants && item.variants.length > 0 ? item.variants : meta.variants || [],
      originalPrice: item.originalPrice || meta.originalPrice || null,
    };
  }
  return item;
}

function getCachedVoucherPrice(itemId) {
  const item = getCachedVoucherData(itemId);
  return item && item.voucherPrice > 0 ? Number(item.voucherPrice) : null;
}

function updateCachedProductMeta(itemId, meta = {}) {
  if (!itemId) return;
  const idStr = itemId.toString();
  const prevMeta = productMetaCache.get(idStr) || {};
  const nextMeta = {
    productName: meta.productName || prevMeta.productName || null,
    imageUrl: meta.imageUrl || prevMeta.imageUrl || null,
    variants:
      Array.isArray(meta.variants) && meta.variants.length > 0
        ? meta.variants
        : prevMeta.variants || [],
    originalPrice: meta.originalPrice || prevMeta.originalPrice || null,
  };
  productMetaCache.set(idStr, nextMeta);

  const existingVoucher = processedVoucherCache.get(idStr);
  if (existingVoucher) {
    processedVoucherCache.set(idStr, {
      ...existingVoucher,
      productName: existingVoucher.productName || nextMeta.productName,
      imageUrl: existingVoucher.imageUrl || nextMeta.imageUrl,
      variants:
        existingVoucher.variants && existingVoucher.variants.length > 0
          ? existingVoucher.variants
          : nextMeta.variants,
      originalPrice: existingVoucher.originalPrice || nextMeta.originalPrice,
    });
  }
}

/**
 * Hàm helper dùng nội bộ:
 * Gom trùng tuyệt đối (Deduplication):
 * Nếu itemId đã có trong processedVoucherCache (< 30 phút) HOẶC đang nằm trong pendingQueue
 * HOẶC đang trong inFlightItems (< 15s) thì KHÔNG đẩy trùng vào pendingQueue nữa.
 */
function enqueueShopeeTask(itemId, url) {
  if (!itemId || !url) return false;
  const idStr = itemId.toString();

  if (getCachedVoucherData(idStr) || isItemInPendingQueue(idStr) || isItemInFlight(idStr)) {
    return false;
  }

  pendingQueue.push({ itemId: idStr, url: url, enqueuedAt: Date.now() });
  // Giới hạn tối đa 50 link để tránh phình RAM
  if (pendingQueue.length > 50) pendingQueue.shift();
  return true;
}

/**
 * Yêu cầu máy trạm quét giá trực tiếp và chờ kết quả (tối đa timeoutMs, mặc định 4000ms).
 * Nhiều người cùng dán 1 link sẽ gom trùng và cùng chờ chung kết quả của 1 tab duy nhất.
 */
function requestWorkerLivePrice(itemId, url, timeoutMs = 4000) {
  if (!itemId || !url) return Promise.resolve(null);
  const idStr = itemId.toString();

  // Nếu đã có sẵn trong Cache (< 30 phút) -> trả về ngay lập tức
  const cached = getCachedVoucherData(idStr);
  if (cached && cached.voucherPrice > 0) {
    return Promise.resolve(cached);
  }

  // Gom trùng tuyệt đối: chỉ đẩy vào pendingQueue nếu chưa có trong cache, queue và inFlightItems
  enqueueShopeeTask(idStr, url);

  // Cho các request cùng chờ chung kết quả của tab đang mở
  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const waiters = itemWaiters.get(idStr);
      if (waiters) {
        waiters.delete(onResult);
        if (waiters.size === 0) itemWaiters.delete(idStr);
      }
      resolve(null);
    }, timeoutMs);

    function onResult(workerData) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(workerData);
    }

    if (!itemWaiters.has(idStr)) {
      itemWaiters.set(idStr, new Set());
    }
    itemWaiters.get(idStr).add(onResult);
  });
}

/**
 * 1. API cho Extension trên máy Kiệt/Quân/Huy hỏi việc — Chia việc xoay vòng (Round-Robin)
 * GET /api/worker/pending-tasks
 */
router.get("/pending-tasks", (req, res) => {
  while (pendingQueue.length > 0) {
    const task = pendingQueue.shift(); // Lấy đúng 1 task cũ nhất ra xử lý (Round-Robin giữa các máy trạm)
    if (!task || !task.itemId) continue;

    const idStr = task.itemId.toString();
    // Bỏ qua nếu vừa được cache (< 30m) hoặc đang được máy khác mở tab (< 15s)
    if (getCachedVoucherData(idStr) || isItemInFlight(idStr)) {
      continue;
    }

    inFlightItems.set(idStr, Date.now());
    return res.status(200).json({ task });
  }

  return res.status(200).json({ task: null });
});

/**
 * 2. API cho Extension trả về Giá Sau Voucher (244.072₫ / 29.000₫)
 * POST /api/worker/submit-price
 */
router.post("/submit-price", async (req, res) => {
  try {
    const {
      itemId,
      detectedPrice,
      productName,
      imageUrl,
      originalStrikePrice,
      isVoucherPrice,
      shopVouchers,
    } = req.body;
    if (!itemId || !detectedPrice) {
      return res.status(400).json({ status: "error", message: "Thiếu itemId hoặc detectedPrice" });
    }

    const idStr = itemId.toString();
    const priceNum = Number(detectedPrice);
    const strikeNum =
      originalStrikePrice && Number(originalStrikePrice) > 0
        ? Number(originalStrikePrice)
        : null;

    // Xoá khỏi inFlightItems và pendingQueue (nếu còn tồn đọng)
    inFlightItems.delete(idStr);
    for (let i = pendingQueue.length - 1; i >= 0; i--) {
      if (pendingQueue[i].itemId === idStr) {
        pendingQueue.splice(i, 1);
      }
    }

    const prevCache = processedVoucherCache.get(idStr) || {};
    const meta = productMetaCache.get(idStr) || {};

    const workerData = {
      ...meta,
      ...prevCache,
      itemId: idStr,
      voucherPrice: priceNum,
      detectedPrice: priceNum,
      originalStrikePrice: strikeNum || prevCache.originalStrikePrice || null,
      productName: productName || prevCache.productName || meta.productName || null,
      imageUrl: imageUrl || prevCache.imageUrl || meta.imageUrl || null,
      isVoucherPrice: isVoucherPrice !== undefined ? Boolean(isVoucherPrice) : true,
      shopVouchers: Array.isArray(shopVouchers)
        ? shopVouchers
        : prevCache.shopVouchers || [],
      capturedAt: Date.now(),
    };

    // Lưu vào RAM Cache để Web App lấy ngay lập tức (0.05s)
    processedVoucherCache.set(idStr, workerData);

    // Đánh thức toàn bộ các request đang cùng chờ kết quả của tab này ngay lập tức
    const waiters = itemWaiters.get(idStr);
    if (waiters && waiters.size > 0) {
      for (const notifyWaiter of waiters) {
        try {
          notifyWaiter(workerData);
        } catch (e) {}
      }
      itemWaiters.delete(idStr);
    }

    // Cập nhật hoặc lưu vào bảng ShopeeProductCache trong PostgreSQL
    try {
      await prisma.shopeeProductCache.upsert({
        where: { itemId: BigInt(itemId) },
        update: {
          price: priceNum,
          productName: productName || undefined,
          ...(imageUrl ? { imageUrl } : {}),
          updatedAt: new Date(),
        },
        create: {
          itemId: BigInt(itemId),
          price: priceNum,
          productName: productName || "Sản phẩm Shopee",
          ...(imageUrl ? { imageUrl } : {}),
        },
      });
    } catch (dbErr) {
      console.warn("[Worker Submit] Cập nhật DB Cache cảnh báo:", dbErr.message);
    }

    // Nếu tab quét xong ở giây thứ 5-6 và trong bảng tracking_items có món vừa lưu với itemId đó
    // -> tự động update lại originalPrice và targetPrice trong DB theo giá Voucher vừa bóc được
    try {
      const trackedItems = await prisma.trackingItem.findMany({
        where: { itemId: BigInt(itemId) },
      });

      for (const tracked of trackedItems) {
        const oldOrig = tracked.originalPrice ? Number(tracked.originalPrice) : 0;
        const oldTarget = tracked.targetPrice ? Number(tracked.targetPrice) : 0;

        let newTargetPrice = oldTarget;
        if (oldOrig > 0 && oldTarget > 0 && oldTarget < oldOrig) {
          const ratio = oldTarget / oldOrig;
          if (Math.abs(ratio - 0.9) < 0.03) {
            const drop1 = Math.max(1000, Math.round((priceNum * 0.1) / 1000) * 1000);
            newTargetPrice = Math.max(0, priceNum - drop1);
          } else if (Math.abs(ratio - 0.72) < 0.03) {
            const drop2 = Math.max(2000, Math.round((priceNum * 0.28) / 1000) * 1000);
            newTargetPrice = Math.max(0, priceNum - drop2);
          } else {
            newTargetPrice = Math.max(1000, Math.round((priceNum * ratio) / 1000) * 1000);
          }
        } else {
          const drop2 = Math.max(2000, Math.round((priceNum * 0.28) / 1000) * 1000);
          newTargetPrice = Math.max(0, priceNum - drop2);
        }

        await prisma.trackingItem.update({
          where: { id: tracked.id },
          data: {
            originalPrice: priceNum,
            targetPrice: newTargetPrice,
            ...(productName &&
            (!tracked.productName ||
              tracked.productName === "Sản phẩm theo dõi" ||
              tracked.productName === "Đang cập nhật...")
              ? { productName }
              : {}),
            lastCheckedAt: new Date(),
          },
        });
      }
    } catch (trackUpdateErr) {
      console.warn("[Worker Submit] Cập nhật tracking_items cảnh báo:", trackUpdateErr.message);
    }

    console.log(
      `[Worker] ✅ Đã nhận Giá Sau Voucher từ máy trạm cho Item ${itemId}: ${priceNum.toLocaleString("vi-VN")}₫`
    );
    return res.status(200).json({ status: "success", received: true, data: workerData });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = Object.assign(router, {
  router,
  inFlightItems,
  processedVoucherCache,
  pendingQueue,
  enqueueShopeeTask,
  requestWorkerLivePrice,
  getCachedVoucherPrice,
  getCachedVoucherData,
  updateCachedProductMeta,
  isItemPendingOrInFlight,
});
