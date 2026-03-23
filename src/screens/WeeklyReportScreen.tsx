// MBW-NEW: Weekly Report screen — shown after every 7th day.
// Displays review breakdown, featured reviews, and the updated rolling star rating.
// Week 1 shows a tutorial intro instead of review data (no reviews during Week 1).
import { useGameStore } from '../store/gameStore'

function StarBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="star-bar">
      <div className="star-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function WeeklyReportScreen() {
  const { gameSave, endWeek, goToScreen, pendingEvent } = useGameStore()

  // completedDay = dayNumber - 1 (day that just ended before shop)
  const completedDay = gameSave.dayNumber - 1
  const completedWeek = Math.ceil(completedDay / 7)
  const isWeek1End = completedWeek === 1

  const reviews = gameSave.currentWeekReviews

  // Compute weekly stats from current week's reviews
  const totalReviews = reviews.length
  const weeklyAverage =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.stars, 0) / totalReviews
      : 0

  const starCounts: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  for (const r of reviews) {
    if (r.stars >= 1 && r.stars <= 5) starCounts[r.stars - 1]!++
  }

  // Featured reviews: all regulars + up to 2 named NPCs, sorted by extremity
  const regularReviews = reviews.filter((r) => r.isRegular)
  const namedNpcReviews = reviews
    .filter((r) => !r.isRegular && r.customerName)
    .sort((a, b) => Math.abs(a.stars - 3) > Math.abs(b.stars - 3) ? -1 : 1)
    .slice(0, 2)
  const featuredReviews = [...regularReviews, ...namedNpcReviews]

  // Previous week's average for trend arrow
  const prevHistory = gameSave.weeklyHistory
  const lastWeekAvg = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1]!.averageRating : null

  // Show this week's average as the projected rating; endWeek() computes the true rolling average
  const projectedRating = weeklyAverage

  const trendUp = lastWeekAvg !== null && weeklyAverage > lastWeekAvg
  const trendDown = lastWeekAvg !== null && weeklyAverage < lastWeekAvg

  function handleStartNextWeek() {
    endWeek()
    if (pendingEvent) {
      goToScreen('EVENT_NOTICE')
    } else {
      goToScreen('DAY_IN_PROGRESS')
    }
  }

  // MBW-NEW: Week 1 end — show tutorial intro to ratings system
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

      {/* This week's average */}
      <div className="weekly-rating-headline">
        <span className="weekly-rating-stars">
          {'★'.repeat(Math.round(weeklyAverage))}{'☆'.repeat(5 - Math.round(weeklyAverage))}
        </span>
        <span className="weekly-rating-number">
          {totalReviews > 0 ? weeklyAverage.toFixed(1) : '—'}
        </span>
        <span className="weekly-rating-label">This week</span>
      </div>

      {/* Star breakdown */}
      {totalReviews > 0 && (
        <div className="star-breakdown">
          {([5, 4, 3, 2, 1] as const).map((s) => (
            <div key={s} className="star-breakdown-row">
              <span className="star-breakdown-label">{'★'.repeat(s)}</span>
              <StarBar count={starCounts[s - 1]!} total={totalReviews} />
              <span className="star-breakdown-count">{starCounts[s - 1]}</span>
            </div>
          ))}
          <p className="star-breakdown-total">{totalReviews} review{totalReviews !== 1 ? 's' : ''} this week</p>
        </div>
      )}

      {totalReviews === 0 && (
        <p className="weekly-no-reviews">No reviews this week.</p>
      )}

      {/* Featured review cards */}
      {featuredReviews.length > 0 && (
        <div className="weekly-featured-reviews">
          {featuredReviews.map((r) => (
            <div
              key={r.id}
              className={`review-card ${r.isRegular ? 'review-card-regular' : ''}`}
            >
              <div className="review-header">
                <span className="review-name">{r.customerName ?? 'Anonymous'}</span>
                <span className="review-stars">
                  {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                </span>
              </div>
              {r.text && <p className="review-text">"{r.text}"</p>}
              <p className="review-meta">Day {r.day}</p>
            </div>
          ))}
        </div>
      )}

      {/* Overall rating with trend */}
      <div className="weekly-overall-rating">
        <span className="weekly-overall-label">Overall rating</span>
        <span className="weekly-overall-value">
          ★ {projectedRating > 0 ? projectedRating.toFixed(1) : '—'}
        </span>
        {trendUp && <span className="weekly-trend weekly-trend-up">↑</span>}
        {trendDown && <span className="weekly-trend weekly-trend-down">↓</span>}
        {!trendUp && !trendDown && lastWeekAvg !== null && (
          <span className="weekly-trend">→</span>
        )}
      </div>

      <button className="weekly-report-cta" onClick={handleStartNextWeek}>
        Start Week {completedWeek + 1}
      </button>
    </div>
  )
}
