import React, { useState } from "react"
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import { ChartItem } from "../../types"
import { MenuButton } from "../common"
import { urlParserService, pricingService } from "../../services"

interface PriceChartViewProps {
  analyzedCharts: ChartItem[]
  isChartLoading?: boolean
  isDark?: boolean
  onToggleMenu: () => void
  isMenuOpen: boolean
  onQuickAnalyzeUrl?: (url: string) => void
  onNavigateToMain?: () => void
}

export function PriceChartView({
  analyzedCharts,
  isChartLoading = false,
  isDark = false,
  onToggleMenu,
  isMenuOpen,
  onQuickAnalyzeUrl,
  onNavigateToMain,
}: PriceChartViewProps) {
  const [quickUrl, setQuickUrl] = useState("")

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = urlParserService.extractUrl(quickUrl)
    if (clean && onQuickAnalyzeUrl) {
      onQuickAnalyzeUrl(clean)
      setQuickUrl("")
    }
  }

  const handlePasteQuick = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        const clean = urlParserService.extractUrl(text)
        setQuickUrl(clean)
        if (clean.startsWith("http") && onQuickAnalyzeUrl) {
          onQuickAnalyzeUrl(clean)
        }
      }
    } catch {}
  }

  const axisTickColor = isDark ? "#cbd5e1" : "#475569"
  const gridStrokeColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(148, 163, 184, 0.28)"

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden z-10 pt-24 lg:pt-6 px-4 sm:px-5 lg:px-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 pb-2.5 border-b border-slate-200/90 dark:border-white/15 shrink-0">
        <div>
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <h2 className="text-lg lg:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
              📈 Biểu Đồ Giá Thực Tế
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-400/40">
              🛡️ Dữ liệu thực 100%
            </span>
          </div>
          <p className="text-[10px] lg:text-xs text-slate-600 dark:text-white/80 mt-1 font-medium">
            Biến động giá niêm yết, giá hiện tại và mốc mục tiêu săn sale từ Radar 24/7.
          </p>
        </div>
        <MenuButton
          isOpen={isMenuOpen}
          onClick={onToggleMenu}
          className="lg:hidden z-50 shrink-0"
        />
      </div>

      {/* Quick Link Price Chart Analyzer Bar */}
      {onQuickAnalyzeUrl && (
        <form
          onSubmit={handleAnalyzeSubmit}
          className="mb-4 p-2.5 rounded-2xl apple-glass border border-slate-200/90 dark:border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 shadow-sm"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={quickUrl}
              onChange={(e) =>
                setQuickUrl(urlParserService.extractUrl(e.target.value))
              }
              placeholder="Dán link Shopee / TikTok / Lazada để phân tích biểu đồ giá ngay..."
              className="w-full apple-input rounded-xl px-3.5 py-2 pr-20 text-xs font-medium placeholder-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handlePasteQuick}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 text-[10px] font-bold cursor-pointer active:scale-95"
            >
              📋 Dán link
            </button>
          </div>
          <button
            type="submit"
            disabled={!quickUrl.trim()}
            className="px-4 py-2 rounded-xl apple-glow-btn text-white text-xs font-bold shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            📈 Xem Biểu Đồ Giá
          </button>
        </form>
      )}

      {/* Charts Grid */}
      <div className="flex-1 overflow-y-auto space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 pb-20">
        {isChartLoading && analyzedCharts.length === 0 ? (
          <>
            {[1, 2].map((skeleton) => (
              <div
                key={skeleton}
                className="w-full apple-glass border border-slate-200/90 dark:border-white/15 rounded-2xl p-4 animate-pulse space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
                    <div className="h-2 bg-slate-200 dark:bg-white/10 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-48 w-full rounded-xl bg-slate-200/70 dark:bg-white/5" />
              </div>
            ))}
          </>
        ) : analyzedCharts.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-3xl mb-3 shadow-sm">
              📈
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              Chưa có sản phẩm nào trên Biểu Đồ Giá
            </p>
            <p className="text-xs mt-1.5 text-slate-600 dark:text-slate-300 max-w-md leading-relaxed font-medium">
              Hãy dán link sản phẩm vào thanh tìm kiếm bên trên hoặc qua tab{" "}
              <b>Radar Săn Deal</b> để hệ thống phân tích lịch sử biến động giá và điểm bắt đáy nhé!
            </p>
            {onNavigateToMain && (
              <button
                onClick={onNavigateToMain}
                className="mt-4 px-5 py-2.5 rounded-2xl apple-glow-btn text-white text-xs font-bold shadow-lg active:scale-95 transition cursor-pointer"
              >
                📡 Đến Radar Săn Deal Ngay →
              </button>
            )}
          </div>
        ) : (
          analyzedCharts.map((chart) => {
            const prices = chart.data.map((d) => d.price).filter((p) => p > 0)
            const currentPrice =
              chart.currentPrice && chart.currentPrice > 0
                ? chart.currentPrice
                : prices.length > 0
                  ? prices[prices.length - 1]
                  : 0
            const maxPrice =
              chart.originalPrice && chart.originalPrice > 0
                ? Math.max(chart.originalPrice, ...prices)
                : prices.length > 0
                  ? Math.max(...prices)
                  : 0
            const nonTargetPrices = chart.data
              .filter((d) => !d.date.includes("Mục tiêu") && d.price > 0)
              .map((d) => d.price)
            const minPrice =
              nonTargetPrices.length > 0
                ? Math.min(...nonTargetPrices)
                : prices.length > 0
                  ? Math.min(...prices)
                  : 0
            const targetPrice =
              chart.targetPrice && chart.targetPrice > 0
                ? chart.targetPrice
                : currentPrice > 0
                  ? Math.round((currentPrice * 0.72) / 1000) * 1000
                  : 0

            const allPlotValues = [...prices, targetPrice].filter((v) => v > 0)
            const domainMin =
              allPlotValues.length > 0
                ? Math.floor((Math.min(...allPlotValues) * 0.88) / 1000) * 1000
                : 0
            const domainMax =
              allPlotValues.length > 0
                ? Math.ceil((Math.max(...allPlotValues) * 1.08) / 1000) * 1000
                : 100000

            return (
              <div
                key={chart.id}
                className="w-full apple-glass border border-slate-200/90 dark:border-emerald-500/30 shadow-lg rounded-2xl p-4 animate-slide-up-notification flex flex-col"
              >
                {/* Product Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-white/10 flex items-center justify-center border border-slate-200 dark:border-white/20">
                      {chart.imageUrl ? (
                        <img
                          src={chart.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLElement).style.display =
                              "none"
                          }}
                        />
                      ) : (
                        <span className="text-xl">🛍️</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs lg:text-sm font-bold truncate text-slate-900 dark:text-white">
                        {chart.name}
                      </h3>
                      <a
                        href={chart.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] lg:text-[10px] text-emerald-700 dark:text-emerald-300 hover:underline truncate block mt-0.5 font-medium"
                      >
                        🔗 Mở sản phẩm trên sàn ↗
                      </a>
                    </div>
                  </div>
                  {chart.isBottom ? (
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[10px] rounded-lg font-black shrink-0 animate-pulse border border-emerald-300 dark:border-emerald-400/50 shadow-xs">
                      🔥 Chạm đáy
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] rounded-lg font-bold shrink-0 border border-amber-300 dark:border-amber-400/40">
                      📡 Đang canh đáy
                    </span>
                  )}
                </div>

                {/* 4 Price Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-2.5 rounded-xl bg-slate-100/90 dark:bg-white/10 border border-slate-200/90 dark:border-white/15 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-300 block font-semibold">
                      Giá niêm yết:
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 line-through text-[11px]">
                      {maxPrice > 0
                        ? pricingService.formatVND(maxPrice)
                        : "Đang cập nhật"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-600 dark:text-slate-300 block font-semibold">
                      Giá hiện tại:
                    </span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300 text-[11px]">
                      {currentPrice > 0
                        ? pricingService.formatVND(currentPrice)
                        : "Đang cập nhật"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-600 dark:text-slate-300 block font-semibold">
                      Đáy phát hiện:
                    </span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-300 text-[11px]">
                      {minPrice > 0
                        ? pricingService.formatVND(minPrice)
                        : "Đang cập nhật"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-pink-600 dark:text-pink-300 block font-bold">
                      🎯 Mục tiêu săn:
                    </span>
                    <span className="font-black text-pink-600 dark:text-pink-300 text-[11px]">
                      {targetPrice > 0
                        ? pricingService.formatVND(targetPrice)
                        : "Đang cập nhật"}
                    </span>
                  </div>
                </div>

                {/* Recharts AreaChart */}
                <div className="h-52 w-full mt-1 bg-white/90 dark:bg-[#13172b]/80 backdrop-blur-sm rounded-xl p-2.5 border border-slate-200/90 dark:border-emerald-500/25 shadow-inner relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chart.data}
                      margin={{ top: 12, right: 8, left: -12, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient
                          id={`colorPrice-${chart.id}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.45}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={gridStrokeColor}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        fontSize={10}
                        fontWeight={600}
                        tick={{ fill: axisTickColor }}
                        axisLine={{ stroke: gridStrokeColor }}
                        tickLine={false}
                        dy={4}
                      />
                      <YAxis
                        domain={[domainMin, domainMax]}
                        orientation="right"
                        fontSize={10}
                        fontWeight={600}
                        tick={{ fill: axisTickColor }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value: any) =>
                          value >= 1000000
                            ? (value / 1000000).toFixed(1).replace(/\.0$/, "") + "tr"
                            : value >= 1000
                              ? Math.round(value / 1000) + "k"
                              : value
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark
                            ? "rgba(24, 29, 54, 0.96)"
                            : "rgba(255, 255, 255, 0.98)",
                          border: isDark
                            ? "1px solid rgba(255,255,255,0.2)"
                            : "1px solid rgba(203,213,225,0.95)",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: isDark ? "#ffffff" : "#0f172a",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                        }}
                        itemStyle={{ color: "#10b981", fontWeight: "900" }}
                        labelStyle={{
                          color: isDark ? "#cbd5e1" : "#475569",
                          marginBottom: "4px",
                          fontWeight: 700,
                        }}
                        formatter={(value: any) => [
                          pricingService.formatVND(value),
                          "Mức giá",
                        ]}
                      />
                      {targetPrice > 0 && (
                        <ReferenceLine
                          y={targetPrice}
                          stroke="#ec4899"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill={`url(#colorPrice-${chart.id})`}
                        dot={{
                          r: 4,
                          fill: "#10b981",
                          stroke: isDark ? "#13172b" : "#ffffff",
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 6,
                          fill: "#ffffff",
                          stroke: "#10b981",
                          strokeWidth: 2.5,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
