(function () {
  const oldWidget = document.getElementById("dealping-live-widget");
  if (oldWidget) oldWidget.remove();

  function parseVndPrice(rawText) {
    if (!rawText) return null;
    const match = rawText.toString().match(/(\d{1,3}(?:\.\d{3})+)/);
    if (!match) {
      const digitsOnly = rawText.toString().replace(/[^\d]/g, "");
      if (digitsOnly) {
        const val = parseInt(digitsOnly, 10);
        return val >= 1000 && val <= 500000000 ? val : null;
      }
      return null;
    }
    const numeric = parseInt(match[1].replace(/\./g, ""), 10);
    return numeric >= 1000 && numeric <= 500000000 ? numeric : null;
  }

  function formatVnd(num) {
    if (!num) return "---";
    return Number(num).toLocaleString("vi-VN") + "₫";
  }

  // Bóc dữ liệu trực tiếp trên trang TikTok Shop (shop.tiktok.com)
  function extractTikTokProductData() {
    const url = window.location.href;
    const idMatch =
      url.match(/(?:pdp|product)\/(?:[^/?#]+\/)?(\d{15,25})/) ||
      url.match(/product_id=(\d{15,25})/) ||
      url.match(/\/(\d{15,25})(?:[/?#]|$)/);
    if (!idMatch) return null;

    const itemId = idMatch[1];
    let detectedPrice = null;
    let originalStrikePrice = null;
    let productName = null;
    let imageUrl = null;

    // 1. Đọc từ __MODERN_ROUTER_DATA__ có sẵn trong DOM TikTok Shop
    const routerEl = document.getElementById("__MODERN_ROUTER_DATA__");
    if (routerEl && routerEl.textContent) {
      try {
        const routerJson = JSON.parse(routerEl.textContent);
        const walk = (obj) => {
          if (!obj || typeof obj !== "object") return;
          if (obj.product_info && obj.product_info.product_id) {
            const pInfo = obj.product_info;
            if (pInfo.title && !productName) productName = pInfo.title;
            if (
              pInfo.images &&
              pInfo.images[0] &&
              pInfo.images[0].url_list &&
              pInfo.images[0].url_list[0] &&
              !imageUrl
            ) {
              imageUrl = pInfo.images[0].url_list[0];
            }
            if (pInfo.price) {
              const p =
                parseVndPrice(pInfo.price.real_price) ||
                parseVndPrice(pInfo.price.min_sku_price);
              if (p && !detectedPrice) detectedPrice = p;
              const orig = parseVndPrice(pInfo.price.original_price);
              if (orig && !originalStrikePrice) originalStrikePrice = orig;
            }
          }
          if (!detectedPrice && obj.sale_price_decimal) {
            const p = parseInt(obj.sale_price_decimal, 10);
            if (p >= 1000) detectedPrice = p;
          }
          for (const k in obj) {
            if (typeof obj[k] === "object") walk(obj[k]);
          }
        };
        walk(routerJson);
      } catch (e) {}
    }

    // 2. Dự phòng đọc trực tiếp từ chữ giá to trên giao diện TikTok Shop
    if (!detectedPrice) {
      const spans = Array.from(document.querySelectorAll("span, div"));
      let bestFontSize = 0;
      for (const el of spans) {
        if (el.childElementCount === 0) {
          const txt = (el.textContent || "").trim();
          if (/^\d{1,3}(?:\.\d{3})+$/.test(txt) || /^\d{1,3}(?:\.\d{3})+\s*₫$/.test(txt)) {
            const style = window.getComputedStyle(el);
            const fontSize = parseFloat(style.fontSize) || 0;
            if (fontSize >= 24 && fontSize > bestFontSize) {
              const p = parseVndPrice(txt);
              if (p) {
                bestFontSize = fontSize;
                detectedPrice = p;
              }
            }
          }
        }
      }
    }

    if (!productName) {
      const h1 = document.querySelector("h1");
      productName = h1
        ? h1.textContent.trim()
        : document.title.replace(/\s*-\s*TikTok Shop.*$/i, "").trim();
    }

    if (!detectedPrice) return null;

    const tier1 = Math.round((detectedPrice * 0.9) / 1000) * 1000;
    const tier2 = Math.round((detectedPrice * 0.72) / 1000) * 1000;

    return {
      platform: "TIKTOK",
      shopId: "tiktok",
      itemId,
      url: url.split("?")[0],
      productName,
      imageUrl,
      detectedPrice,
      isVoucherPrice: true,
      originalStrikePrice: originalStrikePrice || detectedPrice,
      shopVouchers: [],
      tier1,
      tier2,
      capturedAt: new Date().toLocaleTimeString("vi-VN"),
      timestamp: Date.now()
    };
  }

  function extractShopeeProductData() {
    const url = window.location.href;
    if (url.includes("tiktok.com")) {
      return extractTikTokProductData();
    }

    const idMatch =
      url.match(/-i\.(\d+)\.(\d+)/) || url.match(/\/product\/(\d+)\/(\d+)/);
    if (!idMatch) return null;

    const shopId = idMatch[1];
    const itemId = idMatch[2];

    let detectedPrice = null;
    let isVoucherPrice = false;
    let originalStrikePrice = null;
    let shopVouchers = [];

    // Lấy ảnh sản phẩm từ meta tag og:image
    const ogImg = document.querySelector('meta[property="og:image"]');
    const imageUrl = ogImg ? ogImg.getAttribute("content") : null;

    const allElements = Array.from(document.querySelectorAll("div, span, section"));

    // 1. Tìm nhãn "Giá Sau Voucher"
    for (const el of allElements) {
      if (
        el.childElementCount === 0 &&
        el.textContent &&
        el.textContent.trim().toLowerCase().includes("giá sau voucher")
      ) {
        let parent = el.parentElement;
        for (let depth = 0; depth < 4 && parent; depth++) {
          const text = parent.innerText || "";
          const priceMatches = text.match(/\d{1,3}(?:\.\d{3})+\s*₫|₫\s*\d{1,3}(?:\.\d{3})+/g);
          if (priceMatches && priceMatches.length > 0) {
            const firstPrice = parseVndPrice(priceMatches[0]);
            if (firstPrice) {
              detectedPrice = firstPrice;
              isVoucherPrice = true;
              break;
            }
          }
          parent = parent.parentElement;
        }
        if (detectedPrice) break;
      }
    }

    // 2. Nếu không có "Giá Sau Voucher", tìm chữ giá to nhất (font >= 22px)
    if (!detectedPrice) {
      let bestFontSize = 0;
      for (const el of allElements) {
        if (el.childElementCount <= 2) {
          const txt = (el.textContent || "").trim();
          if (/^(\d{1,3}(?:\.\d{3})+\s*₫|₫\s*\d{1,3}(?:\.\d{3})+)$/.test(txt)) {
            const rect = el.getBoundingClientRect();
            if (rect.top > 80 && rect.top < 750 && rect.width > 0) {
              const style = window.getComputedStyle(el);
              const fontSize = parseFloat(style.fontSize) || 0;
              if (fontSize >= 22 && fontSize > bestFontSize) {
                const p = parseVndPrice(txt);
                if (p) {
                  bestFontSize = fontSize;
                  detectedPrice = p;
                }
              }
            }
          }
        }
      }
    }

    // Tìm giá gạch ngang kế bên nếu chưa có để biết Giá Gốc ban đầu là bao nhiêu
    if (!originalStrikePrice) {
      for (const el of allElements) {
        if (el.childElementCount <= 1) {
          const style = window.getComputedStyle(el);
          if (
            (style.textDecorationLine &&
              style.textDecorationLine.includes("line-through")) ||
            (style.textDecoration &&
              style.textDecoration.includes("line-through"))
          ) {
            const p = parseVndPrice(el.textContent);
            if (p && (!detectedPrice || p > detectedPrice)) {
              originalStrikePrice = p;
              break;
            }
          }
        }
      }
    }

    // 3. Quét các thẻ "Mã Giảm Giá Của Shop"
    for (const el of allElements) {
      if (
        el.childElementCount === 0 &&
        el.textContent &&
        el.textContent.trim().toLowerCase().includes("mã giảm giá của shop")
      ) {
        const row = el.parentElement ? el.parentElement.parentElement || el.parentElement : null;
        if (row) {
          const badges = Array.from(row.querySelectorAll("div, span"))
            .map((b) => (b.textContent || "").trim())
            .filter((t) => /^(Giảm\s+\d+%?|Giảm\s+\d+k₫?)$/i.test(t));
          shopVouchers = [...new Set(badges)];
        }
        break;
      }
    }

    const h1 = document.querySelector("h1");
    const productName = h1
      ? h1.textContent.trim()
      : document.title.replace(/\s*\|\s*Shopee.*$/i, "").trim();

    if (!detectedPrice) return null;

    const tier1 = Math.round((detectedPrice * 0.9) / 1000) * 1000;
    const tier2 = Math.round((detectedPrice * 0.72) / 1000) * 1000;

    return {
      platform: "SHOPEE",
      shopId,
      itemId,
      url: url.split("?")[0],
      productName,
      imageUrl,
      detectedPrice,
      isVoucherPrice,
      originalStrikePrice: originalStrikePrice || detectedPrice,
      shopVouchers,
      tier1,
      tier2,
      capturedAt: new Date().toLocaleTimeString("vi-VN"),
      timestamp: Date.now()
    };
  }

  function showMiniToast(data) {
    let pill = document.getElementById("dealping-mini-pill");
    if (!pill) {
      pill = document.createElement("div");
      pill.id = "dealping-mini-pill";
      document.body.appendChild(pill);
    }
    pill.style.cssText = `
      position: fixed;
      top: 76px;
      right: 20px;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(56, 189, 248, 0.5);
      border-radius: 999px;
      padding: 6px 14px;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.35);
      z-index: 2147483647;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.4s ease;
    `;
    pill.innerHTML = `
      <span style="width:8px;height:8px;border-radius:50%;background:#4ade80;display:inline-block;"></span>
      <span>DealPing đã bắt giá <b style="color:#4ade80;">${formatVnd(data.detectedPrice)}</b> — Copy link dán vào Web App ngay!</span>
    `;
    setTimeout(() => {
      if (pill) pill.style.opacity = "0";
    }, 3500);
  }

  let scanAttempts = 0;
  let lastPrice = null;
  let lastItemId = null;
  let scanInterval = null;

  // Tự động chọn phân loại đầu tiên còn hàng khi mở trang để tránh bẫy giá mồi
  function autoSelectFirstVariation() {
    try {
      const variationButtons = Array.from(
        document.querySelectorAll(
          'button.product-variation, button[class*="product-variation"], button[class*="variation"]'
        )
      );

      if (variationButtons.length === 0) return false;

      // Kiểm tra xem đã có nút nào đang được chọn chưa (class selected / dấu tích / aria-selected)
      const isSelected = (btn) => {
        const cls = btn.className || "";
        const ariaSel = btn.getAttribute("aria-selected");
        const ariaCheck = btn.getAttribute("aria-checked");
        const hasTick = btn.querySelector('[class*="tick"], svg, [class*="check"]');
        return (
          cls.includes("selected") ||
          ariaSel === "true" ||
          ariaCheck === "true" ||
          Boolean(hasTick)
        );
      };

      const hasAnySelected = variationButtons.some(isSelected);
      if (hasAnySelected) return false;

      const isAvailable = (btn) => {
        const cls = btn.className || "";
        const ariaDisabled = btn.getAttribute("aria-disabled");
        return !btn.disabled && !cls.includes("disabled") && ariaDisabled !== "true";
      };

      // Thử tìm theo từng nhóm phân loại (màu sắc / phiên bản...)
      const parentGroups = new Set(
        variationButtons.map((btn) => btn.parentElement).filter(Boolean)
      );
      let clickedAny = false;

      if (parentGroups.size > 1) {
        parentGroups.forEach((group) => {
          const groupButtons = Array.from(
            group.querySelectorAll(
              'button.product-variation, button[class*="product-variation"], button[class*="variation"]'
            )
          );
          const groupSelected = groupButtons.some(isSelected);
          if (!groupSelected) {
            const firstInGroup = groupButtons.find(isAvailable);
            if (firstInGroup) {
              firstInGroup.click();
              clickedAny = true;
            }
          }
        });
      }

      if (!clickedAny) {
        const firstAvailable = variationButtons.find(isAvailable);
        if (firstAvailable) {
          firstAvailable.click();
          clickedAny = true;
        }
      }

      if (clickedAny) {
        console.log(
          "[DealPing] Đã tự động click chọn phân loại đầu tiên còn hàng để chống giá mồi!"
        );
      }
      return clickedAny;
    } catch (e) {
      return false;
    }
  }

  function scanAndCache(isManualClick = false) {
    scanAttempts++;
    const data = extractShopeeProductData();
    if (!data) return;

    // Trong 4 lần quét đầu tiên (tức ~2.4s đầu) trừ khi người dùng click tay:
    // CHỈ gửi kết quả về background.js nếu tìm thấy nhãn "Giá sau voucher" (data.isVoucherPrice === true).
    // Hễ thấy isVoucherPrice === true là bắn về và đóng tab ngay lập tức!
    if (!isManualClick && scanAttempts <= 4 && !data.isVoucherPrice) {
      return;
    }

    // Từ lần 5 trở đi (sau 2.5s, trang đã load 100%) mà món hàng không có nhãn "Giá sau voucher",
    // HOẶC nếu đã bắt được isVoucherPrice === true ở các lần quét / click tay:
    if (data.detectedPrice !== lastPrice || data.itemId !== lastItemId) {
      lastPrice = data.detectedPrice;
      lastItemId = data.itemId;

      try {
        chrome.storage.local.get(["dealping_price_cache"], (res) => {
          const cache = res.dealping_price_cache || {};
          cache[data.itemId] = data;
          chrome.storage.local.set({
            dealping_price_cache: cache,
            lastCapturedDealPingProduct: data
          });
        });
        chrome.runtime.sendMessage({
          type: "DEALPING_DOM_SCRAPED",
          data: data
        });
      } catch (e) {}

      showMiniToast(data);

      if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
      }
    }
  }

  // 1. Tự động click chọn Phân loại đầu tiên còn hàng ở 400ms (và retry ở 750ms) để chống bẫy giá mồi
  setTimeout(() => {
    autoSelectFirstVariation();
  }, 400);
  setTimeout(() => {
    autoSelectFirstVariation();
  }, 750);

  // 2. Cuộn nhẹ sau 500ms để kích hoạt Shopee render khung Voucher và giả lập người dùng thật
  setTimeout(() => {
    try {
      window.scrollBy({ top: 100, behavior: "smooth" });
    } catch (e) {}
  }, 500);

  // 3. Nhịp quét: lần đầu ở 900ms (đã đợi Shopee nhảy giá phân loại), sau đó mỗi 500ms lặp lại
  setTimeout(() => scanAndCache(false), 900);
  scanInterval = setInterval(() => scanAndCache(false), 500);

  // 4. Lắng nghe sự kiện click để khi người dùng đổi phân loại (màu/bản/size),
  // Extension lập tức quét lại giá mới và cập nhật Backend + Storage
  document.addEventListener("click", () => {
    setTimeout(() => scanAndCache(true), 350);
    setTimeout(() => scanAndCache(true), 800);
  });
})();
