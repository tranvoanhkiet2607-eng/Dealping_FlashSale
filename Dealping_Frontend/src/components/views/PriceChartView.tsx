import React from "react"
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { ChartItem } from "../../types"

interface PriceChartViewProps {
  analyzedCharts: ChartItem[]
  onToggleMenu: () => void
  isMenuOpen: boolean
}

export function PriceChartView({
  analyzedCharts,
  onToggleMenu,
  isMenuOpen,
}: PriceChartViewProps) {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden z-10 pt-24 lg:pt-6 px-5 lg:px-8 max-w-6xl mx-auto w-full">
      <div className="flex items-start justify-between mb-4 pb-2 border-b border-slate-200/80 dark:border-white/10 shrink-0">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-lg lg:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
              📈 Biểu Đồ Giá Thực Tế
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-400/30">
              🛡️ Dữ liệu thực 100%
            </span>
          </div>
          <p className="text-[10px] lg:text-xs text-slate-600 dark:text-white/70 mt-1">
            Biến động giá thực tế từ Radar & lịch sử sàn thương mại điện tử, không tạo giá ảo.
          </p>
        </div>
        <button
          onClick={onToggleMenu}
          className={`lg:hidden w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-300 border z-50 ${
            isMenuOpen
              ? "bg-white text-black border-transparent scale-90"
              : "apple-glass text-white border-white/40 hover:scale-105 active:scale-95"
          }`}
        >
          <div
            className={`transform transition-transform duration-300 text-xs ${
              isMenuOpen ? "rotate-90" : "rotate-0"
            }`}
          >
            {isMenuOpen ? "✕" : "☰"}
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 pb-20">
        {analyzedCharts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-70 py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-xs font-bold text-slate-800 dark:text-white">Chưa có sản phẩm nào trên Radar.</p>
            <p className="text-[10px] mt-1 text-slate-500 dark:text-slate-300">
              Hãy dán link vào ô Săn Deal ở tab Radar để hệ thống theo dõi biểu đồ giá thực tế nhé!
            </p>
          </div>
        ) : (
          analyzedCharts.map((chart) => {
            const prices = chart.data.map((d) => d.price).filter((p) => p > 0)
            const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0
            const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

            return (
              <div
                key={chart.id}
                className="w-full apple-glass border border-slate-200/90 dark:border-emerald-500/25 shadow-lg rounded-2xl p-4 animate-slide-up-notification flex flex-col"
              >
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
                      <h3 className="text-xs lg:text-sm font-bold truncate text-slate-900 dark:text-emerald-100">
                        {chart.name}
                      </h3>
                      <p className="text-[8px] lg:text-[9px] text-slate-500 dark:text-emerald-400/80 truncate mt-0.5">
                        {chart.url}
                      </p>
                    </div>
                  </div>
                  {chart.isBottom && (
                    <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[10px] rounded-lg font-black shrink-0 animate-pulse border border-emerald-300 dark:border-emerald-400/50 shadow-xs">
                      🔥 Chạm đáy
                    </span>
                  )}
                </div>

                {/* Price Metrics Bar */}
                <div className="grid grid-cols-2 gap-2 mb-3 px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-600 dark:text-slate-400 block font-medium">Giá hiện tại:</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400">
                      {currentPrice > 0
                        ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(currentPrice)
                        : "Đang cập nhật"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-600 dark:text-slate-400 block font-medium">Đáy phát hiện:</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-300">
                      {minPrice > 0
                        ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(minPrice)
                        : "Đang cập nhật"}
                    </span>
                  </div>
                </div>
              <div className="h-48 w-full mt-3 bg-slate-50/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-slate-200 dark:border-emerald-500/20 shadow-inner relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chart.data}
                    margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
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
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      fontSize={9}
                      tick={{ fill: "rgba(255,255,255,0.4)" }}
                      axisLine={false}
                      tickLine={false}
                      dy={5}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      orientation="right"
                      fontSize={9}
                      tick={{ fill: "rgba(255,255,255,0.4)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: any) =>
                        value >= 1000 ? value / 1000 + "k" : value
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(20,20,20,0.85)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        fontSize: "11px",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                      }}
                      itemStyle={{ color: "#10b981", fontWeight: "900" }}
                      labelStyle={{
                        color: "rgba(255,255,255,0.6)",
                        marginBottom: "4px",
                      }}
                      formatter={(value: any) => [
                        new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(value),
                        "Giá",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill={`url(#colorPrice-${chart.id})`}
                      dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                      activeDot={{
                        r: 6,
                        fill: "#fff",
                        stroke: "#10b981",
                        strokeWidth: 2,
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
