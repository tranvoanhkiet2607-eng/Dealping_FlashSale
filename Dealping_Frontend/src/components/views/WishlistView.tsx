import React from "react"
import { pricingService } from "../../services"
import { MenuButton } from "../common"

interface WishlistViewProps {
  wishlistItems: any[]
  loading: boolean
  onToggleMenu: () => void
  isMenuOpen: boolean
}

export function WishlistView({
  wishlistItems,
  loading,
  onToggleMenu,
  isMenuOpen,
}: WishlistViewProps) {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden z-10 pt-24 lg:pt-6 px-5 lg:px-8 max-w-6xl mx-auto w-full">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white">🕒 Lịch sử theo dõi</h2>
          <p className="text-[10px] lg:text-xs text-slate-600 dark:text-white/60 mb-2 font-medium">
            Các sản phẩm bạn đã dán link thiết lập cảnh báo
          </p>
        </div>
        <MenuButton
          isOpen={isMenuOpen}
          onClick={onToggleMenu}
          className="z-50 shrink-0"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 pb-24 relative">
        {loading ? (
          <>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center space-x-3 animate-pulse"
              >
                <div className="w-12 h-12 bg-slate-200 dark:bg-white/10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
                  <div className="h-2 bg-slate-200 dark:bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center text-[10px] text-slate-500 dark:text-white/40 mt-4">
            📭 Bạn chưa theo dõi sản phẩm nào.
          </div>
        ) : (
          wishlistItems.map((item, idx) => {
            const isHit =
              item.status === "target_hit" || item.rawStatus === "TARGET_HIT"
            return (
              <div
                key={item.id || idx}
                className="p-3.5 bg-white/85 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 rounded-2xl flex flex-col space-y-2.5 transition-colors hover:bg-white dark:hover:bg-white/10 shadow-sm dark:shadow-none"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-black/20 flex items-center justify-center border border-slate-200 dark:border-white/10">
                    {item.imageUrl || item.productImage ? (
                      <img
                        src={item.imageUrl || item.productImage}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLElement).style.display = "none"
                        }}
                      />
                    ) : (
                      <span className="text-lg">🛍️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[8px] font-bold border ${
                          isHit
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 animate-pulse"
                            : "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isHit ? "bg-emerald-600 dark:bg-emerald-400" : "bg-amber-500 dark:bg-amber-400 animate-ping"
                          }`}
                        />
                        <span>
                          {item.statusLabel ||
                            (isHit ? "Đã sập giá" : "Đang rình giá")}
                        </span>
                      </span>
                      <span className="text-[9px] text-slate-500 dark:text-white/50 shrink-0 font-medium">
                        🕒 {item.lastCheckedAgo || item.lastCheckedText || "Vừa xong"}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.productName || "Sản phẩm đang theo dõi"}
                    </h4>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold truncate mt-0.5">
                      Mục tiêu: {pricingService.formatVND(item.targetPrice)}{" "}
                      {item.variantName ? `| ${item.variantName}` : ""}
                    </p>
                  </div>
                </div>

                {/* Nhịp tim Radar & Lời khuyên rà soát giá của Bot */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 space-y-1.5">
                  <div
                    className={`flex items-center space-x-2 text-[9px] font-semibold rounded-xl px-2.5 py-1.5 shadow-xs border ${
                      isHit
                        ? "bg-emerald-100/90 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40"
                        : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                    }`}
                  >
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 ${
                          isHit ? "bg-emerald-400" : "bg-emerald-500"
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          isHit
                            ? "bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_8px_#34d399]"
                            : "bg-emerald-600 dark:bg-emerald-500 shadow-[0_0_6px_#10b981]"
                        }`}
                      />
                    </span>
                    <span className="truncate">
                      {isHit
                        ? "🎯 Giá đã chạm đáy mục tiêu! Mua ngay kẻo lỡ cơ hội!"
                        : item.advice ||
                          `Radar quét giá ${
                            item.lastCheckedAgo || "10 phút trước"
                          } — Chưa giảm, kiên nhẫn đợi giá đáy!`}
                    </span>
                  </div>

                  {/* Thông điệp Mua Chậm Giá Hời */}
                  <div className="flex items-start space-x-1.5 text-[8.5px] text-slate-600 dark:text-white/70 px-1 font-medium">
                    <span className="shrink-0 text-[9px]">🛡️</span>
                    <span className="leading-tight">
                      <b className="text-purple-700 dark:text-purple-300">Khi bot im lặng</b> = Tiền
                      bạn an toàn trong túi.{" "}
                      <span className="text-pink-600 dark:text-pink-300 font-bold">
                        Mua chậm một nhịp, tiết kiệm một nửa!
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
