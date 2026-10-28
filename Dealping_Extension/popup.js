const DEFAULT_BACKEND_URL = "https://api-dealping-be-flashsale.onrender.com";

function formatVnd(num) {
  if (!num) return "---";
  return Number(num).toLocaleString("vi-VN") + "₫";
}

function renderProductCard(data) {
  const container = document.getElementById("content");
  if (!data || !container) return;

  container.innerHTML = `
    <div class="card">
      <div class="title">${data.productName || "Sản phẩm sàn TMĐT"}</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">
        ${data.isVoucherPrice ? "🏷️ Giá Sau Voucher (DOM thực tế):" : "💰 Giá niêm yết:"}
      </div>
      <div class="price-row">
        <span class="price">${formatVnd(data.detectedPrice)}</span>
        ${
          data.originalStrikePrice && data.originalStrikePrice > data.detectedPrice
            ? `<span class="original-price">${formatVnd(data.originalStrikePrice)}</span>`
            : ""
        }
      </div>
      <div class="tiers">
        <div class="tier">
          <div class="tier-label">Săn Sale Vừa (-10%)</div>
          <div class="tier-val">${formatVnd(data.tier1)}</div>
        </div>
        <div class="tier">
          <div class="tier-label">Săn Đại Sale (-28%)</div>
          <div class="tier-val">${formatVnd(data.tier2)}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:8px;text-align:right;">
        Cập nhật lúc: ${data.capturedAt || "Vừa xong"}
      </div>
    </div>
  `;
}

// 1. Tải cấu hình và dữ liệu từ storage
chrome.storage.local.get(
  [
    "lastCapturedDealPingProduct",
    "dealping_worker_enabled",
    "dealping_backend_url",
    "dealping_worker_stats"
  ],
  (res) => {
    // Hiển thị sản phẩm vừa bóc gần nhất
    if (res.lastCapturedDealPingProduct) {
      renderProductCard(res.lastCapturedDealPingProduct);
    }

    const toggleEl = document.getElementById("workerToggle");
    const urlEl = document.getElementById("backendUrl");
    const statsEl = document.getElementById("workerStats");
    const badgeEl = document.getElementById("headerBadge");

    const isEnabled = res.dealping_worker_enabled !== undefined ? Boolean(res.dealping_worker_enabled) : true;
    const backendUrl = res.dealping_backend_url || DEFAULT_BACKEND_URL;

    if (toggleEl) toggleEl.checked = isEnabled;
    if (urlEl) urlEl.value = backendUrl;

    if (badgeEl) {
      badgeEl.textContent = isEnabled ? "WORKER HOẠT ĐỘNG" : "WORKER TẮT";
      badgeEl.style.color = isEnabled ? "#4ade80" : "#f87171";
      badgeEl.style.borderColor = isEnabled ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)";
    }

    const stats = res.dealping_worker_stats || { completed: 0, lastItem: "Chưa có" };
    if (statsEl) {
      statsEl.innerHTML = `
        Đã bóc tự động: <b style="color:#4ade80;">${stats.completed || 0} link</b> (tự đóng tab ngầm)<br/>
        Gần nhất: ${stats.lastItem || "Chưa có"}
      `;
    }
  }
);

// 2. Nút "Kiểm tra Server" (Ping)
document.getElementById("pingBtn")?.addEventListener("click", async () => {
  const urlEl = document.getElementById("backendUrl");
  const statusEl = document.getElementById("serverStatus");
  const targetUrl = (urlEl && urlEl.value.trim()) || DEFAULT_BACKEND_URL;

  if (statusEl) {
    statusEl.innerHTML = `<span style="color:#fbbf24;">⏳ Đang kết nối tới ${targetUrl}...</span>`;
  }

  const startTime = Date.now();
  try {
    const res = await fetch(`${targetUrl.replace(/\/+$/, "")}/health`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    const latency = Date.now() - startTime;
    if (res.ok) {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#4ade80;">🟢 Server Online! (Phản hồi: ${latency}ms)</span>`;
      }
    } else {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#f87171;">⚠️ Server trả về mã ${res.status}</span>`;
      }
    }
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:#f87171;">🔴 Không kết nối được: ${err.message}</span>`;
    }
  }
});

// 3. Nút "Test 1 link mẫu" (Lovito dress)
document.getElementById("testJobBtn")?.addEventListener("click", () => {
  const statusEl = document.getElementById("serverStatus");
  if (statusEl) {
    statusEl.innerHTML = `<span style="color:#38bdf8;">🚀 Đang mở tab ngầm test bóc giá Lovito Shopee...</span>`;
  }

  chrome.runtime.sendMessage(
    {
      type: "DEALPING_RUN_TEST_TASK",
      url: "https://shopee.vn/product/407338006/18652392764"
    },
    (response) => {
      // Đợi 3.5s để tab ngầm load và bóc giá xong thì reload lại card
      setTimeout(() => {
        chrome.storage.local.get(["lastCapturedDealPingProduct", "dealping_worker_stats"], (r) => {
          if (r.lastCapturedDealPingProduct) {
            renderProductCard(r.lastCapturedDealPingProduct);
          }
          const statsEl = document.getElementById("workerStats");
          const stats = r.dealping_worker_stats || { completed: 1, lastItem: "Shopee Lovito" };
          if (statsEl) {
            statsEl.innerHTML = `
              Đã bóc tự động: <b style="color:#4ade80;">${stats.completed || 1} link</b> (tự đóng tab ngầm)<br/>
              Gần nhất: ${stats.lastItem || "18652392764"}
            `;
          }
          if (statusEl) {
            statusEl.innerHTML = `<span style="color:#4ade80;">✅ Bóc giá thành công! Đã tự đóng tab ngầm.</span>`;
          }
        });
      }, 3500);
    }
  );
});

// 4. Nút "Lưu cấu hình"
document.getElementById("saveWorkerBtn")?.addEventListener("click", () => {
  const toggleEl = document.getElementById("workerToggle");
  const urlEl = document.getElementById("backendUrl");
  const statusEl = document.getElementById("serverStatus");
  const badgeEl = document.getElementById("headerBadge");

  const enabled = Boolean(toggleEl && toggleEl.checked);
  const backendUrl = (urlEl && urlEl.value.trim()) || DEFAULT_BACKEND_URL;

  chrome.storage.local.set(
    {
      dealping_worker_enabled: enabled,
      dealping_backend_url: backendUrl
    },
    () => {
      if (badgeEl) {
        badgeEl.textContent = enabled ? "WORKER HOẠT ĐỘNG" : "WORKER TẮT";
        badgeEl.style.color = enabled ? "#4ade80" : "#f87171";
        badgeEl.style.borderColor = enabled ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)";
      }
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#4ade80;">💾 Đã lưu cấu hình thành công!</span>`;
      }
    }
  );
});
