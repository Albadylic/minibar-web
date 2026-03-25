// MBW-38: Between-day shop screen
// MBW-40: Purchase logic wired to purchaseUpgrade store action
// MBW-61: End-of-day review card (now shows featured review from ReviewSystem)
// MBW-149: One tier per day limit — purchasedToday blocks re-buys until next day
// MBW-177: Two-tab shop — Upgrades (rotating 3/day) + Staff (always visible)
// MBW-178: Upgrade rotation gated by minDay; Day 2 always shows Fireplace + Candles
// MBW-NEW: Routes to WEEKLY_REPORT at end of every 7th day
import { useGameStore } from '../store/gameStore'
import { useDayResultStore } from '../store/dayResultStore'
import { useHudStore } from '../store/hudStore'
import { UPGRADES, UPGRADES_BY_ID, type UpgradeConfig } from '../config/upgrades'
import { FINANCES_CONFIG } from '../config/finances'
import { rollNextDayEvent } from '../config/events'
import { POWERUP_CONFIGS } from '../config/powerups'
import { getPendingTutorials } from '../config/tutorials'
import {
  ENTERTAINER_CONFIGS,
  XP_GENEROUS_BONUS,
  XP_ADEQUATE_BONUS,
  ADEQUATE_TIP_LIKELIHOOD_BONUS,
  GENEROUS_TIP_LIKELIHOOD_BONUS,
  NO_TIP_PENALTY,
  MIN_LIKELIHOOD,
  MAX_LIKELIHOOD,
  computeNewLevel,
} from '../config/entertainers'
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
  const { goToScreen, gameSave, purchaseUpgrade, updateSave, setPendingEvent, purchasePowerup, sellUpgrade, downgradeUpgrade, fireStaff, checkBurglary, burglaryNotification, clearBurglaryNotification, burglaryCheckedForDay } = useGameStore()
  const completedDay = gameSave.dayNumber - 1
  const upcomingDay = gameSave.dayNumber
  const lastResult = useDayResultStore((s) => s.lastResult)
  const tipPrompt = useHudStore((s) => s.tipPrompt)

  // MBW-120: Resolve entertainer tip on the shop screen (deferred from end-of-day)
  function handleTipChoice(choice: 0 | 1 | 2 | 3) {
    if (!tipPrompt) return
    const EMOJIS = ['😁', '😊', '😢', '😠']
    setTipEmoji(EMOJIS[choice]!)
    const amount = tipPrompt.options[choice] ?? 0
    const entertainerId = tipPrompt.entertainerId as 'jinx' | 'roland' | 'melody'
    const cfg = ENTERTAINER_CONFIGS[entertainerId]
    const current = gameSave.entertainers[entertainerId]
    let xpBonus = 0
    let likelihoodDelta = -NO_TIP_PENALTY
    switch (choice) {
      case 0: xpBonus = XP_GENEROUS_BONUS; likelihoodDelta = GENEROUS_TIP_LIKELIHOOD_BONUS; break
      case 1: xpBonus = XP_ADEQUATE_BONUS; likelihoodDelta = ADEQUATE_TIP_LIKELIHOOD_BONUS; break
      case 2: likelihoodDelta = 0; break
      case 3: break
    }
    const newXp = current.xp + cfg.xpPerPerformance + xpBonus
    updateSave({
      coins: gameSave.coins - amount,
      entertainers: {
        ...gameSave.entertainers,
        [entertainerId]: {
          returnLikelihood: Math.max(MIN_LIKELIHOOD, Math.min(MAX_LIKELIHOOD, current.returnLikelihood + likelihoodDelta)),
          level: computeNewLevel(newXp),
          xp: newXp,
        },
      },
    })
    setTimeout(() => {
      useHudStore.setState({ tipPrompt: null })
    }, 1000)
  }

  // MBW-NEW: Run burglary check once per day on shop mount
  const completedDayForBurglary = gameSave.dayNumber - 1
  if (burglaryCheckedForDay < completedDayForBurglary) {
    checkBurglary()
  }

  const [tipEmoji, setTipEmoji] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ShopTab>('upgrades')
  const [confirmAction, setConfirmAction] = useState<{
    label: string; coins: number; onConfirm: () => void
  } | null>(null)
  const achievementSummary = useHudStore((s) => s.pendingAchievementSummary)
  const [purchasedToday, setPurchasedToday] = useState<Set<string>>(new Set())

  const shopUpgrades = useMemo(
    () => pickShopUpgrades(UPGRADES, gameSave.upgrades, upcomingDay, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const staffUpgrades = useMemo(() => pickStaffUpgrades(UPGRADES), [])

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

  // MBW-NEW: Sell/downgrade panel for each owned non-staff upgrade
  function renderOwnedUpgradeManage(upgradeId: string) {
    const owned = gameSave.upgrades[upgradeId]
    if (!owned) return null
    const config = UPGRADES_BY_ID[upgradeId]
    if (!config || config.category === 'staff') return null

    const tier1Cost = config.tiers[0]?.cost ?? 0
    const sellRefund = Math.floor(tier1Cost * FINANCES_CONFIG.SELL_REFUND_RATE)
    const canDowngrade = owned.tier >= 2
    const downgradeTierCost = canDowngrade ? (config.tiers[owned.tier - 1]?.cost ?? 0) : 0
    const downgradeRefund = Math.floor(downgradeTierCost * FINANCES_CONFIG.SELL_REFUND_RATE)

    return (
      <div key={upgradeId} className="upgrade-manage-row">
        <span className="upgrade-manage-name">{config.name} (T{owned.tier})</span>
        <div className="upgrade-manage-btns">
          {canDowngrade && (
            <button
              className="shop-downgrade-btn"
              onClick={() =>
                setConfirmAction({
                  label: `Downgrade ${config.name} to T${owned.tier - 1}?`,
                  coins: downgradeRefund,
                  onConfirm: () => { downgradeUpgrade(upgradeId); setConfirmAction(null) },
                })
              }
            >
              Downgrade +🪙{downgradeRefund}
            </button>
          )}
          <button
            className="shop-sell-btn"
            onClick={() =>
              setConfirmAction({
                label: `Sell ${config.name}?`,
                coins: sellRefund,
                onConfirm: () => { sellUpgrade(upgradeId); setConfirmAction(null) },
              })
            }
          >
            Sell +🪙{sellRefund}
          </button>
        </div>
      </div>
    )
  }

  // MBW-NEW: Staff card with Fire button
  function renderStaffCard(upgrade: UpgradeConfig) {
    const owned = gameSave.upgrades[upgrade.id]
    const currentTier = owned?.tier ?? 0
    const isMaxed = currentTier >= upgrade.maxTier
    const tierConfig = upgrade.tiers[currentTier]
    const boughtToday = purchasedToday.has(upgrade.id)
    const canAfford = tierConfig ? gameSave.coins >= tierConfig.cost : false
    const isHired = currentTier > 0

    return (
      <div key={upgrade.id} className={`upgrade-card ${isMaxed ? 'upgrade-maxed' : ''}`}>
        <div className="upgrade-name">
          <span>{upgrade.name}</span>
          {upgrade.maxTier > 1 && (
            <span className="upgrade-tier">{isMaxed ? `★ Maxed` : currentTier > 0 ? `Level ${currentTier}` : 'Not hired'}</span>
          )}
        </div>
        {isHired && (
          <button
            className="shop-fire-btn"
            onClick={() =>
              setConfirmAction({
                label: `Fire ${upgrade.name}?`,
                coins: 0,
                onConfirm: () => { fireStaff(upgrade.id); setConfirmAction(null) },
              })
            }
          >
            Fire
          </button>
        )}
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

  // MBW-NEW: Route to WeeklyReport at end of every 7th completed day
  const isEndOfWeek = completedDay > 0 && completedDay % 7 === 0

  function handleStartNext() {
    const event = rollNextDayEvent(gameSave)
    setPendingEvent(event)
    if (event) {
      updateSave({ daysSinceLastGameDay: 0 })
    } else {
      updateSave({ daysSinceLastGameDay: gameSave.daysSinceLastGameDay + 1 })
    }

    if (isEndOfWeek) {
      goToScreen('WEEKLY_REPORT')
    } else {
      goToScreen('RESTOCK')
    }
  }

  // MBW-NEW: Featured review from the new review system
  const featuredReview = lastResult?.featuredReview ?? null
  const reviewCount = lastResult?.reviewCount ?? 0
  const showReviews = gameSave.dayNumber > 8  // Week 2+ only (dayNumber already incremented)

  return (
    <div className="screen shop-screen">
      {/* MBW-120: Entertainer tip — resolved here after day ends, before shop is usable */}
      {tipPrompt && (
        <div className="tip-overlay">
          <div className="tip-card">
            <p className="tip-title">
              {tipPrompt.entertainerName} asks you for 🪙{tipPrompt.options[1]} for {tipPrompt.pronoun} performance
            </p>
            {tipEmoji ? (
              <div className="tip-emoji">{tipEmoji}</div>
            ) : (
              <div className="tip-options">
                {tipPrompt.options.map((amount, i) => (
                  <button
                    key={i}
                    className={`tip-btn tip-btn-${i}`}
                    disabled={amount > gameSave.coins}
                    onClick={() => handleTipChoice(i as 0 | 1 | 2 | 3)}
                  >
                    <span className="tip-amount">{amount > 0 ? `🪙 ${amount}` : 'Nothing'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MBW-NEW: Burglary notification — shown before shop is usable */}
      {!tipPrompt && burglaryNotification && (
        <div className="burglary-overlay">
          <div className="burglary-card">
            <h3>Overnight Burglary!</h3>
            <p>
              Your bar was broken into. <strong>{burglaryNotification.upgradeName}</strong> was damaged.
            </p>
            {burglaryNotification.covered ? (
              <p className="burglary-insured">Your insurance covered the loss — coins refunded.</p>
            ) : (
              <p className="burglary-uninsured">You had no insurance. No refund.</p>
            )}
            <button onClick={clearBurglaryNotification}>OK</button>
          </div>
        </div>
      )}

      {/* MBW-NEW: Confirm sell/downgrade/fire overlay */}
      {!tipPrompt && !burglaryNotification && confirmAction && (
        <div className="confirm-overlay">
          <div className="confirm-card">
            <p>{confirmAction.label}</p>
            {confirmAction.coins > 0 && <p className="confirm-refund">You will receive 🪙{confirmAction.coins}</p>}
            <div className="confirm-actions">
              <button onClick={confirmAction.onConfirm}>Confirm</button>
              <button onClick={() => setConfirmAction(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* MBW-NEW: Achievement summary overlay — shown after earning achievements in-day */}
      {!tipPrompt && !burglaryNotification && !confirmAction && achievementSummary && achievementSummary.length > 0 && (
        <div className="achievement-summary-overlay">
          <div className="achievement-summary-card">
            <h3>Achievements Earned!</h3>
            <div className="achievement-summary-list">
              {achievementSummary.map((a) => (
                <div key={a.id} className="achievement-summary-item">
                  <span>{a.tier === 'gold' ? '🥇' : a.tier === 'silver' ? '🥈' : '🥉'}</span>
                  <span className="ach-summary-name">{a.name}</span>
                </div>
              ))}
            </div>
            <button onClick={() => useHudStore.setState({ pendingAchievementSummary: null })}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* MBW-173: Tutorial overlay — shown one at a time before the shop is usable */}
      {!tipPrompt && !burglaryNotification && !confirmAction && !achievementSummary?.length && activeTutorial && (
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
        {gameSave.displayedRating > 0 ? (
          <span>★ {gameSave.displayedRating.toFixed(1)}</span>
        ) : (
          <span className="rating-new-badge">NEW</span>
        )}
        <span>🪙 {gameSave.coins} coins</span>
      </div>

      {/* MBW-NEW: Featured review from the review system (Week 2+) */}
      {showReviews && featuredReview && (
        <div className={`review-card ${featuredReview.isRegular ? 'review-card-regular' : ''}`}>
          <div className="review-header">
            <span className="review-name">
              {featuredReview.customerName ?? 'Anonymous'}
            </span>
            <span className="review-stars">
              {'★'.repeat(featuredReview.stars)}{'☆'.repeat(5 - featuredReview.stars)}
            </span>
          </div>
          {featuredReview.text && (
            <p className="review-text">"{featuredReview.text}"</p>
          )}
          {reviewCount > 1 && (
            <p className="review-more">...and {reviewCount - 1} other review{reviewCount > 2 ? 's' : ''} today</p>
          )}
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
          {/* MBW-NEW: Manage owned upgrades — sell or downgrade */}
          {Object.keys(gameSave.upgrades).some((id) => {
            const cfg = UPGRADES_BY_ID[id]
            return cfg && cfg.category !== 'staff'
          }) && (
            <div className="shop-manage-section">
              <p className="shop-manage-title">Manage Owned</p>
              {Object.keys(gameSave.upgrades).map(renderOwnedUpgradeManage)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="shop-staff">
          {staffUpgrades.map(renderStaffCard)}
        </div>
      )}

      {/* MBW-NEW: Powerup shop section */}
      {gameSave.powerups.unlockedTypes.length > 0 && (
        <div className="shop-powerups">
          <p className="shop-powerups-title">Powerups</p>
          {POWERUP_CONFIGS.filter((p) => gameSave.powerups.unlockedTypes.includes(p.type)).map((p) => {
            const qty = gameSave.powerups.inventory[p.type] ?? 0
            return (
              <div key={p.type} className="shop-powerup-row">
                <span className="shop-powerup-label">{p.emoji} {p.label}</span>
                <span className="shop-powerup-stock">×{qty}</span>
                <button
                  className="shop-powerup-buy"
                  disabled={gameSave.coins < p.buyPrice}
                  onClick={() => purchasePowerup(p.type)}
                >
                  🪙{p.buyPrice}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="shop-bottom-actions">
        <button className="shop-achievements-btn" onClick={() => goToScreen('ACHIEVEMENTS')}>
          🎖️ Achievements
        </button>
        <button onClick={handleStartNext}>
          {isEndOfWeek ? 'Weekly Report' : `Start Day ${gameSave.dayNumber}`}
        </button>
      </div>
    </div>
  )
}
