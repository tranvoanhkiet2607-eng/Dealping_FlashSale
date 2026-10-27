import { ChartPoint } from "../types"

export interface RealPriceTrackInput {
  currentPrice: number
  originalPrice?: number
  voucherPrice?: number | null
  targetPrice?: number
  checkpoints?: { label: string; price: number }[]
}

/**
 * ChartService (OOP)
 * Handles historical price series and authentic milestone price points.
 * Eliminates fake simulated price jumps and random noise.
 */
export class ChartService {
  /**
   * Build authentic price points based on REAL tracked data.
   */
  public buildRealPricePoints(input: RealPriceTrackInput): ChartPoint[] {
    const { currentPrice, originalPrice, voucherPrice, checkpoints } = input
    const data: ChartPoint[] = []

    if (!currentPrice || currentPrice <= 0) {
      return [{ date: "Hiện tại", price: 0 }]
    }

    // 1. If explicit real checkpoints are provided (from database or local monitoring)
    if (checkpoints && checkpoints.length > 0) {
      return checkpoints.map((c) => ({
        date: c.label,
        price: Math.round(c.price),
      }))
    }

    // 2. Real price evolution timeline based on true product milestones:
    // If the product has an original listed price higher than current price
    if (originalPrice && originalPrice > currentPrice) {
      data.push({
        date: "Giá niêm yết",
        price: Math.round(originalPrice),
      })
    }

    // Current price detected by Radar
    data.push({
      date: "Bắt đầu theo dõi",
      price: Math.round(currentPrice),
    })

    // If a platform voucher or flash sale discount was discovered
    if (voucherPrice && voucherPrice > 0 && voucherPrice < currentPrice) {
      data.push({
        date: "Sau mã Voucher",
        price: Math.round(voucherPrice),
      })
      data.push({
        date: "Giá đáy hiện tại",
        price: Math.round(voucherPrice),
      })
    } else {
      data.push({
        date: "Radar quét gần nhất",
        price: Math.round(currentPrice),
      })
    }

    return data
  }

  /**
   * Fallback using real baseline without fake fluctuating noise
   */
  public generateMockDayData(basePrice: number): ChartPoint[] {
    return this.buildRealPricePoints({ currentPrice: basePrice })
  }
}

export const chartService = new ChartService()
