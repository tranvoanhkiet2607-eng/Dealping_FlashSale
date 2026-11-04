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
   * - Kịch bản A: Sản phẩm đang Flash Sale / có Voucher giảm sâu (voucherPrice > 0 hoặc originalPrice > currentPrice * 1.12)
   *   Hạ tỷ lệ canh thêm: Nấc 1 (-5% canh thêm mã phụ/hoàn xu) và Nấc 2 (-10% canh đỉnh Flash Sale 0h).
   * - Kịch bản B: Sản phẩm không có voucherPrice (giá niêm yết trơn)
   *   Giữ nguyên: Nấc 1 (-10% Săn Sale ngắn hạn) và Nấc 2 (-25% Săn Đại Sale ngày đôi).
   */
  public calculateTiers(
    originalPrice: number,
    currentPrice: number,
    voucherPrice?: number | null
  ): PriceTiers {
    const validOrig = originalPrice > 0 ? originalPrice : currentPrice
    const validCurrent = currentPrice > 0 ? currentPrice : validOrig

    // Tính độ giảm hiện tại
    const alreadyDiscountedPct =
      validOrig > validCurrent
        ? Math.round(((validOrig - validCurrent) / validOrig) * 100)
        : 0

    // Quy tắc bắt buộc: Hễ sản phẩm đã có voucherPrice > 0 (tức đã là Giá Sau Voucher của sàn)
    // HOẶC originalPrice > currentPrice * 1.12 (đã giảm sâu > 12%)
    // Tuyệt đối KHÔNG BAO GIỜ trừ -28% nữa!
    const isDeepDiscount = Boolean(
      (voucherPrice && voucherPrice > 0) ||
      (validOrig > validCurrent * 1.12) ||
      alreadyDiscountedPct >= 12
    )

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
      // Kịch bản A — ĐÃ CÓ VOUCHER / FLASH SALE TRỢ GIÁ SÂU:
      // Nấc 1 (Canh thêm mã phụ / hoàn xu: -5% từ voucherPrice/validCurrent) — VD: 695.304đ -> 660.000đ
      nac1_discount_pct = 5
      drop1 = Math.max(1000, Math.round((validCurrent * 0.05) / 1000) * 1000)
      nac1_price = Math.max(0, validCurrent - drop1)
      nac1_label = `Mức 1: Canh thêm mã phụ / hoàn xu giảm thêm ${this.formatVND(drop1)} (-5%)`

      // Nấc 2 (Canh đỉnh Flash Sale 0h: -10% từ voucherPrice/validCurrent) — VD: 695.304đ -> 625.000đ
      nac2_discount_pct = 10
      drop2 = Math.max(2000, Math.round((validCurrent * 0.10) / 1000) * 1000)
      nac2_price = Math.max(0, validCurrent - drop2)
      nac2_label = `Mức 2: Canh đỉnh Flash Sale 0h giảm thêm ${this.formatVND(drop2)} (-10%)`

      scenarioAdvice = "✅ Đang có Flash Sale / Voucher trợ giá tốt — Có thể MUA NGAY hoặc canh giảm nhẹ thêm!"
    } else {
      // Kịch bản B — KHÔNG có voucherPrice (giá niêm yết trơn, chưa có sale sâu):
      // Dùng mức: Nấc 1 (-10% Săn Sale ngắn hạn) và Nấc 2 (-25% Săn Đại Sale ngày đôi)
      nac1_discount_pct = 10
      drop1 = Math.max(1000, Math.round((validCurrent * 0.10) / 1000) * 1000)
      nac1_price = Math.max(0, validCurrent - drop1)
      nac1_label = `Mức 1: Săn Sale ngắn hạn giảm thêm ${this.formatVND(drop1)} (-10%)`

      nac2_discount_pct = 25
      drop2 = Math.max(2000, Math.round((validCurrent * 0.25) / 1000) * 1000)
      nac2_price = Math.max(0, validCurrent - drop2)
      nac2_label = `Mức 2: Săn Đại Sale ngày đôi giảm thêm ${this.formatVND(drop2)} (-25%)`

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
  public calculateDefaultTarget(
    rawPrice: number,
    origPrice: number,
    voucherPrice?: number | null
  ): number {
    const tiers = this.calculateTiers(origPrice, rawPrice, voucherPrice)
    return tiers.nac2_price
  }
}

export const pricingService = new PricingService()
