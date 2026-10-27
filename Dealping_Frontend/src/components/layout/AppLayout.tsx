import React from "react"

interface AppLayoutProps {
  phoneScreenRef: React.RefObject<HTMLDivElement | null>
  isDark: boolean
  isAlarmFlashing: boolean
  children: React.ReactNode
}

export function AppLayout({
  phoneScreenRef,
  isDark,
  isAlarmFlashing,
  children,
}: AppLayoutProps) {
  const themeClass = isDark ? "dark-mode" : "light-mode"

  return (
    <div className="min-h-screen w-full bg-[#08090e] flex flex-col select-none font-sans relative overflow-x-hidden">
      {/* Phone / Web Screen Frame */}
      <div
        ref={phoneScreenRef}
        className={`w-full min-h-screen flex-1 flex flex-col relative ${themeClass} ${
          isDark ? "dark" : ""
        } ${
          isAlarmFlashing ? "alarm-pulsing-active" : ""
        } transition-colors duration-500`}
      >
          {/* Ambient Background Orbs */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <div
              className={`orb-1 absolute -top-16 -left-16 w-64 lg:w-96 h-64 lg:h-96 rounded-full ${
                isDark
                  ? "bg-gradient-to-tr from-pink-600 to-rose-500 opacity-65 mix-blend-screen"
                  : "bg-gradient-to-tr from-pink-500 to-rose-400 opacity-70 mix-blend-multiply"
              }`}
            />
            <div
              className={`orb-2 absolute top-1/4 -right-20 w-72 lg:w-110 h-72 lg:h-110 rounded-full ${
                isDark
                  ? "bg-gradient-to-bl from-purple-600 via-indigo-600 to-blue-600 opacity-70 mix-blend-screen"
                  : "bg-gradient-to-bl from-purple-600 via-indigo-500 to-blue-500 opacity-70 mix-blend-multiply"
              }`}
            />
            <div
              className={`orb-3 absolute -bottom-16 left-8 w-64 lg:w-96 h-64 lg:h-96 rounded-full ${
                isDark
                  ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 opacity-60 mix-blend-screen"
                  : "bg-gradient-to-tr from-amber-400 via-orange-400 to-rose-400 opacity-65 mix-blend-multiply"
              }`}
            />
            <div
              className={`orb-4 absolute top-1/2 left-1/4 w-56 lg:w-80 h-56 lg:h-80 rounded-full ${
                isDark
                  ? "bg-gradient-to-r from-cyan-500 to-sky-600 opacity-60 mix-blend-screen"
                  : "bg-gradient-to-r from-cyan-400 to-sky-500 opacity-60 mix-blend-multiply"
              }`}
            />
          </div>

          {/* Screen Content */}
          {children}

          {/* iOS Home Indicator: Only visible on mobile screens */}
          <div className="pb-2 pt-1 flex justify-center z-50 bg-transparent shrink-0 absolute bottom-0 w-full pointer-events-none lg:hidden">
            <div className="w-32 h-1 bg-white opacity-40 rounded-full" />
          </div>
        </div>
    </div>
  )
}
