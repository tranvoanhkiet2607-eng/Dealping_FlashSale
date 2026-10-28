// DealPing Auto Worker & Bridge — Background Service Worker (MV3)
// Nhiệm vụ:
// 1. Khi ở "Chế độ Máy Trạm (Auto Worker)" trên máy Kiệt/Quân/Huy:
//    Định kỳ hỏi Backend trên Render xem có link Shopee/TikTok nào khách vừa dán trên điện thoại cần đọc Giá Sau Voucher không.
// 2. Tự động mở tab Shopee/TikTok ngầm (active: false), đợi content.js bóc xong giá (244.072₫ / 29.000₫),
//    bắn kết quả về Backend Render rồi LẬP TỨC ĐÓNG TAB (chrome.tabs.remove) để không tốn RAM!

const DEFAULT_BACKEND_URL = "https://api-dealping-be-flashsale.onrender.com";
const workerTabs = new Map(); // tabId -> { itemId, timeoutId }
let isProcessingJob = false;

function getWorkerConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["dealping_worker_enabled", "dealping_backend_url", "dealping_worker_stats"],
      (res) => {
        const isEnabled = res.dealping_worker_enabled !== undefined ? Boolean(res.dealping_worker_enabled) : true;
        const bUrl = (res.dealping_backend_url || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
        resolve({
          enabled: isEnabled,
          backendUrl: bUrl,
          stats: res.dealping_worker_stats || { completed: 0, lastItem: "Chưa có", lastTime: null }
        });
      }
    );
  });
}

async function submitPriceToBackend(backendUrl, payload) {
  try {
    await fetch(`${backendUrl}/api/worker/submit-price`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("[DealPing Worker] Đã gửi giá sau voucher về Backend Render:", payload);
  } catch (err) {
    console.warn("[DealPing Worker] Lỗi gửi giá về Backend:", err.message);
  }
}

// Lắng nghe dữ liệu DOM từ content.js gửi về ngay khi trang Shopee/TikTok vừa load xong
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "DEALPING_DOM_SCRAPED" && message.data) {
    const scrapedData = message.data;
    const tabId = sender && sender.tab ? sender.tab.id : null;

    getWorkerConfig().then(async (config) => {
      // 1. Gửi dữ liệu giá thực tế (Giá Sau Voucher) về Backend Render
      await submitPriceToBackend(config.backendUrl, scrapedData);

      // 2. Lưu vào storage để Popup hiển thị trực tiếp cho Huy xem
      chrome.storage.local.set({
        lastCapturedDealPingProduct: {
          productName: scrapedData.productName || "Sản phẩm sàn TMĐT",
          detectedPrice: scrapedData.detectedPrice,
          originalStrikePrice: scrapedData.originalStrikePrice,
          isVoucherPrice: scrapedData.isVoucherPrice,
          tier1: Math.round(Number(scrapedData.detectedPrice) * 0.9),
          tier2: Math.round(Number(scrapedData.detectedPrice) * 0.72),
          url: scrapedData.url,
          capturedAt: new Date().toLocaleTimeString("vi-VN")
        }
      });

      // 3. Nếu tab này do Auto Worker mở ngầm -> ĐÓNG TAB NGAY LẬP TỨC để giải phóng RAM!
      if (tabId && workerTabs.has(tabId)) {
        const jobInfo = workerTabs.get(tabId);
        if (jobInfo && jobInfo.timeoutId) {
          clearTimeout(jobInfo.timeoutId);
        }
        workerTabs.delete(tabId);
        isProcessingJob = false;

        const nextStats = {
          completed: (config.stats.completed || 0) + 1,
          lastItem: `${scrapedData.itemId || "SP"} (${Number(scrapedData.detectedPrice).toLocaleString("vi-VN")}₫)`,
          lastTime: new Date().toLocaleTimeString("vi-VN")
        };
        chrome.storage.local.set({ dealping_worker_stats: nextStats });

        try {
          chrome.tabs.remove(tabId);
        } catch (e) {}
      }
    });

    sendResponse({ ok: true });
    return true;
  }

  // Nhận yêu cầu chạy Test thử 1 link mẫu từ Popup
  if (message && message.type === "DEALPING_RUN_TEST_TASK") {
    const sampleUrl = message.url || "https://shopee.vn/product/407338006/18652392764";
    const sampleId = "18652392764";

    chrome.tabs.create({ url: sampleUrl, active: false }, (tab) => {
      if (!tab || !tab.id) return;
      const tabId = tab.id;
      const timeoutId = setTimeout(() => {
        if (workerTabs.has(tabId)) {
          workerTabs.delete(tabId);
          try {
            chrome.tabs.remove(tabId);
          } catch (e) {}
        }
      }, 15000);

      workerTabs.set(tabId, {
        itemId: sampleId,
        timeoutId
      });
    });

    sendResponse({ ok: true, started: true });
    return true;
  }
});

// Vòng lặp hỏi Backend mỗi 2.5 giây khi bật chế độ Máy Trạm (Auto Worker)
async function pollPendingTasks() {
  if (isProcessingJob) return;

  const config = await getWorkerConfig();
  if (!config.enabled || !config.backendUrl) return;

  try {
    const res = await fetch(`${config.backendUrl}/api/worker/pending-tasks`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return;

    const json = await res.json();
    const task = json && (json.task || json.data);
    if (!task || !task.url) return;

    isProcessingJob = true;

    // Mở tab Shopee/TikTok ở chế độ chạy ngầm (active: false) để không làm phiền người dùng
    chrome.tabs.create({ url: task.url, active: false }, (tab) => {
      if (!tab || !tab.id) {
        isProcessingJob = false;
        return;
      }

      const tabId = tab.id;
      // Bảo hiểm an toàn: Tự động đóng tab sau 12 giây nếu mạng lag hoặc link lỗi
      const timeoutId = setTimeout(() => {
        if (workerTabs.has(tabId)) {
          workerTabs.delete(tabId);
          isProcessingJob = false;
          try {
            chrome.tabs.remove(tabId);
          } catch (e) {}
        }
      }, 12000);

      workerTabs.set(tabId, {
        itemId: task.itemId || null,
        timeoutId
      });
    });
  } catch (err) {
    isProcessingJob = false;
  }
}

setInterval(pollPendingTasks, 2500);
