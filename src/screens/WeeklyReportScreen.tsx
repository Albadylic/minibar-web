// MBW-NEW: Weekly Report screen — shown after every 7th day.
// Displays review breakdown, featured reviews, and the updated rolling star rating.
// Week 1 shows a tutorial intro instead of review data (no reviews during Week 1).
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

function ReviewCard({ r, showPagination, page, total, onPrev, onNext }: {
  r: { customerName?: string | null; isRegular: boolean; stars: number; text?: string | null; day: number }
  showPagination: boolean
  page: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="weekly-featured-reviews">
      <div className={`review-card ${r.isRegular ? 'review-card-regular' : ''}`}>
        <div className="review-header">
          <span className="review-name">{r.customerName ?? 'Anonymous'}</span>
          <span className="review-stars">
            {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
          </span>
        </div>
        {r.text && <p className="review-text">"{r.text}"</p>}
        <p className="review-meta">Day {r.day}</p>
      </div>
      {showPagination && (
        <div className="review-pagination">
          <button className="review-page-btn" disabled={page === 0} onClick={onPrev}>‹</button>
          <span className="review-page-indicator">{page + 1} / {total}</span>
          <button className="review-page-btn" disabled={page === total - 1} onClick={onNext}>›</button>
        </div>
      )}
    </div>
  )
}

export function WeeklyReportScreen() {
  const { gameSave, endWeek, goToScreen } = useGameStore()

  const completedDay = gameSave.dayNumber - 1
  const completedWeek = Math.ceil(completedDay / 7)
  const isWeek1End = completedWeek === 1

  const reviews = gameSave.currentWeekReviews

  const totalReviews = reviews.length
  const weeklyAverage =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.stars, 0) / totalReviews
      : 0

  const starCounts: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  for (const r of reviews) {
    if (r.stars >= 1 && r.stars <= 5) starCounts[r.stars - 1]!++
  }

  // Featured reviews: regulars first, then most extreme anonymous reviews
  const regularReviews = reviews.filter((r) => r.isRegular)
  const extremeReviews = reviews
    .filter((r) => !r.isRegular && r.customerName)
    .sort((a, b) => Math.abs(b.stars - 3) - Math.abs(a.stars - 3))
    .slice(0, 2)
  const allReviews = [...regularReviews, ...extremeReviews]

  // Spotlight: one review shown by default — first regular, or most extreme anon
  const spotlightReview = allReviews[0] ?? null

  const [showAll, setShowAll] = useState(false)
  const [reviewPage, setReviewPage] = useState(0)

  const prevHistory = gameSave.weeklyHistory
  const lastWeekAvg = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1]!.averageRating : null
  const trendUp = lastWeekAvg !== null && weeklyAverage > lastWeekAvg
  const trendDown = lastWeekAvg !== null && weeklyAverage < lastWeekAvg

  function handleStartNextWeek() {
    endWeek()
    goToScreen('WEEKLY_BILL')
  }

  if (isWeek1End) {
    return (
      <div className="screen weekly-report-screen">
        <h2>End of Week 1</h2>
        <div className="weekly-report-intro">
          <p className="weekly-report-intro-headline">Reviews are now open.</p>
          <p>
            From Week 2 onward, customers will start leaving reviews based on how they were served.
            Unserved customers, brawl victims, and wrong orders generate negative reviews. Fast,
            correct service earns positive ones.
          </p>
          <p>
            Your overall rating updates at the end of each week. A higher rating brings more
            customers and a wealthier crowd — but also higher expectations.
          </p>
          <p>
            Keep an eye out for <strong>green sprites</strong> — those are your regulars. They
            always leave a review after every visit.
          </p>
        </div>
        <button className="weekly-report-cta" onClick={handleStartNextWeek}>
          Start Week 2
        </button>
      </div>
    )
  }

  return (
    <div className="screen weekly-report-screen">
      <h2>Week {completedWeek} Report</h2>

      {/* Stats row: breakdown column + average */}
      {totalReviews > 0 ? (
        <div className="weekly-stats-row">
          <div className="star-breakdown">
            {([5, 4, 3, 2, 1] as const).map((s) => (
              <div key={s} className="star-breakdown-row">
                <span className="star-breakdown-label">{s}★</span>
                <span className="star-breakdown-count">{starCounts[s - 1]}</span>
              </div>
            ))}
            <p className="star-breakdown-total">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
          </div>
          <div className="weekly-average-block">
            <span className="weekly-average-number">{weeklyAverage.toFixed(1)}</span>
            <span className="weekly-average-label">avg this week</span>
            {trendUp && <span className="weekly-trend weekly-trend-up">↑</span>}
            {trendDown && <span className="weekly-trend weekly-trend-down">↓</span>}
            {!trendUp && !trendDown && lastWeekAvg !== null && <span className="weekly-trend">→</span>}
          </div>
        </div>
      ) : (
        <p className="weekly-no-reviews">No reviews this week.</p>
      )}

      {/* Review slot: spotlight by default, full paginated list when expanded */}
      {allReviews.length > 0 && (() => {
        const displayReviews = showAll ? allReviews : [spotlightReview!]
        const r = displayReviews[reviewPage]!
        return (
          <>
            <ReviewCard
              r={r}
              showPagination={showAll && allReviews.length > 1}
              page={reviewPage}
              total={allReviews.length}
              onPrev={() => setReviewPage((p) => p - 1)}
              onNext={() => setReviewPage((p) => p + 1)}
            />
            <button
              className="weekly-read-reviews-btn"
              onClick={() => { setShowAll((v) => !v); setReviewPage(0) }}
            >
              {showAll ? '← Back' : `Read all reviews (${allReviews.length})`}
            </button>
          </>
        )
      })()}

      {/* Overall rating */}
      <div className="weekly-overall-rating">
        <span className="weekly-overall-label">Overall rating</span>
        <span className="weekly-overall-value">
          ★ {weeklyAverage > 0 ? weeklyAverage.toFixed(1) : '—'}
        </span>
      </div>

      <button className="weekly-report-cta" onClick={handleStartNextWeek}>
        Start Week {completedWeek + 1}
      </button>
    </div>
  )
}
