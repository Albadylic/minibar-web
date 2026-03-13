// MBW-38: Between-day shop screen
// MBW-40: Purchase logic wired to purchaseUpgrade store action
// MBW-61: End-of-day Yelp-style review card
import { useGameStore } from '../store/gameStore'
import { useDayResultStore } from '../store/dayResultStore'
import { selectReview } from '../engine/systems/reviewSystem'
import { UPGRADES, type UpgradeConfig } from '../config/upgrades'
import { rollNextDayEvent } from '../config/events'
import { useMemo } from 'react'

// Deterministic shuffle seeded by day number — same 3 upgrades always show for the same day
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr]
  let s = (seed * 2654435761) >>> 0 // unsigned 32-bit hash
  for (let i = copy.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 13), 0x45d9f3b) >>> 0
    const j = s % (i + 1)
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

function pickShopUpgrades(
  upgrades: UpgradeConfig[],
  ownedUpgrades: Record<string, { tier: number; purchasedOnDay: number }>,
  dayNumber: number,
  count: number,
): UpgradeConfig[] {
  // Exclude fully maxed upgrades — nothing left to sell
  const available = upgrades.filter((u) => {
    const owned = ownedUpgrades[u.id]
    return !owned || owned.tier < u.maxTier
  })
  if (available.length <= count) return available
  return seededShuffle(available, dayNumber).slice(0, count)
}

export function ShopScreen() {
  const { goToScreen, gameSave, purchaseUpgrade, updateSave, setPendingEvent } = useGameStore()
  const completedDay = gameSave.dayNumber - 1
  const lastResult = useDayResultStore((s) => s.lastResult)

  // Select a review once when the screen mounts (stable across re-renders)
  const review = useMemo(
    () => (lastResult ? selectReview(lastResult) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // 3 upgrades available per day — deterministic per day number, excludes maxed upgrades
  const shopUpgrades = useMemo(
    () => pickShopUpgrades(UPGRADES, gameSave.upgrades, completedDay, 3),
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
        {shopUpgrades.map((upgrade) => {
          const owned = gameSave.upgrades[upgrade.id]
          const currentTier = owned?.tier ?? 0
          const isMaxed = currentTier >= upgrade.maxTier
          const tierConfig = upgrade.tiers[currentTier]
          const canAfford = tierConfig ? gameSave.coins >= tierConfig.cost : false

          return (
            <div key={upgrade.id} className={`upgrade-card ${isMaxed ? 'upgrade-maxed' : ''}`}>
              <div className="upgrade-name">
                {upgrade.name}
                {upgrade.maxTier > 1 && (
                  <span className="upgrade-tier"> {isMaxed ? `★${currentTier}` : `${currentTier}/${upgrade.maxTier}`}</span>
                )}
              </div>
              {isMaxed ? (
                <div className="upgrade-owned">✓ Maxed</div>
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

      <button onClick={() => {
        // MBW-83/84: Roll for Game Day event and update pity timer in save
        const event = rollNextDayEvent(gameSave)
        setPendingEvent(event)
        if (event) {
          updateSave({ daysSinceLastGameDay: 0 })
          goToScreen('EVENT_NOTICE')
        } else {
          updateSave({ daysSinceLastGameDay: gameSave.daysSinceLastGameDay + 1 })
          goToScreen('DAY_IN_PROGRESS')
        }
      }}>
        Start Day {gameSave.dayNumber}
      </button>
    </div>
  )
}
