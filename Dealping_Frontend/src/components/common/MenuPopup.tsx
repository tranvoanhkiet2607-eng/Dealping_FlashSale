import React from "react"
import { Heart, TrendingUp, User, Radio, Sun, Moon, HelpCircle } from "lucide-react"
import { View } from "../../types"

interface MenuPopupProps {
  isOpen: boolean
  onClose: () => void
  currentView: View
  onNavigate: (view: View) => void
  canLeaveFeedback: boolean
  slot3Unlocked: boolean
  onOpenFeedback: () => void
  onBlockedFeedbackClick: () => void
  isDark?: boolean
  onToggleTheme?: () => void
  onRestartTutorial?: () => void
  className?: string
}

export function MenuPopup({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  canLeaveFeedback,
  slot3Unlocked,
  onOpenFeedback,
  onBlockedFeedbackClick,
  isDark,
  onToggleTheme,
  onRestartTutorial,
  className = "absolute top-10 right-0 mt-2",
}: MenuPopupProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Invisible backdrop to dismiss menu on tap outside */}
      <div
        className="fixed inset-0 z-40 bg-black/15 dark:bg-black/30"
        onClick={onClose}
      />

      <div
        className={`${className} menu-popup backdrop-blur-md rounded-[24px] p-2 w-56 flex flex-col space-y-1 animate-slide-down-notification z-50`}
      >
        <button
          onClick={() => {
            onNavigate("wishlist")
            onClose()
          }}
          className={`menu-item flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer active:scale-98 ${
            currentView === "wishlist" ? "active-wishlist font-bold" : ""
          }`}
        >
          <Heart className="w-4 h-4 shrink-0" />
          <span className="text-xs">Lịch sử theo dõi</span>
        </button>

        <button
          onClick={() => {
            onNavigate("price_chart")
            onClose()
          }}
          className={`menu-item flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer active:scale-98 ${
            currentView === "price_chart" ? "active-price-chart font-bold" : ""
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span className="text-xs">Biểu đồ giá</span>
        </button>

        <button
          onClick={() => {
            onNavigate("account")
            onClose()
          }}
          className={`menu-item flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer active:scale-98 ${
            currentView === "account" ? "active-account font-bold" : ""
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="text-xs">Tài khoản</span>
        </button>

        <div className="menu-divider h-px my-1 mx-2" />

        <button
          onClick={() => {
            onNavigate("main")
            onClose()
          }}
          className={`menu-item flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer active:scale-98 ${
            currentView === "main" ? "active-main font-bold" : ""
          }`}
        >
          <Radio className="w-4 h-4 shrink-0" />
          <span className="text-xs">Radar Săn Deal</span>
        </button>

        {/* Đổi chế độ Sáng / Tối (Light Mode / Dark Mode) */}
        {onToggleTheme && (
          <>
            <div className="menu-divider h-px my-1 mx-2" />
            <button
              onClick={() => {
                onToggleTheme()
              }}
              className="menu-item flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center space-x-3">
                {isDark ? (
                  <Sun className="w-4 h-4 shrink-0 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 shrink-0 text-indigo-500" />
                )}
                <span className="text-xs font-semibold">
                  {isDark ? "Bật Chế độ Sáng" : "Bật Chế độ Tối"}
                </span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold">
                {isDark ? "☀️ Light" : "🌙 Dark"}
              </span>
            </button>
          </>
        )}

        {/* Xem lại Hướng dẫn (bao gồm hướng dẫn Dark / Light Mode) */}
        {onRestartTutorial && (
          <button
            onClick={() => {
              onClose()
              onRestartTutorial()
            }}
            className="menu-item flex items-center space-x-3 px-3 py-2 rounded-xl transition-all cursor-pointer active:scale-98"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span className="text-xs">Hướng dẫn sử dụng (3 bước)</span>
          </button>
        )}

        {/* Mục Đánh giá & Góp ý nhận quà Slot 3 */}
        <div className="menu-divider h-px my-1 mx-2" />

        <button
          onClick={() => {
            onNavigate("feedback")
            onClose()
          }}
          className={`menu-feedback flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left w-full active:scale-98 ${
            currentView === "feedback" ? "bg-amber-500/20 text-amber-300 font-bold" : ""
          }`}
        >
          <span className="text-base shrink-0">⭐</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold">
                {slot3Unlocked ? "Lịch sử đánh giá & Góp ý" : "Đánh giá nhận Ô #3"}
              </span>
              {!slot3Unlocked && (
                <span className="text-[8px] bg-red-500 text-white font-extrabold px-1.5 py-0.2 rounded-full animate-pulse">
                  HOT
                </span>
              )}
            </div>
            <p className="menu-feedback-sub text-[8px] truncate font-normal">
              {slot3Unlocked
                ? "Xem, thêm, sửa, xóa đánh giá"
                : "Phần thưởng: Mở khóa vĩnh viễn Ô #3"}
            </p>
          </div>
        </button>
      </div>
    </>
  )
}
