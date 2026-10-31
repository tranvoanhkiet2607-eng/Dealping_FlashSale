import React from "react"
import { Rank } from "../../types"
import { MenuButton } from "../common"
import { DEALPING_LOGO_URI } from "../../constants"

interface AccountViewProps {
  currentRank: Rank
  friendsInvited: number
  maxSlots: number
  onBackToMain: () => void
  onToggleMenu: () => void
  isMenuOpen: boolean
}

export function AccountView({
  currentRank,
  friendsInvited,
  maxSlots,
  onBackToMain,
  onToggleMenu,
  isMenuOpen,
}: AccountViewProps) {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden z-10 pt-24 lg:pt-6 px-5 lg:px-8 max-w-xl mx-auto w-full">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white">👤 Tài Khoản</h2>
          <p className="text-[10px] lg:text-xs text-slate-600 dark:text-white/70 mb-2 font-medium">
            Quản lý thông tin & hạng thành viên DealPing
          </p>
        </div>
        <MenuButton
          isOpen={isMenuOpen}
          onClick={onToggleMenu}
          className="z-50 shrink-0"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-3xl mb-4 overflow-hidden shadow-xl ring-2 ring-purple-500/40 bg-[#0f172a] flex items-center justify-center">
          <img
            src={DEALPING_LOGO_URI}
            alt="DealPing Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <h3 className="text-sm font-black text-slate-900 dark:text-white">Người Dùng VIP</h3>
        <p className="text-[10px] text-pink-600 dark:text-pink-400 font-bold mt-1 mb-6">
          Hạng: {currentRank.name}
        </p>

        <div className="w-full bg-white/90 dark:bg-white/10 border border-slate-200/90 dark:border-white/15 rounded-2xl p-4 space-y-3 shadow-sm dark:shadow-none">
          <div className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-200">
            <span className="opacity-80">Số bạn đã mời</span>
            <span className="font-bold">{friendsInvited} người</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-700 dark:text-slate-200">
            <span className="opacity-80">Ô săn deal tối đa</span>
            <span className="font-bold text-pink-600 dark:text-pink-400">{maxSlots} món</span>
          </div>
        </div>

        <button
          onClick={onBackToMain}
          className="mt-6 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/15 dark:hover:bg-white/25 border border-slate-200 dark:border-white/20 text-slate-800 dark:text-white rounded-full text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          Quay về Radar
        </button>
      </div>
    </div>
  )
}
