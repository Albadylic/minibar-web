// MBW-6: State machine — maps GameScreen to the correct React screen component
// MBW-12: Viewport scaling applied here so all screens letterbox uniformly
import { useGameStore } from './store/gameStore'
import { useViewportScale } from './hooks/useViewportScale'
import { MainMenuScreen } from './screens/MainMenuScreen'
import { DayScreen } from './screens/DayScreen'
import { ShopScreen } from './screens/ShopScreen'
import { GameOverScreen } from './screens/GameOverScreen'
import './App.css'

export function App() {
  const screen = useGameStore((state) => state.screen)
  const scale = useViewportScale()

  function renderScreen() {
    switch (screen) {
      case 'MAIN_MENU':
        return <MainMenuScreen />
      case 'DAY_IN_PROGRESS':
        return <DayScreen />
      case 'BETWEEN_DAY_SHOP':
        return <ShopScreen />
      case 'GAME_OVER':
        return <GameOverScreen />
    }
  }

  return (
    <div
      className="viewport-scaler"
      style={{ transform: `scale(${scale})` }}
    >
      {renderScreen()}
    </div>
  )
}
