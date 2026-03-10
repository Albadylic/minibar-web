// MBW-38: Between-day shop screen
// MBW-40: Purchase logic wired to purchaseUpgrade store action
// MBW-61: End-of-day Yelp-style review card
import { useGameStore } from '../store/gameStore'
import { useDayResultStore } from '../store/dayResultStore'
import { selectReview } from '../engine/systems/reviewSystem'
import { UPGRADES } from '../config/upgrades'
import { useMemo } from 'react'

export function ShopScreen() {
  const { goToScreen, gameSave, purchaseUpgrade } = useGameStore()
  const completedDay = gameSave.dayNumber - 1
  const lastResult = useDayResultStore((s) => s.lastResult)

  // Select a review once when the screen mounts (stable across re-renders)
  const review = useMemo(
    () => (lastResult ? selectReview(lastResult) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="screen shop-screen">
      <h2>Day {completedDay} Complete</h2>
      <div className="day-summary">
        <span>⭐ {gameSave.starRating.toFixed(1)}</span>
        <span>🪙 {gameSave.coins} coins</span>
      </div>

      {review && (
        <div className="review-card">
          <div className="review-header">
            <span className="review-name">{review.name}</span>
            <span className="review-stars">{'★'.repeat(review.reviewStars)}{'☆'.repeat(5 - review.reviewStars)}</span>
          </div>
          <p className="review-text">"{review.messages[0]}"</p>
        </div>
      )}

      <div className="shop-upgrades">
        {UPGRADES.map((upgrade) => {
          const owned = gameSave.upgrades[upgrade.id]
          const currentTier = owned?.tier ?? 0
          const isMaxed = currentTier >= upgrade.maxTier
          const tierConfig = upgrade.tiers[currentTier]
          const canAfford = tierConfig ? gameSave.coins >= tierConfig.cost : false

          return (
            <div key={upgrade.id} className={`upgrade-card ${isMaxed ? 'upgrade-maxed' : ''}`}>
              <div className="upgrade-name">{upgrade.name}</div>
              {isMaxed ? (
                <div className="upgrade-owned">✓ Owned</div>
              ) : tierConfig ? (
                <>
                  <div className="upgrade-desc">{tierConfig.description}</div>
                  <button
                    className="upgrade-buy"
                    disabled={!canAfford}
                    onClick={() => purchaseUpgrade(upgrade.id)}
                  >
                    🪙 {tierConfig.cost}
                  </button>
                </>
              ) : null}
            </div>
          )
        })}
      </div>

      <button onClick={() => goToScreen('DAY_IN_PROGRESS')}>
        Start Day {gameSave.dayNumber}
      </button>
    </div>
  )
}
