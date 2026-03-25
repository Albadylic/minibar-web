// MBW-84: Pre-day event notification — shown before any special day event
// MBW-NEW: Also shows pre-day powerup selection when any pre-day powerups are unlocked
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useHudStore } from '../store/hudStore'
import { EVENT_CONFIGS } from '../config/events'
import { POWERUP_CONFIGS_BY_TYPE, PRE_DAY_POWERUPS } from '../config/powerups'
import type { PowerupType } from '../types/achievements'

export function EventNoticeScreen() {
  const { goToScreen, gameSave, pendingEvent, spendPowerup } = useGameStore()
  const cfg = pendingEvent ? EVENT_CONFIGS[pendingEvent] : null
  const [selectedPowerups, setSelectedPowerups] = useState<Set<PowerupType>>(new Set())

  const preDayAvailable = (PRE_DAY_POWERUPS as PowerupType[]).filter(
    (t) => gameSave.powerups.unlockedTypes.includes(t) && (gameSave.powerups.inventory[t] ?? 0) > 0,
  )

  // Fallback: no event and no powerups — skip straight to day
  if (!cfg && preDayAvailable.length === 0) {
    goToScreen('DAY_IN_PROGRESS')
    return null
  }

  function togglePowerup(type: PowerupType) {
    setSelectedPowerups((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function handleStartDay() {
    for (const type of selectedPowerups) {
      spendPowerup(type)
    }
    useHudStore.setState({ pendingPreDayPowerups: [...selectedPowerups] })
    goToScreen('DAY_IN_PROGRESS')
  }

  return (
    <div className="screen game-day-notice">
      {cfg ? (
        <>
          <div className="notice-banner">{cfg.emoji} {cfg.name.toUpperCase()}</div>
          <h2>Day {gameSave.dayNumber}</h2>
          <p className="notice-flavour">{cfg.flavour}</p>
          <ul className="notice-tips">
            {cfg.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </>
      ) : (
        <h2>Prepare for Day {gameSave.dayNumber}</h2>
      )}

      {preDayAvailable.length > 0 && (
        <div className="preday-powerups">
          <p className="preday-powerups-title">Power Up Before You Open</p>
          {preDayAvailable.map((type) => {
            const pcfg = POWERUP_CONFIGS_BY_TYPE[type]
            const qty = gameSave.powerups.inventory[type] ?? 0
            const selected = selectedPowerups.has(type)
            return (
              <button
                key={type}
                className={`preday-powerup-btn${selected ? ' selected' : ''}`}
                onClick={() => togglePowerup(type)}
              >
                {pcfg.emoji} {pcfg.label} <span className="preday-qty">×{qty} in stock</span>
              </button>
            )
          })}
        </div>
      )}

      <button onClick={handleStartDay}>Start Day</button>
    </div>
  )
}
