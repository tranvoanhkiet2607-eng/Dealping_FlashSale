import React from "react"
import { DEALPING_LOGO_URI } from "../../constants"

interface WelcomeViewProps {
  onStart: () => void
}

export function WelcomeView({ onStart }: WelcomeViewProps) {
  return (
    <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center px-7 text-center">
        <div className="w-24 h-24 rounded-[28px] overflow-hidden mb-5 shadow-2xl ring-2 ring-purple-500/40 bg-[#0f172a] flex items-center justify-center">
          <img
            src={DEALPING_LOGO_URI}
            alt="DealPing Logo"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-2xl font-black mb-2">DealPing - Trợ Lý Săn Deal</h1>

        <p className="text-sm opacity-80 leading-relaxed mb-7">
          Dán link món đồ bạn muốn mua.
          <br />
          Hệ thống sẽ theo dõi giá và báo bạn
          <br />
          khi món đồ xuống đúng mức giá mong muốn.
        </p>

        <button
          onClick={onStart}
          className="w-full max-w-sm py-3.5 rounded-[24px] apple-glow-btn text-white font-bold text-sm shadow-xl active:scale-95 transition cursor-pointer"
        >
          🚀 Bắt đầu trải nghiệm
        </button>

        <p className="text-[10px] opacity-60 mt-4 font-semibold">Shopee • TikTok • Lazada</p>
      </div>
    </div>
  )
}
