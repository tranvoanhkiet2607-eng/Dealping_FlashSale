import React, { useState, useLayoutEffect } from "react"
import { SpotlightStep, Rect } from "../../types"

interface SpotlightOverlayProps {
  step: SpotlightStep
  targetRef: React.RefObject<HTMLInputElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  onNext: () => void
  onDone: () => void
  isDark?: boolean
  onToggleTheme?: () => void
}

export function SpotlightOverlay({
  step,
  targetRef,
  containerRef,
  onNext,
  onDone,
  isDark,
  onToggleTheme,
}: SpotlightOverlayProps) {
  const [rect, setRect] = useState<Rect | null>(null)
  const [bubbleRect, setBubbleRect] = useState<Rect | null>(null)
  const [radarRect, setRadarRect] = useState<Rect | null>(null)
  const [themeRect, setThemeRect] = useState<Rect | null>(null)

  useLayoutEffect(() => {
    const updateRects = () => {
      if (!containerRef.current) return
      const containerBox = containerRef.current.getBoundingClientRect()

      if (step === "slot1" && targetRef.current) {
        const slotBox = targetRef.current.getBoundingClientRect()
        setRect({
          top: slotBox.top - containerBox.top,
          left: slotBox.left - containerBox.left,
          width: slotBox.width,
          height: slotBox.height,
        })
      } else if (step === "radar") {
        const radarEl = document.getElementById("radar-header-area")
        if (radarEl) {
          const rBox = radarEl.getBoundingClientRect()
          setRadarRect({
            top: rBox.top - containerBox.top,
            left: rBox.left - containerBox.left,
            width: rBox.width,
            height: rBox.height,
          })

          const bubbles = Array.from(
            document.querySelectorAll(".bubble-item:not(.bubble-popped)")
          ) as HTMLElement[]
          let foundVisible = false
          for (const b of bubbles) {
            const bBox = b.getBoundingClientRect()
            const bCenterY = bBox.top + bBox.height / 2
            if (bCenterY > rBox.top + 20 && bCenterY < rBox.bottom - 20) {
              const style = window.getComputedStyle(b)
              if (parseFloat(style.opacity) > 0.1) {
                setBubbleRect({
                  top: bBox.top - containerBox.top,
                  left: bBox.left - containerBox.left,
                  width: bBox.width,
                  height: bBox.height,
                })
                foundVisible = true
                break
              }
            }
          }
          if (!foundVisible) setBubbleRect(null)
        }
      } else if (step === "theme") {
        const themeBtn = document.getElementById("theme-toggle-btn")
        if (themeBtn) {
          const tBox = themeBtn.getBoundingClientRect()
          setThemeRect({
            top: tBox.top - containerBox.top,
            left: tBox.left - containerBox.left,
            width: tBox.width,
            height: tBox.height,
          })
        }
      }
    }

    updateRects()
    window.addEventListener("resize", updateRects)
    return () => window.removeEventListener("resize", updateRects)
  }, [step, targetRef, containerRef, isDark])

  if (step === "none") return null

  const backdropShadow = "rgba(15, 23, 42, 0.58)"

  // ── STEP 1: spotlight the slot1 card ──────────────────────────────────────
  if (step === "slot1") {
    const pad = 4
    const r = rect ?? { top: 310, left: 16, width: 340, height: 48 }
    const holeTop = r.top - pad
    const holeLeft = r.left - pad
    const holeW = r.width + pad * 2
    const holeH = r.height + pad * 2
    const holeBottom = holeTop + holeH
    const tooltipTop = holeBottom + 16

    return (
      <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
        {/* Invisible blocker to prevent interacting with background during tutorial */}
        <div className="absolute inset-0 pointer-events-auto" />

        {/* Cutout using box-shadow to make it fully rounded */}
        <div
          className="absolute pointer-events-none rounded-[24px] transition-all duration-300"
          style={{
            top: holeTop,
            left: holeLeft,
            width: holeW,
            height: holeH,
            boxShadow: `0 0 0 9999px ${backdropShadow}, 0 0 0 2.5px rgba(139,92,246,0.9), 0 0 28px 6px rgba(139,92,246,0.45)`,
          }}
        />

        {/* Tooltip below the input */}
        <div
          className="absolute pointer-events-auto max-w-md"
          style={{
            top: tooltipTop,
            left: Math.max(16, Math.min(holeLeft, window.innerWidth - 340)),
            right: 16,
          }}
        >
          <div className="spotlight-card rounded-[20px] p-4 shadow-2xl relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300">
                Bước 1 / 3 • Dán Link Săn Deal
              </span>
              <button
                onClick={onDone}
                className="text-[10px] font-bold opacity-60 hover:opacity-100 cursor-pointer"
              >
                Bỏ qua ✕
              </button>
            </div>
            <p className="text-[12px] font-bold leading-snug mb-3">
              <b>Bước 1:</b> Dán link món đồ muốn săn (Shopee, TikTok, Lazada) vào
              ô này — hệ thống sẽ canh giá 24/7 cho bạn!
            </p>
            <button
              onClick={onNext}
              className="w-full py-2.5 rounded-xl apple-glow-btn text-white font-bold text-xs active:scale-95 transition cursor-pointer"
            >
              Tiếp theo (2/3) ➔
            </button>
            {/* Arrow pointing UP to the input */}
            <div
              className="spotlight-arrow absolute w-0 h-0"
              style={{
                top: -10,
                left: 36,
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── STEP 2: glowing dot in radar area, tooltip below ─────────────────────
  if (step === "radar") {
    const fallbackTop = radarRect
      ? radarRect.top + radarRect.height / 2 - 40
      : 140
    const fallbackLeft = radarRect
      ? radarRect.left + radarRect.width / 2
      : 160

    const bTop = bubbleRect ? bubbleRect.top + bubbleRect.height / 2 : fallbackTop
    const bLeft = bubbleRect
      ? bubbleRect.left + bubbleRect.width / 2
      : fallbackLeft

    const bW = bubbleRect ? bubbleRect.width + 18 : 58
    const bH = bubbleRect ? bubbleRect.height + 18 : 58

    return (
      <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 pointer-events-auto" />

        {/* Cutout hole capturing the bubble */}
        <div
          className="absolute pointer-events-none rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            top: bTop - bH / 2,
            left: bLeft - bW / 2,
            width: bW,
            height: bH,
            boxShadow: `0 0 0 9999px ${backdropShadow}, 0 0 12px 3px rgba(236,72,153,0.7), 0 0 24px 6px rgba(139,92,246,0.4)`,
          }}
        >
          {!bubbleRect && (
            <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm border border-white/60 flex items-center justify-center animate-bounce">
              <span className="text-xl">🎁</span>
            </div>
          )}
        </div>

        {/* Arrow line from dot down to tooltip */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: bTop + bH / 2 + 4,
            left: bLeft,
            transform: "translateX(-50%)",
            width: 2,
            height: 28,
            background:
              "linear-gradient(to bottom, rgba(236,72,153,0.9), transparent)",
          }}
        />

        {/* Tooltip below */}
        <div
          className="absolute pointer-events-auto max-w-md"
          style={{
            top: bTop + bH / 2 + 34,
            left: Math.max(16, Math.min(bLeft - 140, window.innerWidth - 340)),
            right: 16,
          }}
        >
          <div className="spotlight-card rounded-[20px] p-4 shadow-2xl relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-300">
                Bước 2 / 3 • Mở Khóa Ô #2
              </span>
              <button
                onClick={onDone}
                className="text-[10px] font-bold opacity-60 hover:opacity-100 cursor-pointer"
              >
                Bỏ qua ✕
              </button>
            </div>
            <p className="text-[12px] font-bold leading-snug mb-3">
              <b>Bước 2:</b> Thấy bong bóng bay quanh Radar chưa? Chạm nổ đủ{" "}
              <b>10 bóng</b> để mở khoá thêm Ô săn deal thứ 2!
            </p>
            <button
              onClick={onNext}
              className="w-full py-2.5 rounded-xl apple-glow-btn text-white font-bold text-xs active:scale-95 transition cursor-pointer"
            >
              Tiếp theo: Chế độ Sáng / Tối (3/3) ➔
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── STEP 3: spotlight the Dark Mode / Light Mode toggle button ────────────
  const pad = 6
  const t = themeRect ?? {
    top: 48,
    left: typeof window !== "undefined" ? window.innerWidth - 180 : 200,
    width: 86,
    height: 32,
  }
  const holeTop = t.top - pad
  const holeLeft = t.left - pad
  const holeW = t.width + pad * 2
  const holeH = t.height + pad * 2
  const tooltipTop = holeTop + holeH + 16
  const arrowLeft = Math.max(24, Math.min(t.left + t.width / 2 - 16, 280))

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 pointer-events-auto" />

      {/* Cutout highlighting the Theme Toggle button */}
      <div
        className="absolute pointer-events-none rounded-full transition-all duration-300"
        style={{
          top: holeTop,
          left: holeLeft,
          width: holeW,
          height: holeH,
          boxShadow: `0 0 0 9999px ${backdropShadow}, 0 0 0 3px rgba(251,191,36,0.95), 0 0 28px 8px rgba(251,191,36,0.5)`,
        }}
      />

      {/* Tooltip below the Theme Toggle button */}
      <div
        className="absolute pointer-events-auto max-w-md ml-auto"
        style={{
          top: tooltipTop,
          left: 16,
          right: 16,
        }}
      >
        <div className="spotlight-card rounded-[20px] p-4 shadow-2xl relative">
          <div
            className="spotlight-arrow absolute w-0 h-0"
            style={{
              top: -10,
              right: Math.max(24, (typeof window !== "undefined" ? window.innerWidth : 380) - (t.left + t.width / 2) - 16),
              left: "auto",
            }}
          />
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
              Bước 3 / 3 • Giao Diện Sáng / Tối
            </span>
            <span className="text-xs">{isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}</span>
          </div>
          <p className="text-[12px] font-bold leading-snug mb-2">
            <b>Bước 3: Mở Dark Mode / Light Mode:</b> Bạn có thể bấm nút{" "}
            <b>"🌙 Bật Tối / ☀️ Bật Sáng"</b> ngay trên thanh góc phải (hoặc mở{" "}
            <b>Menu ☰</b>) để chuyển đổi giao diện Sáng / Tối dịu mắt bất kỳ lúc nào!
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-extrabold text-xs active:scale-95 transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>{isDark ? "☀️" : "🌙"}</span>
                <span>
                  {isDark ? "Thử chuyển sang Sáng (Light)" : "Thử chuyển sang Tối (Dark)"}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onDone}
              className="flex-1 py-2.5 px-3 rounded-xl apple-glow-btn text-white font-bold text-xs active:scale-95 transition cursor-pointer"
            >
              Đã hiểu, bắt đầu săn ngay! 🎉
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
