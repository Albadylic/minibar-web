// MBW-6: State machine — maps GameScreen to the correct React screen component
import { useGameStore } from './store/gameStore'
import { MainMenuScreen } from './screens/MainMenuScreen'
import { DayScreen } from './screens/DayScreen'
import { ShopScreen } from './screens/ShopScreen'
import { GameOverScreen } from './screens/GameOverScreen'
import './App.css'

export function App() {
  const screen = useGameStore((state) => state.screen)

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
