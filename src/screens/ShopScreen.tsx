// MBW-38: Between-day shop screen
// MBW-40: Purchase logic wired to purchaseUpgrade store action
import { useGameStore } from '../store/gameStore'
import { UPGRADES } from '../config/upgrades'

export function ShopScreen() {
  const { goToScreen, gameSave, purchaseUpgrade } = useGameStore()
  const completedDay = gameSave.dayNumber - 1

  return (
    <div className="screen shop-screen">
      <h2>Day {completedDay} Complete</h2>
      <div className="day-summary">
        <span>⭐ {gameSave.starRating.toFixed(1)}</span>
        <span>🪙 {gameSave.coins} coins</span>
      </div>

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
