import React, { useState, useEffect } from "react"
import { ReviewItem } from "../../types"
import { TrackedProductOption } from "../../hooks/useFeedback"

interface FeedbackViewProps {
  trackedProducts: TrackedProductOption[]
  selectedProductId: string
  onSelectProduct: (id: string) => void
  reviews: ReviewItem[]
  rating: number
  onRatingChange: (star: number) => void
  feedbackText: string
  onFeedbackTextChange: (text: string) => void
  contact: string
  onContactChange: (contact: string) => void
  editingReviewId: string | null
  onSubmit: () => void
  onStartEdit: (review: ReviewItem) => void
  onCancelEdit: () => void
  onDeleteReview: (id: string) => void
  isSending: boolean
  slot3Unlocked: boolean
  onToggleMenu: () => void
  isMenuOpen: boolean
  onNavigateToMain: () => void
}

export function FeedbackView({
  trackedProducts,
  selectedProductId,
  onSelectProduct,
  reviews,
  rating,
  onRatingChange,
  feedbackText,
  onFeedbackTextChange,
  contact,
  onContactChange,
  editingReviewId,
  onSubmit,
  onStartEdit,
  onCancelEdit,
  onDeleteReview,
  isSending,
  slot3Unlocked,
  onToggleMenu,
  isMenuOpen,
  onNavigateToMain,
}: FeedbackViewProps) {
  // Real-time live clock for displaying the exact review submission timestamp
  const [liveTime, setLiveTime] = useState<string>("")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, "0")
      const mins = now.getMinutes().toString().padStart(2, "0")
      const secs = now.getSeconds().toString().padStart(2, "0")
      const day = now.getDate().toString().padStart(2, "0")
      const month = (now.getMonth() + 1).toString().padStart(2, "0")
      const year = now.getFullYear()
      setLiveTime(`${day}/${month}/${year} ${hours}:${mins}:${secs}`)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const selectedProduct =
    trackedProducts.find((p) => p.id === selectedProductId) ||
    trackedProducts[0]

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden z-10 pt-24 lg:pt-6 px-4 lg:px-8 max-w-6xl mx-auto w-full pb-20">
      {/* Header bar */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-200/80 dark:border-white/10 shrink-0">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-lg lg:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-pink-600 to-purple-600 dark:from-amber-400 dark:via-pink-400 dark:to-purple-400">
              ⭐ Đánh Giá Món Hàng Đã Săn
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                slot3Unlocked
                  ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-400/40"
                  : "bg-pink-100 dark:bg-pink-500/20 text-pink-800 dark:text-pink-300 border-pink-300 dark:border-pink-400/40 animate-pulse"
              }`}
            >
              {slot3Unlocked ? "👑 VIP Ô #3 ĐÃ MỞ" : "🎁 Đánh giá nhận Ô #3"}
            </span>
          </div>
          <p className="text-[10px] lg:text-xs text-slate-600 dark:text-white/70 mt-1 font-medium">
            Chỉ áp dụng cho các món hàng bạn đã đặt hoặc theo dõi trên Radar. Đầy đủ thông tin sản phẩm, ngày giờ và lịch sử đánh giá.
          </p>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={onToggleMenu}
          className={`lg:hidden w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-300 border z-50 ${
            isMenuOpen
              ? "bg-white text-black border-transparent scale-90"
              : "apple-glass text-white border-white/40 hover:scale-105 active:scale-95"
          }`}
        >
          <div
            className={`transform transition-transform duration-300 text-xs ${
              isMenuOpen ? "rotate-90" : "rotate-0"
            }`}
          >
            {isMenuOpen ? "✕" : "☰"}
          </div>
        </button>
      </div>

      {/* Main Content Area */}
      {trackedProducts.length === 0 ? (
        // Case: User has NOT tracked/ordered any items yet
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="apple-glass rounded-3xl border border-slate-200/90 dark:border-white/10 p-8 max-w-lg text-center shadow-xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-400/30 flex items-center justify-center text-3xl mb-4">
              📦
            </div>
            <h3 className="text-base lg:text-lg font-black text-slate-900 dark:text-amber-300 mb-2">
              Chưa có món hàng nào để đánh giá
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-medium">
              Bạn cần dán link theo dõi hoặc đặt hàng sản phẩm trên <b>Radar Săn Deal</b> trước khi thực hiện đánh giá. Nếu trước đó bạn quên đánh giá, món hàng sẽ xuất hiện tại đây để bạn đánh giá bổ sung bất kỳ lúc nào.
            </p>
            <button
              onClick={onNavigateToMain}
              className="py-2.5 px-6 rounded-2xl apple-glow-btn text-white font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer flex items-center space-x-2"
            >
              <span>📡 Đến Radar Săn Deal Ngay</span>
              <span>→</span>
            </button>
          </div>
        </div>
      ) : (
        // Case: User HAS tracked products -> Show 2-Panel Dashboard
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto pr-1">
          {/* Panel 1 (Left): Select Product + Review Form */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Step 1: Select Tracked Product */}
            <div className="apple-glass rounded-3xl border border-slate-200/90 dark:border-white/10 p-4 shadow-lg">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-2">
                🛍️ Chọn món hàng bạn muốn đánh giá:
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {trackedProducts.map((prod) => {
                  const isSelected = selectedProduct?.id === prod.id
                  return (
                    <div
                      key={prod.id}
                      onClick={() => onSelectProduct(prod.id)}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center space-x-3 cursor-pointer ${
                        isSelected
                          ? "bg-purple-100 dark:bg-purple-600/25 border-purple-500 shadow-sm"
                          : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-200 dark:bg-white/10 flex items-center justify-center border border-slate-300 dark:border-white/20">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              ;(e.currentTarget as HTMLElement).style.display =
                                "none"
                            }}
                          />
                        ) : (
                          <span className="text-lg">🛍️</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {prod.name}
                        </div>
                        {prod.price && (
                          <div className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">
                            {typeof prod.price === "number"
                              ? new Intl.NumberFormat("vi-VN", {
                                  style: "currency",
                                  currency: "VND",
                                }).format(prod.price)
                              : prod.price}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0 animate-pulse" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Review Form with exact timestamp and product details */}
            <div className="apple-glass rounded-3xl border border-slate-200/90 dark:border-white/10 p-5 shadow-lg flex flex-col relative">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80 dark:border-white/10">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">
                    {editingReviewId ? "✏️" : "✍️"}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingReviewId
                      ? "Chỉnh Sửa Đánh Giá"
                      : "Gửi Đánh Giá Sản Phẩm"}
                  </h3>
                </div>
                {editingReviewId && (
                  <button
                    onClick={onCancelEdit}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white/80 active:scale-95 cursor-pointer font-semibold"
                  >
                    ✕ Hủy sửa
                  </button>
                )}
              </div>

              {/* Exact Submission Timestamp */}
              <div className="mb-3 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-[10px]">
                <span className="text-slate-600 dark:text-slate-400 font-medium">🕒 Thời gian ghi nhận:</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  {liveTime}
                </span>
              </div>

              {/* Star Rating Selection */}
              <div className="mb-3.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Đánh giá số sao cho món này:
                </label>
                <div className="flex items-center space-x-2 py-2 px-3 bg-slate-100/80 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => onRatingChange(star)}
                      className={`text-2xl transition-transform active:scale-125 hover:scale-115 cursor-pointer ${
                        star <= rating
                          ? "filter drop-shadow-[0_0_8px_#fbbf24]"
                          : "opacity-25 grayscale"
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              {/* Clean Empty Textarea (NO hardcoded presets) */}
              <div className="mb-3">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nội dung đánh giá của bạn: <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => onFeedbackTextChange(e.target.value)}
                  rows={3}
                  placeholder={`Nhập cảm nhận thực tế của bạn khi theo dõi / đặt mua "${selectedProduct?.name || 'sản phẩm'}"...`}
                  className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 transition shadow-inner font-medium"
                />
              </div>

              {/* Contact Info */}
              <div className="mb-4">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  SĐT / Zalo / Email (Tùy chọn nhận hỗ trợ & quà):
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => onContactChange(e.target.value)}
                  placeholder="0912... hoặc email"
                  className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 transition shadow-inner font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 mt-auto">
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSending || !feedbackText.trim()}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                    editingReviewId
                      ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white"
                      : "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white"
                  }`}
                >
                  {isSending ? (
                    <span>⏳ Đang xử lý...</span>
                  ) : editingReviewId ? (
                    <span>💾 Lưu Cập Nhật Đánh Giá</span>
                  ) : (
                    <span>🚀 Gửi Đánh Giá Cho Sản Phẩm Này</span>
                  )}
                </button>

                {editingReviewId && (
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-semibold active:scale-95 cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Panel 2 (Right): Review History for Tracked Products */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="apple-glass rounded-3xl border border-slate-200/90 dark:border-white/10 p-5 shadow-lg flex-1 flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80 dark:border-white/10 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">📜</span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Lịch Sử Đánh Giá Sản Phẩm
                  </h3>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-500/30">
                  {reviews.length} đánh giá
                </span>
              </div>

              {/* Review Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center opacity-70">
                    <div className="text-4xl mb-2">⭐</div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Chưa có đánh giá nào</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1 max-w-xs leading-relaxed">
                      Bạn đã có món hàng được ghi nhận trên hệ thống. Hãy chọn món ở cột bên trái và gửi đánh giá đầu tiên nhé!
                    </p>
                  </div>
                ) : (
                  reviews.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        editingReviewId === item.id
                          ? "bg-amber-100 dark:bg-amber-500/15 border-amber-400 dark:border-amber-400/50 shadow-sm"
                          : "bg-white/85 dark:bg-white/5 border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs dark:shadow-none"
                      }`}
                    >
                      {/* Product Header inside the Review Card */}
                      <div className="flex items-center space-x-3 mb-2.5 pb-2 border-b border-slate-200/80 dark:border-white/5">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-white/10 flex items-center justify-center border border-slate-200 dark:border-white/20">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                ;(e.currentTarget as HTMLElement).style.display =
                                  "none"
                              }}
                            />
                          ) : (
                            <span className="text-base">🛍️</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.productName}
                          </h4>
                          {item.productPrice && (
                            <span className="text-[10px] text-pink-600 dark:text-pink-400 font-bold">
                              Giá săn:{" "}
                              {typeof item.productPrice === "number"
                                ? new Intl.NumberFormat("vi-VN", {
                                    style: "currency",
                                    currency: "VND",
                                  }).format(item.productPrice)
                                : item.productPrice}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-amber-500 font-bold shrink-0">
                          {"⭐".repeat(item.rating)}
                        </div>
                      </div>

                      {/* Content Text */}
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed mb-3 whitespace-pre-wrap font-medium">
                        {item.content}
                      </p>

                      {/* Bottom Row: Exact Date/Time & Action Buttons (Sửa & Xóa) */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-white/5 text-[10px]">
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                            🕒 {item.createdAt}
                          </span>
                          {item.contact && (
                            <span className="truncate max-w-[140px] text-slate-500 dark:text-slate-400">
                              • 📞 {item.contact}
                            </span>
                          )}
                        </div>

                        {/* Action buttons: Edit & Delete */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => onStartEdit(item)}
                            className="px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-800 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-400/30 active:scale-95 transition-all cursor-pointer flex items-center space-x-1"
                            title="Chỉnh sửa nội dung đánh giá này"
                          >
                            <span>✏️</span>
                            <span>Sửa</span>
                          </button>

                          <button
                            onClick={() => onDeleteReview(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-800 dark:text-red-300 font-bold border border-red-300 dark:border-red-400/30 active:scale-95 transition-all cursor-pointer flex items-center space-x-1"
                            title="Xóa đánh giá này khỏi lịch sử"
                          >
                            <span>🗑️</span>
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
