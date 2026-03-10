import { useGameStore } from '../store/gameStore'

export function GameOverScreen() {
  const { gameSave, resetSave, goToScreen } = useGameStore()

  return (
    <div className="screen game-over-screen">
      <h2>Game Over</h2>
      <p>Days survived: {gameSave.dayNumber}</p>
      <p>Star rating: {gameSave.starRating.toFixed(1)}</p>
      <button
        onClick={() => {
          resetSave()
          goToScreen('DAY_IN_PROGRESS')
        }}
      >
        Play Again
      </button>
      <button onClick={() => goToScreen('MAIN_MENU')}>Main Menu</button>
    </div>
  )
}
