import { useGameStore } from '../store/gameStore'

export function MainMenuScreen() {
  const { goToScreen, gameSave, resetSave } = useGameStore()
  const hasSave = gameSave.dayNumber > 1 || gameSave.stats.totalDaysPlayed > 0

  return (
    <div className="screen main-menu">
      <h1>🍻 Minibar</h1>
      <p>A medieval tavern management game</p>
      {hasSave && (
        <button onClick={() => goToScreen('DAY_IN_PROGRESS')}>
          Continue (Day {gameSave.dayNumber})
        </button>
      )}
      <button
        onClick={() => {
          resetSave()
          goToScreen('DAY_IN_PROGRESS')
        }}
      >
        New Game
      </button>
      <button onClick={() => goToScreen('BETWEEN_DAY_SHOP')}>
        Shop
      </button>
    </div>
  )
}
