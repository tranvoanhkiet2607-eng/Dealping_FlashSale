import React from "react"
import { View } from "../../types"

interface TopControlBarProps {
  isDark: boolean
  onToggleTheme: () => void
  view: View
  slot3Unlocked: boolean
  slot2BubbleUnlocked: boolean
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
      <header className="absolute top-12 lg:relative lg:top-auto inset-x-4 lg:inset-x-0 lg:px-8 lg:py-3.5 flex items-center justify-between z-40 pointer-events-none lg:pointer-events-auto lg:border-b lg:border-white/10 lg:bg-[#0c0e17]/80 lg:backdrop-blur-xl shrink-0">
        {/* Left Side: Desktop Logo + Mobile Dark Toggle */}
        <div className="flex items-center space-x-6 pointer-events-auto">
          {/* Brand Logo on Desktop */}
          <div
            onClick={() => onNavigate && onNavigate("main")}
            className="hidden lg:flex items-center space-x-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-xl apple-glow-btn flex items-center justify-center text-sm shadow-md group-hover:scale-105 transition-transform">
              📡
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300">
                DEALPING
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-extrabold uppercase border border-pink-400/30">
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
                        ? "apple-glow-btn text-white shadow-md shadow-purple-500/20"
                        : "text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xs">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          )}

          {/* Mobile Dark / Light Toggle */}
          <button
            onClick={onToggleTheme}
            className={`lg:hidden flex items-center space-x-1.5 px-2.5 py-1 rounded-full backdrop-blur border shadow-sm active:scale-95 transition-all cursor-pointer ${
              isDark
                ? "bg-white/20 border-white/30 text-white"
                : "bg-white/90 border-slate-300 text-slate-900 shadow-slate-200"
            }`}
          >
            <span className="text-[11px]">{isDark ? "🌙" : "☀️"}</span>
            <span
              className={`text-[9px] font-bold ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {isDark ? "Dark" : "Light"}
            </span>
          </button>
        </div>

        {/* Center: Slot Limit (Only on mobile) */}
        {view === "main" && (
          <div
            className={`pointer-events-auto lg:hidden absolute left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full backdrop-blur text-[10px] font-black border flex items-center space-x-1 shadow-sm ${
              isDark
                ? "bg-white/20 border-white/30 text-purple-300"
                : "bg-white/90 border-slate-300 text-purple-900 shadow-slate-200"
            }`}
          >
            <span className={isDark ? "text-purple-300" : "text-slate-900"}>
              Giới hạn:
            </span>
            <span
              className={`font-bold ${
                isDark ? "text-pink-400" : "text-pink-600"
              }`}
            >
              {slotText}
            </span>
          </div>
        )}

        {/* Right Side Controls */}
        <div className="flex items-center space-x-3 pointer-events-auto">
          {/* Desktop Slot Limit Badge */}
          {view === "main" && (
            <div
              className={`hidden lg:flex px-3 py-1.5 rounded-full backdrop-blur text-xs font-black border items-center space-x-1.5 shadow-sm ${
                isDark
                  ? "bg-white/10 border-white/20 text-purple-200"
                  : "bg-white/90 border-slate-300 text-purple-900"
              }`}
            >
              <span className="opacity-75">Giới hạn Radar:</span>
              <span className="font-extrabold text-pink-400">{slotText}</span>
            </div>
          )}

          {/* Desktop Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full backdrop-blur border shadow-sm active:scale-95 transition-all cursor-pointer ${
              isDark
                ? "bg-white/15 border-white/25 text-white hover:bg-white/25"
                : "bg-white/90 border-slate-300 text-slate-900 shadow-slate-200 hover:bg-white"
            }`}
            title="Đổi giao diện Sáng / Tối"
          >
            <span className="text-xs">{isDark ? "🌙" : "☀️"}</span>
            <span className="text-xs font-bold">
              {isDark ? "Dark" : "Light"}
            </span>
          </button>

          {/* Tutorial Restart Button */}
          {view === "main" && (
            <button
              onClick={onRestartTutorial}
              className={`px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-full backdrop-blur text-[10px] lg:text-xs font-black border cursor-pointer active:scale-95 transition shadow-sm flex items-center space-x-1 ${
                isDark
                  ? "bg-white/20 lg:bg-white/15 border-white/30 text-white hover:bg-white/25"
                  : "bg-white/90 border-slate-300 text-slate-950 shadow-slate-200 hover:bg-white"
              }`}
            >
              <span
                className={isDark ? "text-white" : "text-slate-950 font-black"}
              >
                Hướng dẫn
              </span>
              <span
                className={isDark ? "text-white/70" : "text-slate-900 font-black"}
              >
                →
              </span>
            </button>
          )}
        </div>
      </header>
    </>
  )
}
