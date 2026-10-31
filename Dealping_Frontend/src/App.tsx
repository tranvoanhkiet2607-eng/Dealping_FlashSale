import { useState, useRef } from "react"
import { getRank } from "./constants"
import {
  TopControlBar,
  ToastNotification,
  PushNotificationBanner,
  MenuPopup,
} from "./components/common"
import { AppLayout } from "./components/layout"
import { ViewRouter } from "./components/views"
import { AppModalsContainer } from "./components/modals"
import {
  useToast,
  useTutorial,
  useWishlist,
  usePriceChart,
  usePriceAlarm,
  useTrackingSlots,
  useRadarBubbles,
  useFeedback,
} from "./hooks"

export default function App() {
  // Mặc định mở giao diện Sáng (Light Mode) tươi sáng, rõ nét; lưu lựa chọn của người dùng
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dealping_theme_v2") === "dark"
    } catch {
      return false
    }
  })

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const slot1InputRef = useRef<HTMLInputElement>(null)
  const phoneScreenRef = useRef<HTMLDivElement>(null)

  // 1. Toast Notification System
  const { toast, showToast } = useToast()

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      try {
        localStorage.setItem("dealping_theme_v2", next ? "dark" : "light")
      } catch {}
      showToast(
        next ? "🌙 Đã bật Chế độ Tối (Dark Mode)" : "☀️ Đã bật Chế độ Sáng (Light Mode)",
        next
          ? "Giao diện tối dịu mắt — bấm nút ☀️ Bật Sáng ở góc phải để đổi lại."
          : "Giao diện sáng rõ nét — bấm nút 🌙 Bật Tối ở góc phải để đổi lại.",
        next ? "🌙" : "☀️"
      )
      return next
    })
  }

  // 2. View Routing & Spotlight Tutorial Flow
  const {
    view,
    setView,
    spotlightStep,
    setSpotlightStep,
    enterMain,
    finishTutorial,
    restartTutorial,
  } = useTutorial()

  // 3. Price Drop Siren Alarm & Push Notification System
  const {
    alarmLoading,
    showAlarmModal,
    setShowAlarmModal,
    alarmData,
    pushNotification,
    setPushNotification,
    isAlarmFlashing,
    triggerPriceDropAlarm,
    triggerAlarmFromSlot,
    handleTestAlarm,
  } = usePriceAlarm(showToast)

  // 4. Tracking Slots Engine
  const {
    slot1,
    slot2,
    slot3,
    slot2BubbleUnlocked,
    setSlot2BubbleUnlocked,
    slot3Unlocked,
    setSlot3Unlocked,
    showBumpSheet,
    setShowBumpSheet,
    lastActiveSlot,
    detailModalSlot,
    setDetailModalSlot,
    currentDetailData,
    setHasEverTracked,
    activeCount,
    handleInputChange,
    handleTargetPriceChange,
    handleVariantSelect,
    handlePaste,
    handleActivate,
    handleRemove,
    handleUpdateTargetPriceInDb,
    handleSimulateDropInDb,
  } = useTrackingSlots(showToast, triggerAlarmFromSlot)

  // 5. Radar Bubbles Mini-Game (Throttled & Auto-cleaned)
  const {
    bubbles,
    bubblesPopped,
    showUnlockModal,
    setShowUnlockModal,
    popBubble,
    removeBubble,
  } = useRadarBubbles(() => setSlot2BubbleUnlocked(true))

  // 6. Wishlist Data Sync
  const { wishlistItems, wishlistLoading } = useWishlist(
    view,
    setHasEverTracked
  )

  // 7. Dynamic Price Chart Engine
  const { analyzedCharts, isChartLoading } = usePriceChart({
    view,
    slot1,
    slot2,
    slot3,
  })

  // Quick analyze link directly from PriceChartView
  const handleQuickAnalyzeUrl = (url: string) => {
    handleInputChange(1, url)
    showToast(
      "📈 Đang phân tích biểu đồ giá",
      "Đã nạp sản phẩm vào Radar & cập nhật biểu đồ biến động giá!",
      "✨"
    )
  }

  // 8. Feedback & Slot 3 Unlock Engine
  const {
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
  } = useFeedback({
    showToast,
    slot1,
    slot2,
    slot3,
    wishlistItems,
    onUnlockSlot3: () => setSlot3Unlocked(true),
  })

  // Rank / Slots configuration
  const [friendsInvited] = useState(0)
  const currentRank = getRank(friendsInvited)
  const maxSlots = currentRank.slots

  return (
    <AppLayout
      phoneScreenRef={phoneScreenRef}
      isDark={isDark}
      isAlarmFlashing={isAlarmFlashing}
    >
      {/* Toast Notification */}
      <ToastNotification toast={toast} />

      {/* iOS Push Notification Banner */}
      <PushNotificationBanner
        notification={pushNotification}
        onOpenAlarm={() => {
          setShowAlarmModal(true)
          setPushNotification(null)
        }}
        onClose={() => setPushNotification(null)}
      />

      {/* Top Control Bar */}
      <TopControlBar
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        view={view}
        slot3Unlocked={slot3Unlocked}
        slot2BubbleUnlocked={slot2BubbleUnlocked}
        onRestartTutorial={() => {
          setIsMenuOpen(false)
          restartTutorial()
        }}
        onNavigate={(newView) => {
          setIsMenuOpen(false)
          setView(newView)
        }}
      />

      {/* View Router */}
      <ViewRouter
        view={view}
        onNavigate={setView}
        onEnterMain={enterMain}
        onSpotlightStepChange={setSpotlightStep}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onRestartTutorial={() => {
          setIsMenuOpen(false)
          restartTutorial()
        }}
        wishlistItems={wishlistItems}
        wishlistLoading={wishlistLoading}
        analyzedCharts={analyzedCharts}
        isChartLoading={isChartLoading}
        onQuickAnalyzeUrl={handleQuickAnalyzeUrl}
        currentRank={currentRank}
        friendsInvited={friendsInvited}
        maxSlots={maxSlots}
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
        bubbles={bubbles}
        onPopBubble={popBubble}
        onExpireBubble={removeBubble}
        bubblesPopped={bubblesPopped}
        showUnlockModal={showUnlockModal}
        onCloseUnlockModal={() => setShowUnlockModal(false)}
        spotlightStep={spotlightStep}
        slot1InputRef={slot1InputRef}
        slot1={slot1}
        slot2={slot2}
        slot3={slot3}
        slot2BubbleUnlocked={slot2BubbleUnlocked}
        slot3Unlocked={slot3Unlocked}
        activeCount={activeCount}
        onInputChange={handleInputChange}
        onTargetPriceChange={handleTargetPriceChange}
        onVariantSelect={handleVariantSelect}
        onPaste={handlePaste}
        onActivate={handleActivate}
        onRemove={handleRemove}
        onViewDetails={(num) => setDetailModalSlot(num)}
        showBumpSheet={showBumpSheet}
        onCloseBumpSheet={() => {
          setShowBumpSheet(false)
          showToast(
            "🔔 Đã bật Radar Món #1!",
            `Đang theo dõi: ${slot1.variant}`
          )
        }}
        onTestAlarm={() => handleTestAlarm(slot1, slot2, lastActiveSlot)}
        alarmLoading={alarmLoading}
        trackedProducts={trackedProducts}
        selectedProductId={selectedProductId}
        onSelectProduct={setSelectedProductId}
        reviews={reviews}
        feedbackRating={feedbackRating}
        onRatingChange={setFeedbackRating}
        feedbackText={feedbackText}
        onFeedbackTextChange={setFeedbackText}
        contact={feedbackContact}
        onContactChange={setFeedbackContact}
        editingReviewId={editingReviewId}
        onSendFeedback={handleSendFeedback}
        onStartEditReview={handleStartEdit}
        onCancelEditReview={handleCancelEdit}
        onDeleteReview={handleDeleteReview}
        isSendingFeedback={isSendingFeedback}
        canLeaveFeedback={canLeaveFeedback}
        onOpenFeedback={() => setView("feedback")}
        onBlockedFeedbackClick={() => setView("feedback")}
      />

      {/* Consolidated Modals */}
      <AppModalsContainer
        detailModalSlot={detailModalSlot}
        setDetailModalSlot={setDetailModalSlot}
        currentDetailData={currentDetailData}
        slot1={slot1}
        slot2={slot2}
        slot3={slot3}
        handleRemove={handleRemove}
        handleUpdateTargetPriceInDb={handleUpdateTargetPriceInDb}
        handleSimulateDropInDb={handleSimulateDropInDb}
        showAlarmModal={showAlarmModal}
        setShowAlarmModal={setShowAlarmModal}
        alarmData={alarmData}
        triggerPriceDropAlarm={triggerPriceDropAlarm}
        showFeedbackModal={showFeedbackModal}
        setShowFeedbackModal={setShowFeedbackModal}
        feedbackRating={feedbackRating}
        setFeedbackRating={setFeedbackRating}
        feedbackText={feedbackText}
        setFeedbackText={setFeedbackText}
        feedbackContact={feedbackContact}
        setFeedbackContact={setFeedbackContact}
        isSendingFeedback={isSendingFeedback}
        handleSendFeedback={handleSendFeedback}
        showSlot3Modal={showSlot3Modal}
        setShowSlot3Modal={setShowSlot3Modal}
        spotlightStep={spotlightStep}
        setSpotlightStep={setSpotlightStep}
        finishTutorial={finishTutorial}
        slot1InputRef={slot1InputRef}
        phoneScreenRef={phoneScreenRef}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        showToast={showToast}
      />

      {/* Global Menu Popup (For views other than main) */}
      <MenuPopup
        isOpen={isMenuOpen && view !== "main"}
        onClose={() => setIsMenuOpen(false)}
        currentView={view}
        onNavigate={setView}
        canLeaveFeedback={canLeaveFeedback}
        slot3Unlocked={slot3Unlocked}
        onOpenFeedback={() => setShowFeedbackModal(true)}
        onBlockedFeedbackClick={handleBlockedFeedbackClick}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onRestartTutorial={() => {
          setIsMenuOpen(false)
          restartTutorial()
        }}
        className="absolute top-[140px] right-5"
      />
    </AppLayout>
  )
}
