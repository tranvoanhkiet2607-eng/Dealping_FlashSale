import { useState, useEffect, useCallback } from "react"
import { ChartItem, View, SlotItemState } from "../types"
import {
  trackingApiService,
  chartService,
  pricingService,
  urlParserService,
} from "../services"

interface UsePriceChartProps {
  view: View
  slot1: SlotItemState
  slot2: SlotItemState
  slot3: SlotItemState
}

export function usePriceChart({
  view,
  slot1,
  slot2,
  slot3,
}: UsePriceChartProps) {
  const [analyzedCharts, setAnalyzedCharts] = useState<ChartItem[]>([])
  const [isChartLoading, setIsChartLoading] = useState(false)

  const fetchTrackedCharts = useCallback(async () => {
    setIsChartLoading(true)
    try {
      let items: any[] = []

      // 1. Lấy từ backend API / localStorage danh sách đang theo dõi
      try {
        const apiItems = await trackingApiService.fetchTrackingItems()
        if (Array.isArray(apiItems)) {
          items = [...apiItems]
        }
      } catch (e) {
        console.warn("fetch tracking-items error:", e)
      }

      // 2. Lấy trực tiếp từ các ô Slot trên giao diện Radar (kể cả khi vừa dán link hoặc đã active)
      const pushSlotIfValid = (slot: SlotItemState, fallbackTitle: string) => {
        if ((slot.active || slot.input.startsWith("http")) && slot.input.trim()) {
          items.unshift({
            shopeeUrl: slot.input,
            url: slot.input,
            productName:
              slot.previewName ||
              (slot.productName && !slot.productName.includes("đang theo dõi")
                ? slot.productName
                : "") ||
              urlParserService.extractCleanProductName(slot.input) ||
              fallbackTitle,
            itemId:
              urlParserService.extractShopeeItemId(slot.input) || slot.itemId,
            productPrice: slot.previewPrice || slot.productPrice,
            basePrice: slot.basePrice,
            originalPrice: slot.originalPrice || slot.basePrice,
            voucherPrice: slot.voucherPrice,
            targetPrice: slot.targetPrice,
            imageUrl: slot.imageUrl,
          })
        }
      }

      pushSlotIfValid(slot3, "Sản phẩm Món #3")
      pushSlotIfValid(slot2, "Sản phẩm Món #2")
      pushSlotIfValid(slot1, "Sản phẩm Món #1")

      // Lọc trùng lặp theo URL
      const uniqueItems = items.filter(
        (v, i, a) =>
          a.findIndex(
            (t) =>
              (t.shopeeUrl || t.productUrl || t.url) ===
              (v.shopeeUrl || v.productUrl || v.url)
          ) === i
      )

      if (uniqueItems.length > 0) {
        const newCharts: ChartItem[] = []

        for (const item of uniqueItems) {
          const url = item.shopeeUrl || item.productUrl || item.url
          if (!url) continue

          let numericItemId =
            urlParserService.extractShopeeItemId(url) ||
            (item.itemId && /^\d+$/.test(String(item.itemId))
              ? String(item.itemId)
              : null)

          let productName =
            item.productName &&
            item.productName !== "Pdp" &&
            !item.productName.includes("Món ")
              ? item.productName
              : urlParserService.extractCleanProductName(url)

          let currentPrice =
            item.basePrice ||
            Number(item.livePrice) ||
            pricingService.parseVND(item.productPrice) ||
            Number(item.originalPrice) ||
            0

          let origPrice =
            Number(item.originalPrice) ||
            (currentPrice > 0 ? Math.round((currentPrice * 1.25) / 1000) * 1000 : 0)

          let voucherPrice = item.voucherPrice ? Number(item.voucherPrice) : null
          let targetPrice = item.targetPrice
            ? pricingService.parseVND(item.targetPrice)
            : currentPrice > 0
              ? pricingService.calculateDefaultTarget(currentPrice, origPrice)
              : 0

          let imageUrl = item.imageUrl || item.productImage || item.liveImageUrl || null

          // Nếu thiếu giá hoặc thiếu ảnh, cào preview bổ sung
          if (!currentPrice || !imageUrl || productName === "Pdp") {
            try {
              const previewData = await trackingApiService.fetchPreview(url)
              if (previewData) {
                if (!numericItemId && previewData.itemId && /^\d+$/.test(String(previewData.itemId))) {
                  numericItemId = String(previewData.itemId)
                }
                if (previewData.productName && !previewData.productName.includes("Không thể lấy")) {
                  productName = previewData.productName
                }
                if (previewData.price || previewData.currentPrice) {
                  const pVal = Number(previewData.price || previewData.currentPrice)
                  if (pVal > 0) currentPrice = pVal
                }
                if (previewData.originalPrice && Number(previewData.originalPrice) > 0) {
                  origPrice = Number(previewData.originalPrice)
                }
                if (previewData.voucherPrice && Number(previewData.voucherPrice) > 0) {
                  voucherPrice = Number(previewData.voucherPrice)
                }
                if (previewData.imageUrl) {
                  imageUrl = previewData.imageUrl
                }
              }
            } catch (e) {}
          }

          if (!currentPrice || currentPrice <= 0) {
            currentPrice = targetPrice > 0 ? Math.round((targetPrice / 0.72) / 1000) * 1000 : 250000
          }
          if (!origPrice || origPrice < currentPrice) {
            origPrice = Math.round((currentPrice * 1.25) / 1000) * 1000
          }
          if (!targetPrice || targetPrice <= 0) {
            targetPrice = pricingService.calculateDefaultTarget(currentPrice, origPrice)
          }

          let chartAdded = false
          if (numericItemId) {
            try {
              const history = await trackingApiService.fetchPriceHistory(numericItemId)
              if (
                history &&
                Array.isArray(history.labels) &&
                history.labels.length >= 2 &&
                Array.isArray(history.price) &&
                history.price.length >= 2
              ) {
                const checkpoints = history.labels.map(
                  (lbl: string, i: number) => ({
                    label: lbl,
                    price: Number(history.price[i]) || currentPrice,
                  })
                )
                const dataPoints = chartService.buildRealPricePoints({
                  currentPrice,
                  originalPrice: origPrice,
                  voucherPrice,
                  targetPrice,
                  checkpoints,
                })
                const validPrices = history.price.filter((p: number) => p > 0)
                const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : currentPrice
                const lastPrice = validPrices.length > 0 ? validPrices[validPrices.length - 1] : currentPrice

                newCharts.push({
                  id: String(numericItemId),
                  name: productName,
                  url,
                  imageUrl,
                  currentPrice,
                  originalPrice: origPrice,
                  targetPrice,
                  voucherPrice,
                  isBottom: lastPrice <= minPrice,
                  data: dataPoints,
                })
                chartAdded = true
              }
            } catch (e) {}
          }

          if (!chartAdded) {
            const effectiveCurrent =
              voucherPrice && voucherPrice > 0 && voucherPrice < currentPrice
                ? voucherPrice
                : currentPrice

            newCharts.push({
              id: numericItemId || item.id || String(newCharts.length + 1),
              name: productName,
              url,
              imageUrl,
              currentPrice: effectiveCurrent,
              originalPrice: origPrice,
              targetPrice,
              voucherPrice,
              isBottom: Boolean(voucherPrice && voucherPrice < currentPrice),
              data: chartService.buildRealPricePoints({
                currentPrice,
                originalPrice: origPrice,
                voucherPrice,
                targetPrice,
              }),
            })
          }
        }

        setAnalyzedCharts(newCharts)
      } else {
        setAnalyzedCharts([])
      }
    } catch (e) {
      console.error("Lỗi lấy biểu đồ theo dõi:", e)
    } finally {
      setIsChartLoading(false)
    }
  }, [
    slot1.active,
    slot1.input,
    slot1.itemId,
    slot1.productName,
    slot1.previewName,
    slot1.previewPrice,
    slot1.productPrice,
    slot1.basePrice,
    slot1.originalPrice,
    slot1.voucherPrice,
    slot1.targetPrice,
    slot1.imageUrl,
    slot2.active,
    slot2.input,
    slot2.itemId,
    slot2.productName,
    slot2.previewName,
    slot2.previewPrice,
    slot2.productPrice,
    slot2.basePrice,
    slot2.originalPrice,
    slot2.voucherPrice,
    slot2.targetPrice,
    slot2.imageUrl,
    slot3.active,
    slot3.input,
    slot3.itemId,
    slot3.productName,
    slot3.previewName,
    slot3.previewPrice,
    slot3.productPrice,
    slot3.basePrice,
    slot3.originalPrice,
    slot3.voucherPrice,
    slot3.targetPrice,
    slot3.imageUrl,
  ])

  useEffect(() => {
    if (view === "price_chart") {
      fetchTrackedCharts()
      const iv = setInterval(fetchTrackedCharts, 30 * 60 * 1000)
      return () => clearInterval(iv)
    }
  }, [view, fetchTrackedCharts])

  return {
    analyzedCharts,
    isChartLoading,
    fetchTrackedCharts,
  }
}
