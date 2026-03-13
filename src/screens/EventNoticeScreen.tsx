// MBW-84: Pre-day event notification — shown before any special day event
import { useGameStore } from '../store/gameStore'
import { EVENT_CONFIGS } from '../config/events'

export function EventNoticeScreen() {
  const { goToScreen, gameSave, pendingEvent } = useGameStore()
  const cfg = pendingEvent ? EVENT_CONFIGS[pendingEvent] : null

  if (!cfg) {
    // Shouldn't happen — but safe fallback
    goToScreen('DAY_IN_PROGRESS')
    return null
  }

  return (
    <div className="screen game-day-notice">
      <div className="notice-banner">{cfg.emoji} {cfg.name.toUpperCase()}</div>
      <h2>Day {gameSave.dayNumber}</h2>
      <p className="notice-flavour">{cfg.flavour}</p>
      <ul className="notice-tips">
        {cfg.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <button onClick={() => goToScreen('DAY_IN_PROGRESS')}>Start Day</button>
    </div>
  )
}
