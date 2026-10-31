import React from "react"
import { BubbleData, SpotlightStep, View } from "../../types"
import { RadarBubbles } from "./RadarBubbles"
import { MenuPopup, MenuButton } from "../common"
import { DEALPING_LOGO_URI } from "../../constants"

interface RadarHeaderProps {
  bubbles: BubbleData[]
  onPopBubble: (id: number) => void
  onExpireBubble?: (id: number) => void
  spotlightStep: SpotlightStep
  onTestAlarm: () => void
  alarmLoading: boolean
  isMenuOpen: boolean
  onToggleMenu: () => void
  currentView: View
  onNavigate: (view: View) => void
  canLeaveFeedback: boolean
  slot3Unlocked: boolean
  onOpenFeedback: () => void
  onBlockedFeedbackClick: () => void
  isDark?: boolean
  onToggleTheme?: () => void
  onRestartTutorial?: () => void
}

export function RadarHeader({
  bubbles,
  onPopBubble,
  onExpireBubble,
  spotlightStep,
  onTestAlarm,
  alarmLoading,
  isMenuOpen,
  onToggleMenu,
  currentView,
  onNavigate,
  canLeaveFeedback,
  slot3Unlocked,
  onOpenFeedback,
  onBlockedFeedbackClick,
  isDark,
  onToggleTheme,
  onRestartTutorial,
}: RadarHeaderProps) {
  return (
    <div
      id="radar-header-area"
      className="relative h-[280px] lg:h-full w-full flex flex-col items-center justify-center lg:justify-between shrink-0 pt-4 lg:pt-5 lg:pb-5 lg:px-6"
    >
      {/* Desktop Card Header */}
      <div className="hidden lg:flex items-center justify-between w-full pb-3.5 border-b border-slate-200/80 dark:border-white/15 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-black tracking-wider uppercase text-slate-800 dark:text-white/95">
            Trạm Radar 24/7
          </span>
        </div>
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse"></span>
          <span>Đang quét trực tuyến</span>
        </div>
      </div>

      {/* Center Radar Scanner Area */}
      <div className="relative flex-1 w-full max-w-[340px] flex items-center justify-center my-auto min-h-[200px] lg:min-h-[260px]">
        {/* Pulsing Concentric Radar Rings */}
        <div className="absolute w-44 h-44 lg:w-56 lg:h-56 rounded-full border-2 border-purple-500/30 dark:border-purple-400/30 animate-ping opacity-35 pointer-events-none" />
        <div className="absolute w-32 h-32 lg:w-40 lg:h-40 rounded-full border border-pink-500/40 dark:border-pink-400/45 animate-pulse opacity-50 pointer-events-none" />
        <div className="absolute w-20 h-20 lg:w-26 lg:h-26 rounded-full border border-indigo-500/35 dark:border-indigo-400/40 pointer-events-none" />

        {/* Sweeping Sonar Beam on Desktop */}
        <div className="hidden lg:block absolute w-48 h-48 lg:w-56 lg:h-56 rounded-full pointer-events-none opacity-30 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_280deg,rgba(236,72,153,0.5)_360deg)] animate-radar-sweep" />

        {/* Floating Bubbles */}
        <RadarBubbles
          bubbles={bubbles}
          onPop={onPopBubble}
          onExpire={onExpireBubble}
          spotlightStep={spotlightStep}
        />

        {/* Radar Central Pill */}
        <div className="relative z-10 px-4 py-2.5 rounded-2xl apple-glow-btn text-white shadow-xl flex items-center space-x-2.5 border border-white/40 cursor-default select-none">
          <img
            src={DEALPING_LOGO_URI}
            alt="DealPing Logo"
            className="w-7 h-7 rounded-xl object-cover ring-1 ring-white/50 shadow-sm shrink-0"
          />
          <div className="text-center">
            <div className="text-[11px] lg:text-xs font-black leading-tight tracking-wide">
              Radar Săn Deal Đáy
            </div>
            <div className="text-[9px] lg:text-[10px] text-white/95">Quét 24/7 Đa Sàn</div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
        </div>
      </div>

      {/* Mobile-only Action Buttons */}
      {/* Test Siren Button (Bottom Left on Mobile) */}
      <button
        onClick={onTestAlarm}
        disabled={alarmLoading}
        className="lg:hidden absolute bottom-2.5 left-4 z-30 w-9 h-9 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500 shadow-lg shadow-red-500/20 backdrop-blur-xl flex items-center justify-center text-sm cursor-pointer active:scale-90 transition-all group"
        title="Nhấn để test thông báo hú chuông sập giá"
      >
        <span
          className={
            alarmLoading
              ? "animate-spin text-xs"
              : "group-hover:scale-120 transition-transform"
          }
        >
          🚨
        </span>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
      </button>

      {/* Mobile-only Menu Button (Bottom Right) */}
      <div className="lg:hidden absolute bottom-2.5 right-4 z-50">
        <MenuPopup
          isOpen={isMenuOpen}
          onClose={onToggleMenu}
          currentView={currentView}
          onNavigate={onNavigate}
          canLeaveFeedback={canLeaveFeedback}
          slot3Unlocked={slot3Unlocked}
          onOpenFeedback={onOpenFeedback}
          onBlockedFeedbackClick={onBlockedFeedbackClick}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
          onRestartTutorial={onRestartTutorial}
          className="absolute top-11 right-0 shadow-2xl mt-1.5"
        />

        <MenuButton
          isOpen={isMenuOpen}
          onClick={onToggleMenu}
          title="Menu Chức Năng"
        />
      </div>

      {/* Desktop Card Footer Controls */}
      <div className="hidden lg:flex w-full flex-col gap-2.5 pt-3.5 border-t border-slate-200/80 dark:border-white/15 shrink-0">
        {/* Test Siren Button */}
        <button
          onClick={onTestAlarm}
          disabled={alarmLoading}
          className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-red-500/15 via-rose-500/20 to-amber-500/15 dark:from-red-500/20 dark:via-rose-500/25 dark:to-amber-500/20 hover:from-red-500/25 hover:to-amber-500/25 border border-red-200 dark:border-red-400/40 text-slate-800 dark:text-white flex items-center justify-between text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer group"
          title="Nhấn để test chuông còi báo động sập giá"
        >
          <div className="flex items-center space-x-2">
            <span
              className={
                alarmLoading
                  ? "animate-spin text-sm"
                  : "group-hover:scale-125 transition-transform text-sm"
              }
            >
              🚨
            </span>
            <span className="text-red-700 dark:text-slate-100 group-hover:text-red-800 dark:group-hover:text-white transition-colors font-bold">
              Thử chuông còi báo sập giá
            </span>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/30 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-400/40 font-bold">
            {alarmLoading ? "Đang thử..." : "Bấm thử"}
          </span>
        </button>

        {/* VIP / Feedback Action */}
        <button
          onClick={() => {
            if (canLeaveFeedback || slot3Unlocked) {
              onOpenFeedback()
            } else {
              onBlockedFeedbackClick()
            }
          }}
          className="w-full py-2 px-3 rounded-xl bg-slate-100/90 hover:bg-slate-200/90 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200/90 dark:border-white/15 text-slate-700 hover:text-slate-900 dark:text-white/90 dark:hover:text-white flex items-center justify-between text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center space-x-1.5">
            <span>{slot3Unlocked ? "👑" : "💬"}</span>
            <span className="truncate">
              {slot3Unlocked ? "VIP Đã Mở Khóa Ô #3" : "Góp ý để mở Ô #3 VIP"}
            </span>
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-300 font-black">
            {slot3Unlocked ? "Xem góp ý →" : "Mở ngay →"}
          </span>
        </button>

        {/* Live Status & Platforms */}
        <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 px-1 pt-0.5 font-medium">
          <span className="flex items-center space-x-1">
            <span>⚡ Chu kỳ: 5s/lần</span>
          </span>
          <span className="text-pink-600 dark:text-pink-300 font-semibold">Shopee • TikTok • Lazada</span>
        </div>
      </div>
    </div>
  )
}
