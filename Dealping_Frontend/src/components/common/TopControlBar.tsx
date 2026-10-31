import React from "react"
import { View } from "../../types"
import { DEALPING_LOGO_URI } from "../../constants"

interface TopControlBarProps {
  isDark: boolean
  onToggleTheme: () => void
  view: View
  slot3Unlocked: boolean
  slot2BubbleUnlocked?: boolean
  onRestartTutorial: () => void
  onNavigate?: (view: View) => void
}

export function TopControlBar({
  isDark,
  onToggleTheme,
  view,
  slot3Unlocked,
  slot2BubbleUnlocked,
  onRestartTutorial,
  onNavigate,
}: TopControlBarProps) {
  const slotText = slot3Unlocked
    ? "3 / 3 Món"
    : slot2BubbleUnlocked
      ? "2 / 2 Món"
      : "1 / 1 Món"

  const navTabs: { id: View; label: string; icon: string }[] = [
    { id: "main", label: "Radar Săn Deal", icon: "📡" },
    { id: "price_chart", label: "Biểu Đồ Giá", icon: "📈" },
    { id: "wishlist", label: "Lịch Sử Theo Dõi", icon: "🕒" },
    { id: "account", label: "Tài Khoản", icon: "👤" },
    { id: "feedback", label: "Đánh Giá & Góp Ý", icon: "⭐" },
  ]

  return (
    <>
      {/* Status Bar Spacing (mobile only) */}
      <div className="pt-10 pb-2 z-30 w-full lg:hidden" />

      {/* Top Navbar */}
      <header
        className={`absolute top-11 lg:relative lg:top-auto inset-x-2.5 sm:inset-x-4 lg:inset-x-0 lg:px-8 lg:py-3.5 flex items-center justify-between z-40 pointer-events-none lg:pointer-events-auto lg:border-b lg:backdrop-blur-xl shrink-0 transition-colors duration-300 ${
          isDark
            ? "lg:border-white/15 lg:bg-[#14182e]/90"
            : "lg:border-slate-200/90 lg:bg-white/90 shadow-sm shadow-slate-200/50"
        }`}
      >
        {/* Left Side: Brand Mascot Logo (Mobile & Desktop) */}
        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-6 pointer-events-auto">
          <div
            onClick={() => onNavigate && onNavigate("main")}
            className="flex items-center space-x-2 cursor-pointer select-none group"
            title="DealPing - Về trang chủ"
          >
            {/* Real App Mascot Logo (Embedded Base64 + Public SVG/PNG guarantee) */}
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-md ring-2 ring-purple-500/50 dark:ring-pink-400/50 group-hover:scale-105 transition-transform bg-[#0f172a] shrink-0">
              <img
                src={DEALPING_LOGO_URI}
                alt="DealPing Logo"
                className="w-full h-full object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900 animate-pulse" />
            </div>

            {/* Brand Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1.5 leading-none">
              <span
                className={`text-xs sm:text-sm font-black tracking-wide text-transparent bg-clip-text ${
                  isDark
                    ? "bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300"
                    : "bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700"
                }`}
              >
                DEALPING
              </span>
              <span
                className={`inline-block text-[7.5px] sm:text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase border mt-0.5 sm:mt-0 w-fit ${
                  isDark
                    ? "bg-pink-500/20 text-pink-300 border-pink-400/40"
                    : "bg-pink-100 text-pink-700 border-pink-300"
                }`}
              >
                FLASHSALE
              </span>
            </div>
          </div>

          {/* Navigation Tabs on Desktop */}
          {onNavigate && (
            <nav className="hidden lg:flex items-center space-x-1">
              {navTabs.map((tab) => {
                const isActive = view === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => onNavigate(tab.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center space-x-1.5 cursor-pointer ${
                      isActive
                        ? "apple-glow-btn text-white shadow-md shadow-purple-500/25 ring-1 ring-white/20"
                        : isDark
                          ? "text-slate-300 hover:text-white hover:bg-white/10"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                    }`}
                  >
                    <span className="text-xs">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          )}
        </div>

        {/* Center: Slot Limit (Only on mobile sm+) */}
        {view === "main" && (
          <div
            className={`hidden sm:flex pointer-events-auto lg:hidden px-2.5 py-1 rounded-full backdrop-blur text-[10px] font-black border items-center space-x-1 shadow-sm shrink-0 ${
              isDark
                ? "bg-white/15 border-white/25 text-purple-200"
                : "bg-white/95 border-slate-300 text-purple-900 shadow-slate-200"
            }`}
          >
            <span className={isDark ? "text-purple-200" : "text-slate-800"}>
              Giới hạn:
            </span>
            <span
              className={`font-bold ${
                isDark ? "text-pink-300" : "text-pink-600"
              }`}
            >
              {slotText}
            </span>
          </div>
        )}

        {/* Right Side Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 lg:space-x-3 pointer-events-auto shrink-0">
          {/* Desktop Slot Limit Badge */}
          {view === "main" && (
            <div
              className={`hidden lg:flex px-3 py-1.5 rounded-full backdrop-blur text-xs font-black border items-center space-x-1.5 shadow-sm ${
                isDark
                  ? "bg-white/10 border-white/20 text-purple-200"
                  : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <span className={isDark ? "opacity-85" : "text-slate-600"}>Giới hạn Radar:</span>
              <span className={`font-extrabold ${isDark ? "text-pink-300" : "text-pink-600"}`}>{slotText}</span>
            </div>
          )}

          {/* Theme Toggle (Mobile & Desktop - clearly labeled so users know how to switch Light / Dark Mode) */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center justify-center space-x-1 backdrop-blur border shadow-sm active:scale-95 transition-all cursor-pointer ${
              isDark
                ? "bg-amber-400/20 border-amber-300/50 text-amber-200 hover:bg-amber-400/30 shadow-amber-500/10"
                : "bg-white/95 lg:bg-slate-100 hover:bg-slate-200/80 border-slate-300 lg:border-slate-300 text-slate-800 shadow-slate-200/60"
            }`}
            title={isDark ? "Đang ở chế độ Tối (Dark Mode) — Bấm để bật chế độ Sáng (Light Mode)" : "Đang ở chế độ Sáng (Light Mode) — Bấm để bật chế độ Tối (Dark Mode)"}
            aria-label="Đổi giao diện Sáng / Tối (Light / Dark Mode)"
          >
            <span className="text-xs">{isDark ? "☀️" : "🌙"}</span>
            <span className="text-[10px] sm:text-[11px] lg:text-xs font-extrabold whitespace-nowrap">
              {isDark ? "Bật Sáng" : "Bật Tối"}
            </span>
          </button>

          {/* Tutorial Restart Button */}
          {view === "main" && (
            <button
              onClick={onRestartTutorial}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full backdrop-blur text-[10px] sm:text-[11px] lg:text-xs font-black border cursor-pointer active:scale-95 transition shadow-sm flex items-center space-x-1 shrink-0 ${
                isDark
                  ? "bg-white/20 lg:bg-white/15 border-white/35 text-white hover:bg-white/25"
                  : "bg-white/95 lg:bg-slate-100 hover:bg-slate-200/80 border-slate-300 lg:border-slate-300 text-slate-800 shadow-slate-200/60"
              }`}
              title="Xem hướng dẫn sử dụng & cách đổi chế độ Sáng / Tối"
            >
              <span>❓ Hướng dẫn</span>
            </button>
          )}
        </div>
      </header>
    </>
  )
}
