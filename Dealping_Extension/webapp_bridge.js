(function () {
  function syncCacheToPage() {
    try {
      chrome.storage.local.get(["dealping_price_cache"], (res) => {
        const cache = res.dealping_price_cache || {};
        window.dispatchEvent(
          new CustomEvent("dealping-cache-sync", {
            detail: JSON.stringify(cache)
          })
        );
      });
    } catch (e) {}
  }

  // Đồng bộ ngay khi mở Web App và mỗi khi có tab Shopee mới được quét
  syncCacheToPage();
  setInterval(syncCacheToPage, 1500);

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.dealping_price_cache) {
        syncCacheToPage();
      }
    });
  } catch (e) {}
})();
