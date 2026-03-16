// MBW-38: Between-day shop screen
// MBW-40: Purchase logic wired to purchaseUpgrade store action
// MBW-61: End-of-day Yelp-style review card
// MBW-149: One tier per day limit — purchasedToday blocks re-buys until next day
// MBW-177: Two-tab shop — Upgrades (rotating 3/day) + Staff (always visible)
// MBW-178: Upgrade rotation gated by minDay; Day 2 always shows Fireplace + Candles
import { useGameStore } from '../store/gameStore'
import { useDayResultStore } from '../store/dayResultStore'
import { selectReview } from '../engine/systems/reviewSystem'
import { UPGRADES, type UpgradeConfig } from '../config/upgrades'
import { rollNextDayEvent } from '../config/events'
import { getPendingTutorials } from '../config/tutorials'
import { useMemo, useState } from 'react'

// Deterministic shuffle seeded by day number — same upgrades always show for the same day
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

// MBW-178: Pick rotating upgrades for the Upgrades tab.
// Staff-category upgrades are excluded — they live in the Staff tab.
// minDay gates which upgrades are available for the upcoming day.
// Day 2 special rule: always include Fireplace + Candles if not yet maxed.
function pickShopUpgrades(
  upgrades: UpgradeConfig[],
  ownedUpgrades: Record<string, { tier: number; purchasedOnDay: number }>,
  upcomingDay: number,
  count: number,
): UpgradeConfig[] {
  const rotationPool = upgrades.filter((u) => {
    if (u.category === 'staff') return false
    if (u.minDay > upcomingDay) return false
    const owned = ownedUpgrades[u.id]
    return !owned || owned.tier < u.maxTier
  })

  if (rotationPool.length <= count) return rotationPool

  // MBW-178: Day 2 forces Fireplace and Candles into the first two slots
  if (upcomingDay === 2) {
    const forced = rotationPool.filter((u) => u.id === 'fireplace' || u.id === 'candles')
    const rest = rotationPool.filter((u) => u.id !== 'fireplace' && u.id !== 'candles')
    const remaining = seededShuffle(rest, upcomingDay).slice(0, count - forced.length)
    return [...forced, ...remaining].slice(0, count)
  }

  return seededShuffle(rotationPool, upcomingDay).slice(0, count)
}

function pickStaffUpgrades(upgrades: UpgradeConfig[]): UpgradeConfig[] {
  return upgrades.filter((u) => u.category === 'staff')
}

type ShopTab = 'upgrades' | 'staff'

export function ShopScreen() {
  const { goToScreen, gameSave, purchaseUpgrade, updateSave, setPendingEvent } = useGameStore()
  const completedDay = gameSave.dayNumber - 1
  const upcomingDay = gameSave.dayNumber
  const lastResult = useDayResultStore((s) => s.lastResult)

  // MBW-177: Tab state
  const [activeTab, setActiveTab] = useState<ShopTab>('upgrades')

  // MBW-149: Track upgrades purchased this shop visit (one tier per upgrade per day)
  const [purchasedToday, setPurchasedToday] = useState<Set<string>>(new Set())

  // Select a review once when the screen mounts (stable across re-renders)
  const review = useMemo(
    () => (lastResult ? selectReview(lastResult) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // MBW-177/178: Rotating upgrades for Upgrades tab — 3/day, day-gated, Day 2 forced rule
  const shopUpgrades = useMemo(
    () => pickShopUpgrades(UPGRADES, gameSave.upgrades, upcomingDay, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // MBW-177: Staff upgrades — always visible, never rotate
  const staffUpgrades = useMemo(() => pickStaffUpgrades(UPGRADES), [])

  // MBW-173: Tutorials pending for this upcoming day (computed once on mount)
  const pendingTutorials = useMemo(
    () => getPendingTutorials(upcomingDay, gameSave.shownTutorials, gameSave.upgrades),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [tutorialIndex, setTutorialIndex] = useState(0)
  const activeTutorial = pendingTutorials[tutorialIndex] ?? null

  function dismissTutorial() {
    if (!activeTutorial) return
    updateSave({ shownTutorials: [...gameSave.shownTutorials, activeTutorial.id] })
    setTutorialIndex((i) => i + 1)
  }

  function handlePurchase(upgradeId: string) {
    purchaseUpgrade(upgradeId)
    setPurchasedToday((prev) => new Set(prev).add(upgradeId))
  }

  function renderUpgradeCard(upgrade: UpgradeConfig) {
    const owned = gameSave.upgrades[upgrade.id]
    const currentTier = owned?.tier ?? 0
    const isMaxed = currentTier >= upgrade.maxTier
    const tierConfig = upgrade.tiers[currentTier]
    // MBW-149: Disable if already bought one tier today
    const boughtToday = purchasedToday.has(upgrade.id)
    const canAfford = tierConfig ? gameSave.coins >= tierConfig.cost : false

    return (
      <div key={upgrade.id} className={`upgrade-card ${isMaxed ? 'upgrade-maxed' : ''}`}>
        <div className="upgrade-name">
          <span>{upgrade.name}</span>
          {upgrade.maxTier > 1 && (
            <span className="upgrade-tier">{isMaxed ? `★ Maxed` : `Level ${currentTier}`}</span>
          )}
        </div>
        {isMaxed ? (
          <div className="upgrade-owned">✓ Maxed</div>
        ) : tierConfig ? (
          <div className="upgrade-card-body">
            <div className="upgrade-desc">{tierConfig.description}</div>
            <button
              className="upgrade-buy"
              disabled={!canAfford || boughtToday}
              onClick={() => handlePurchase(upgrade.id)}
              title={boughtToday ? 'One purchase per upgrade per day' : undefined}
            >
              🪙 {tierConfig.cost}
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="screen shop-screen">
      {/* MBW-173: Tutorial overlay — shown one at a time before the shop is usable */}
      {activeTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-card">
            <h3 className="tutorial-title">{activeTutorial.title}</h3>
            <p className="tutorial-body">{activeTutorial.body}</p>
            <button className="tutorial-dismiss" onClick={dismissTutorial}>Got it!</button>
          </div>
        </div>
      )}

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

      {/* MBW-177: Tab switcher */}
      <div className="shop-tabs">
        <button
          className={`shop-tab ${activeTab === 'upgrades' ? 'active' : ''}`}
          onClick={() => setActiveTab('upgrades')}
        >
          Upgrades
        </button>
        <button
          className={`shop-tab ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          Staff
        </button>
      </div>

      {activeTab === 'upgrades' && (
        <div className="shop-upgrades">
          {shopUpgrades.map(renderUpgradeCard)}
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="shop-staff">
          {staffUpgrades.map(renderUpgradeCard)}
        </div>
      )}

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
