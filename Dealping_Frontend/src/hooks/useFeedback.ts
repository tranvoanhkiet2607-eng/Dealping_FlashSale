import { useState, useEffect, useMemo } from "react"
import { SlotItemState, ReviewItem } from "../types"
import { trackingApiService } from "../services"

export interface TrackedProductOption {
  id: string
  name: string
  imageUrl?: string | null
  price?: string | number
  url?: string
}

interface UseFeedbackProps {
  showToast: (title: string, msg: string, icon?: string) => void
  slot1: SlotItemState
  slot2: SlotItemState
  slot3: SlotItemState
  activeCount?: number
  hasEverTracked?: boolean
  wishlistItems: any[]
  onUnlockSlot3: () => void
}

const STORAGE_KEY = "dealping_user_reviews"

function formatRealTimeNow(): string {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, "0")
  const mins = now.getMinutes().toString().padStart(2, "0")
  const secs = now.getSeconds().toString().padStart(2, "0")
  const day = now.getDate().toString().padStart(2, "0")
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const year = now.getFullYear()
  return `${day}/${month}/${year} ${hours}:${mins}:${secs}`
}

export function useFeedback({
  showToast,
  slot1,
  slot2,
  slot3,
  wishlistItems,
  onUnlockSlot3,
}: UseFeedbackProps) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showSlot3Modal, setShowSlot3Modal] = useState(false)

  // 1. Gather all unique products that the user has tracked/ordered
  const trackedProducts = useMemo<TrackedProductOption[]>(() => {
    const list: TrackedProductOption[] = []

    if (slot1.active && (slot1.input || slot1.productName)) {
      list.push({
        id: "slot_1",
        name: slot1.productName || slot1.previewName || "Sản phẩm Ô #1",
        imageUrl: slot1.imageUrl,
        price: slot1.productPrice || slot1.previewPrice || slot1.basePrice,
        url: slot1.input,
      })
    }

    if (slot2.active && (slot2.input || slot2.productName)) {
      list.push({
        id: "slot_2",
        name: slot2.productName || slot2.previewName || "Sản phẩm Ô #2",
        imageUrl: slot2.imageUrl,
        price: slot2.productPrice || slot2.previewPrice || slot2.basePrice,
        url: slot2.input,
      })
    }

    if (slot3.active && (slot3.input || slot3.productName)) {
      list.push({
        id: "slot_3",
        name: slot3.productName || slot3.previewName || "Sản phẩm Ô #3",
        imageUrl: slot3.imageUrl,
        price: slot3.productPrice || slot3.previewPrice || slot3.basePrice,
        url: slot3.input,
      })
    }

    // Add items from wishlist history
    if (Array.isArray(wishlistItems)) {
      for (const item of wishlistItems) {
        const itemUrl = item.productUrl || item.shopeeUrl || item.url
        const itemName = item.productName || "Sản phẩm đã theo dõi"
        if (itemName && !list.some((p) => p.url === itemUrl || p.name === itemName)) {
          list.push({
            id: item.id ? String(item.id) : `wish_${list.length + 1}`,
            name: itemName,
            imageUrl: item.imageUrl,
            price: item.productPrice || item.originalPrice || item.targetPrice,
            url: itemUrl,
          })
        }
      }
    }

    return list
  }, [
    slot1.active,
    slot1.input,
    slot1.productName,
    slot1.previewName,
    slot1.imageUrl,
    slot1.productPrice,
    slot1.previewPrice,
    slot1.basePrice,
    slot2.active,
    slot2.input,
    slot2.productName,
    slot2.previewName,
    slot2.imageUrl,
    slot2.productPrice,
    slot2.previewPrice,
    slot2.basePrice,
    slot3.active,
    slot3.input,
    slot3.productName,
    slot3.previewName,
    slot3.imageUrl,
    slot3.productPrice,
    slot3.previewPrice,
    slot3.basePrice,
    wishlistItems,
  ])

  // Selected product being reviewed
  const [selectedProductId, setSelectedProductId] = useState<string>("")

  // Auto-select first tracked product if available and not yet set
  useEffect(() => {
    if (trackedProducts.length > 0 && !selectedProductId) {
      setSelectedProductId(trackedProducts[0].id)
    }
  }, [trackedProducts, selectedProductId])

  // Form fields (completely empty, NO hardcoded preset values)
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackContact, setFeedbackContact] = useState("")
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [isSendingFeedback, setIsSendingFeedback] = useState(false)

  // Review History (CRUD) — Starts completely empty, purges any old sample data
  const [reviews, setReviews] = useState<ReviewItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          // Purge any old hardcoded sample review
          return parsed.filter(
            (r) => r.id !== "rev_init_1" && r.productName && r.content
          )
        }
      }
    } catch (e) {
      console.warn("Error reading reviews from localStorage", e)
    }
    return []
  })

  // Synchronize reviews to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
    } catch (e) {
      console.warn("Error saving reviews to localStorage", e)
    }
  }, [reviews])

  const canLeaveFeedback = trackedProducts.length > 0

  // CREATE or UPDATE review
  const handleSendFeedback = async () => {
    if (trackedProducts.length === 0) {
      showToast(
        "⚠️ Chưa có sản phẩm để đánh giá",
        "Bạn cần theo dõi hoặc đặt hàng ít nhất 1 sản phẩm trước khi đánh giá.",
        "📦"
      )
      return
    }

    if (!feedbackText.trim()) {
      showToast(
        "⚠️ Vui lòng nhập nội dung đánh giá",
        "Hãy chia sẻ cảm nhận thực tế của bạn về sản phẩm này nhé!",
        "✍️"
      )
      return
    }

    const currentProduct =
      trackedProducts.find((p) => p.id === selectedProductId) ||
      trackedProducts[0]

    setIsSendingFeedback(true)

    if (editingReviewId) {
      // UPDATE existing review
      const updatedTime = formatRealTimeNow()
      setReviews((prev) =>
        prev.map((r) =>
          r.id === editingReviewId
            ? {
                ...r,
                productName: currentProduct.name,
                productImage: currentProduct.imageUrl,
                productPrice: currentProduct.price,
                productUrl: currentProduct.url,
                rating: feedbackRating,
                content: feedbackText.trim(),
                contact: feedbackContact.trim() || undefined,
                updatedAt: updatedTime,
              }
            : r
        )
      )

      setEditingReviewId(null)
      setFeedbackText("")
      setFeedbackContact("")
      setFeedbackRating(5)
      setIsSendingFeedback(false)
      setShowFeedbackModal(false)

      showToast(
        "✅ Đã cập nhật đánh giá!",
        `Đánh giá cho "${currentProduct.name}" đã được lưu lại thành công.`,
        "💾"
      )
      return
    }

    // CREATE new review with full product metadata and exact date/time
    const newReview: ReviewItem = {
      id: `rev_${Date.now()}`,
      productId: currentProduct.id,
      productName: currentProduct.name,
      productImage: currentProduct.imageUrl,
      productPrice: currentProduct.price,
      productUrl: currentProduct.url,
      rating: feedbackRating,
      content: feedbackText.trim(),
      contact: feedbackContact.trim() || undefined,
      createdAt: formatRealTimeNow(),
    }

    setReviews((prev) => [newReview, ...prev])

    // Send to backend
    try {
      await trackingApiService.sendFeedback(
        feedbackRating,
        `[Đánh giá sản phẩm: ${currentProduct.name}] ${feedbackText}`,
        feedbackContact
      )
    } catch (e) {
      console.warn("Backend feedback send error:", e)
    }

    setIsSendingFeedback(false)

    // Unlock Slot 3
    onUnlockSlot3()
    try {
      localStorage.setItem("dealping_slot3_unlocked", "true")
    } catch {}

    setFeedbackText("")
    setFeedbackContact("")
    setFeedbackRating(5)
    setShowFeedbackModal(false)
    setShowSlot3Modal(true)

    showToast(
      "💌 Đã gửi đánh giá thành công!",
      `Đã ghi nhận đánh giá cho món "${currentProduct.name}" và mở khóa vĩnh viễn Ô #3!`,
      "🎉"
    )
  }

  // START EDITING
  const handleStartEdit = (review: ReviewItem) => {
    setEditingReviewId(review.id)
    if (review.productId) {
      setSelectedProductId(review.productId)
    }
    setFeedbackRating(review.rating)
    setFeedbackText(review.content)
    setFeedbackContact(review.contact || "")
    showToast(
      "✏️ Chế độ chỉnh sửa",
      `Đang sửa đánh giá cho sản phẩm "${review.productName}".`,
      "📝"
    )
  }

  // CANCEL EDITING
  const handleCancelEdit = () => {
    setEditingReviewId(null)
    setFeedbackText("")
    setFeedbackContact("")
    setFeedbackRating(5)
  }

  // DELETE REVIEW
  const handleDeleteReview = (id: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Bạn có chắc chắn muốn xóa đánh giá của sản phẩm này không?")
    ) {
      return
    }

    setReviews((prev) => prev.filter((r) => r.id !== id))
    if (editingReviewId === id) {
      handleCancelEdit()
    }

    showToast(
      "🗑️ Đã xóa đánh giá!",
      "Đánh giá đã được xóa hoàn toàn khỏi lịch sử.",
      "✨"
    )
  }

  const handleBlockedFeedbackClick = () => {
    if (trackedProducts.length === 0) {
      showToast(
        "📦 Cần có món hàng để đánh giá",
        "Bạn hãy dán link theo dõi sản phẩm trên Radar trước khi đánh giá nhé!",
        "💡"
      )
    } else {
      setShowFeedbackModal(true)
    }
  }

  return {
    trackedProducts,
    selectedProductId,
    setSelectedProductId,
    showFeedbackModal,
    setShowFeedbackModal,
    showSlot3Modal,
    setShowSlot3Modal,
    feedbackRating,
    setFeedbackRating,
    feedbackText,
    setFeedbackText,
    feedbackContact,
    setFeedbackContact,
    editingReviewId,
    reviews,
    isSendingFeedback,
    canLeaveFeedback,
    handleSendFeedback,
    handleStartEdit,
    handleCancelEdit,
    handleDeleteReview,
    handleBlockedFeedbackClick,
  }
}
