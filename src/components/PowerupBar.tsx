// MBW-NEW: In-game powerup bar — always rendered at bottom of DayScreen
// Shows 3 slots: Bouncer Rush, Time Freeze, Serve All
// States: locked (not unlocked), empty (0 in inventory), used (used today), ready
import { useGameStore } from '../store/gameStore'
import { useHudStore } from '../store/hudStore'
import { gameLoop } from '../engine/gameLoop'
import { POWERUP_CONFIGS_BY_TYPE, IN_GAME_POWERUPS } from '../config/powerups'
import type { PowerupType } from '../types/achievements'

export function PowerupBar() {
  const powerups = useGameStore((s) => s.gameSave.powerups)
  const usedToday = useHudStore((s) => s.inGamePowerupUsedToday)

  return (
    <div className="powerup-bar">
      {(IN_GAME_POWERUPS as PowerupType[]).map((type) => {
        const cfg = POWERUP_CONFIGS_BY_TYPE[type]
        const isUnlocked = powerups.unlockedTypes.includes(type)
        const qty = powerups.inventory[type] ?? 0
        const isUsed = usedToday[type] === true
        const isReady = isUnlocked && qty > 0 && !isUsed

        let slotClass = 'powerup-slot'
        if (!isUnlocked) slotClass += ' powerup-slot--locked'
        else if (isUsed) slotClass += ' powerup-slot--used'
        else if (qty === 0) slotClass += ' powerup-slot--empty'
        else slotClass += ' powerup-slot--ready'

        return (
          <button
            key={type}
            className={slotClass}
            disabled={!isReady}
            onClick={() => { gameLoop.activatePowerup(type) }}
            title={cfg.label}
          >
            <span className="powerup-slot-emoji">{isUnlocked ? cfg.emoji : '🔒'}</span>
            {isUnlocked && (
              <span className="powerup-badge">
                {isUsed ? '✓' : `×${qty}`}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
