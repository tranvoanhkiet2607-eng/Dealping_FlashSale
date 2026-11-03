// DealPing Auto Worker & Bridge — Background Service Worker (MV3)
// Chế độ "Tàng hình (Stealth Mode)":
// 1. Mỗi máy chỉ mở DUY NHẤT 1 TAB tại 1 thời điểm, tự động đóng tab sau khi bóc xong giá hoặc gặp timeout/captcha.
// 2. Cooldown nghỉ 1.5s giữa các lần bóc để Shopee không bao giờ bắn Captcha.
// 3. Tần suất hỏi việc cực nhạy (600ms) giúp mở tab gần như tức thì khi người dùng dán link.

const DEFAULT_BACKEND_URL = "https://api-dealping-be-flashsale.onrender.com";
const workerTabs = new Map(); // tabId -> { itemId, timeoutId }
let isProcessingJob = false;
let cooldownTimer = null;

function releaseJobWithCooldown() {
  if (cooldownTimer) clearTimeout(cooldownTimer);
  cooldownTimer = setTimeout(() => {
    isProcessingJob = false;
    cooldownTimer = null;
  }, 1500); // Nghỉ 1.5s cooldown trước khi nhận task tiếp theo
}

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

// Cầu chì chống kẹt khi gặp Captcha / Verify / Login Redirect
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (workerTabs.has(tabId)) {
    const currentUrl = (changeInfo.url || (tab && tab.url) || "").toLowerCase();
    if (
      currentUrl.includes("/verify") ||
      currentUrl.includes("/captcha") ||
      currentUrl.includes("/buyer/login")
    ) {
      console.warn("[DealPing Worker] Phát hiện Captcha/Login redirect, đóng tab ngay:", currentUrl);
      const jobInfo = workerTabs.get(tabId);
      if (jobInfo && jobInfo.timeoutId) {
        clearTimeout(jobInfo.timeoutId);
      }
      workerTabs.delete(tabId);
      releaseJobWithCooldown();
      try {
        chrome.tabs.remove(tabId);
      } catch (e) {}
    }
  }
});

// Nếu tab bị tắt thủ công bởi người dùng
chrome.tabs.onRemoved.addListener((tabId) => {
  if (workerTabs.has(tabId)) {
    const jobInfo = workerTabs.get(tabId);
    if (jobInfo && jobInfo.timeoutId) {
      clearTimeout(jobInfo.timeoutId);
    }
    workerTabs.delete(tabId);
    releaseJobWithCooldown();
  }
});

// Lắng nghe dữ liệu DOM từ content.js gửi về ngay khi trang Shopee/TikTok vừa bóc xong giá
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "DEALPING_DOM_SCRAPED" && message.data) {
    const scrapedData = message.data;
    const tabId = sender && sender.tab ? sender.tab.id : null;

    getWorkerConfig().then(async (config) => {
      // 1. Gửi dữ liệu giá thực tế (Giá Sau Voucher) về Backend Render
      await submitPriceToBackend(config.backendUrl, scrapedData);

      // 2. Lưu vào storage để Popup hiển thị trực tiếp
      chrome.storage.local.set({
        lastCapturedDealPingProduct: {
          productName: scrapedData.productName || "Sản phẩm sàn TMĐT",
          detectedPrice: scrapedData.detectedPrice,
          originalStrikePrice: scrapedData.originalStrikePrice,
          isVoucherPrice: scrapedData.isVoucherPrice,
          tier1: Math.round(Number(scrapedData.detectedPrice) * 0.9),
          tier2: Math.round(Number(scrapedData.detectedPrice) * 0.72),
          url: scrapedData.url,
          imageUrl: scrapedData.imageUrl,
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
        releaseJobWithCooldown();

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
      }, 4500);

      workerTabs.set(tabId, {
        itemId: sampleId,
        timeoutId
      });
    });

    sendResponse({ ok: true, started: true });
    return true;
  }
});

// Vòng lặp hỏi Backend mỗi 600ms khi rảnh (Auto Worker)
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

    // Mở tab Shopee/TikTok ở chế độ chạy ngầm (active: false)
    chrome.tabs.create({ url: task.url, active: false }, (tab) => {
      if (!tab || !tab.id) {
        releaseJobWithCooldown();
        return;
      }

      const tabId = tab.id;
      // Timeout 4500ms: Tự động đóng tab sau 4.5s để giải phóng RAM nhanh và nhường cho Backend fallback
      const timeoutId = setTimeout(() => {
        if (workerTabs.has(tabId)) {
          workerTabs.delete(tabId);
          releaseJobWithCooldown();
          try {
            chrome.tabs.remove(tabId);
          } catch (e) {}
        }
      }, 4500);

      workerTabs.set(tabId, {
        itemId: task.itemId || null,
        timeoutId
      });
    });
  } catch (err) {
    releaseJobWithCooldown();
  }
}

// Hạ nhịp hỏi việc từ 2500ms xuống 600ms
setInterval(pollPendingTasks, 600);
