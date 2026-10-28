import React from "react"
import { Menu, X } from "lucide-react"

interface MenuButtonProps {
  isOpen: boolean
  onClick: () => void
  className?: string
  title?: string
}

export function MenuButton({
  isOpen,
  onClick,
  className = "",
  title = "Menu Chức Năng",
}: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`app-menu-btn ${isOpen ? "is-open" : ""} ${className}`}
      title={title}
      aria-label={title}
      aria-expanded={isOpen}
    >
      <div
        className={`transform transition-transform duration-300 flex items-center justify-center ${
          isOpen ? "rotate-90" : "rotate-0"
        }`}
      >
        {isOpen ? (
          <X className="w-5 h-5 stroke-[2.5]" />
        ) : (
          <Menu className="w-5 h-5 stroke-[2.5]" />
        )}
      </div>
    </button>
  )
}
