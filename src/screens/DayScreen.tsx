// MBW-7/8/10: Game loop
// MBW-11: PixiJS canvas mount
// MBW-13/15/16: Bar scene
// MBW-26/27/28: Drink serving system
// MBW-30: Drink unlock progression
import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { useHudStore } from '../store/hudStore'
import { gameLoop, generateDayConfig } from '../engine/gameLoop'
import { pixiApp } from '../engine/renderer/pixiApp'
import { barScene } from '../engine/renderer/barScene'
import { customerRenderer } from '../engine/renderer/customerRenderer'
import { drinkServingSystem } from '../engine/systems/drinkServingSystem'
import { getUnlockedDrinks } from '../config/drinks'

export function DayScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { gameSave, updateSave } = useGameStore()

  // Start game loop on mount — also handles drink unlock check (MBW-30)
  useEffect(() => {
    const { gameSave: save, updateSave: update } = useGameStore.getState()

    // MBW-30: Compute all drinks unlocked by this day number
    const allUnlocked = getUnlockedDrinks(save.dayNumber).map((d) => d.id)
    const hasNewDrinks = allUnlocked.length > save.unlockedDrinks.length
    if (hasNewDrinks) {
      update({ unlockedDrinks: allUnlocked })
    }
    const unlockedDrinks = hasNewDrinks ? allUnlocked : save.unlockedDrinks

    const dayConfig = generateDayConfig(save)
    gameLoop.start(dayConfig, save.coins, save.starRating, unlockedDrinks)
    drinkServingSystem.init()

    return () => {
      drinkServingSystem.destroy()
      gameLoop.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Init PixiJS and build bar/customer renderers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false

    const { gameSave: save } = useGameStore.getState()
    const allUnlocked = getUnlockedDrinks(save.dayNumber).map((d) => d.id)
    const unlockedDrinks = allUnlocked.length > save.unlockedDrinks.length
      ? allUnlocked
      : save.unlockedDrinks

    const ownedUpgrades = Object.keys(save.upgrades)

    pixiApp.init(canvas).then(() => {
      if (cancelled || !pixiApp.app) return
      barScene.init(pixiApp.app, unlockedDrinks, ownedUpgrades)
      customerRenderer.init(pixiApp.app)
    })

    return () => {
      cancelled = true
      customerRenderer.destroy()
      barScene.destroy()
      pixiApp.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Suppress unused var warning — gameSave used only to show day number
  void updateSave

  return (
    <div className="day-screen-wrapper">
      <canvas ref={canvasRef} className="game-canvas" />
      <div className="hud-overlay">
        <DayHud dayNumber={gameSave.dayNumber} />
      </div>
    </div>
  )
}

// MBW-37: Color-coded star rating display
function StarRating({ rating }: { rating: number }) {
  const color = rating > 3 ? '#44cc44' : rating >= 2 ? '#ddcc00' : '#cc2222'
  return (
    <span className="hud-stars" style={{ color }}>
      ★ {rating.toFixed(1)}
    </span>
  )
}

function DayHud({ dayNumber }: { dayNumber: number }) {
  const { timeRemaining, phase, coins, starRating, selectedDrinkId } = useHudStore()

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = Math.floor(timeRemaining % 60)
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <div className="hud">
      <span className="hud-day">Day {dayNumber}</span>
      <span className="hud-timer">{timeStr}</span>
      <span className="hud-phase">{phase}</span>
      <StarRating rating={starRating} />
      <span className="hud-coins">🪙 {coins}</span>
      {selectedDrinkId && <span className="hud-selected">▶ {selectedDrinkId}</span>}
    </div>
  )
}
