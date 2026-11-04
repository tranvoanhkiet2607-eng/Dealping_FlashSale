/**
 * PricingService (OOP)
 * Encapsulates pricing logic, currency formatting, and dynamic flash sale formulas.
 */
export interface PriceTiers {
  nac1_price: number
  nac2_price: number
  nac1_label: string
  nac2_label: string
  nac1_discount_pct: number
  nac2_discount_pct: number
  drop1: number
  drop2: number
  isDeepDiscount: boolean
  alreadyDiscountedPct: number
  scenarioAdvice: string
}

export class PricingService {
  /**
   * Formats a raw number or string into Vietnamese Dong (VND), e.g. "120.000 đ"
   */
  public formatVND(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return ""
    const digits = val.toString().replace(/\D/g, "")
    return digits !== ""
      ? new Intl.NumberFormat("vi-VN").format(Number(digits)) + " đ"
      : ""
  }

  /**
   * Formats a raw number or string into thousand-separated digits for input fields, e.g. "120.000"
   */
  public formatInputNumber(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return ""
    const digits = val.toString().replace(/\D/g, "")
    if (!digits) return ""
    return new Intl.NumberFormat("vi-VN").format(Number(digits))
  }

  /**
   * Parses formatted VND string or numeric input into raw integer value
   */
  public parseVND(val: string | number | null | undefined): number {
    if (typeof val === "number") return val
    if (!val) return 0
    return Number(val.replace(/\D/g, "")) || 0
  }

  /**
   * Universal dynamic tier calculator:
   * 2 Kịch bản thông minh (khớp 100% Slide 3 Canva):
   * - Kịch bản A: Sản phẩm đang Flash Sale / có Voucher giảm sâu (alreadyDiscountedPct >= 15%)
   *   Hạ tỷ lệ canh thêm: Nấc 1 (-6%) và Nấc 2 (-12%) sát giá thị trường.
   * - Kịch bản B: Sản phẩm đang neo giá cao (alreadyDiscountedPct < 15%)
   *   Giữ nguyên: Nấc 1 (-10% Săn Sale ngắn hạn) và Nấc 2 (-28% Săn Đại Sale ngày đôi).
   */
  public calculateTiers(originalPrice: number, currentPrice: number): PriceTiers {
    const validOrig = originalPrice > 0 ? originalPrice : currentPrice
    const validCurrent = currentPrice > 0 ? currentPrice : validOrig

    // Tính độ giảm hiện tại
    const alreadyDiscountedPct =
      validOrig > validCurrent
        ? Math.round(((validOrig - validCurrent) / validOrig) * 100)
        : 0

    const isDeepDiscount = alreadyDiscountedPct >= 15

    let drop1 = 0
    let drop2 = 0
    let nac1_price = 0
    let nac2_price = 0
    let nac1_label = ""
    let nac2_label = ""
    let nac1_discount_pct = 0
    let nac2_discount_pct = 0
    let scenarioAdvice = ""

    if (isDeepDiscount) {
      // Kịch bản A — Nếu sản phẩm ĐANG FLASH SALE / ĐÃ CÓ VOUCHER GIẢM SÂU (alreadyDiscountedPct >= 15)
      // Không được trừ chồng -28% nữa! Hạ tỷ lệ canh thêm xuống mức hợp lý sát giá thị trường:
      // Nấc 1 (Canh áp thêm mã phụ / xu: giảm thêm -6% từ validCurrent): drop1 = Math.max(1000, Math.round((validCurrent * 0.06) / 1000) * 1000)
      nac1_discount_pct = 6
      drop1 = Math.max(1000, Math.round((validCurrent * 0.06) / 1000) * 1000)
      nac1_price = Math.max(0, validCurrent - drop1)
      nac1_label = `Mức 1: Canh áp thêm mã phụ / xu giảm thêm ${this.formatVND(drop1)} (-6%)`

      // Nấc 2 (Canh đỉnh Flash Sale kế tiếp: giảm thêm -12% từ validCurrent): drop2 = Math.max(2000, Math.round((validCurrent * 0.12) / 1000) * 1000)
      nac2_discount_pct = 12
      drop2 = Math.max(2000, Math.round((validCurrent * 0.12) / 1000) * 1000)
      nac2_price = Math.max(0, validCurrent - drop2)
      nac2_label = `Mức 2: Canh đỉnh Flash Sale kế tiếp giảm thêm ${this.formatVND(drop2)} (-12%)`

      scenarioAdvice = "✅ Đang có Flash Sale / Voucher trợ giá tốt — Có thể MUA NGAY hoặc canh giảm nhẹ thêm!"
    } else {
      // Kịch bản B — Nếu sản phẩm ĐANG NEO GIÁ CAO (alreadyDiscountedPct < 15, chưa có sale sâu):
      // Giữ nguyên 2 mức: Nấc 1 (-10% Săn Sale ngắn hạn) và Nấc 2 (-28% Săn Đại Sale ngày đôi)
      nac1_discount_pct = 10
      drop1 = Math.max(1000, Math.round((validCurrent * 0.10) / 1000) * 1000)
      nac1_price = Math.max(0, validCurrent - drop1)
      nac1_label = `Mức 1: Săn Sale ngắn hạn giảm thêm ${this.formatVND(drop1)} (-10%)`

      nac2_discount_pct = 28
      drop2 = Math.max(2000, Math.round((validCurrent * 0.28) / 1000) * 1000)
      nac2_price = Math.max(0, validCurrent - drop2)
      nac2_label = `Mức 2: Săn Đại Sale ngày đôi giảm thêm ${this.formatVND(drop2)} (-28%)`

      scenarioAdvice = "⚠️ Giá đang neo ở mức niêm yết — Khuyên bật Radar chờ đợt Sale!"
    }

    return {
      nac1_price,
      nac2_price,
      nac1_label,
      nac2_label,
      nac1_discount_pct,
      nac2_discount_pct,
      drop1,
      drop2,
      isDeepDiscount,
      alreadyDiscountedPct,
      scenarioAdvice,
    }
  }

  /**
   * Calculates default auto-target price when preview is fetched
   */
  public calculateDefaultTarget(rawPrice: number, origPrice: number): number {
    const tiers = this.calculateTiers(origPrice, rawPrice)
    return tiers.nac2_price
  }
}

export const pricingService = new PricingService()
