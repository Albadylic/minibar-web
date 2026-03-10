// MBW-84: Pre-day event notification — shown before Day starts when a Game Day is upcoming
import { useGameStore } from '../store/gameStore'

export function GameDayNoticeScreen() {
  const { goToScreen, gameSave } = useGameStore()

  return (
    <div className="screen game-day-notice">
      <div className="notice-banner">⚽ GAME DAY</div>
      <h2>Day {gameSave.dayNumber}</h2>
      <p className="notice-flavour">
        The local team is playing today. Expect rowdy fans — serve them fast or face the
        consequences.
      </p>
      <ul className="notice-tips">
        <li>Hooligans arrive in the Morning</li>
        <li>They leave for kick-off at Afternoon</li>
        <li>They return in force at Evening</li>
        <li>Ignore them and they&apos;ll start a brawl — tap them to eject</li>
      </ul>
      <button onClick={() => goToScreen('DAY_IN_PROGRESS')}>Start Day</button>
    </div>
  )
}
