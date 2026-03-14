// MBW-7/8/10: Game loop
// MBW-11: PixiJS canvas mount
// MBW-13/15/16: Bar scene
// MBW-26/27/28: Drink serving system
// MBW-30: Drink unlock progression
import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useHudStore } from '../store/hudStore'
import { gameLoop, generateDayConfig } from '../engine/gameLoop'
import { pixiApp } from '../engine/renderer/pixiApp'
import { barScene } from '../engine/renderer/barScene'
import { customerRenderer } from '../engine/renderer/customerRenderer'
import { flyupRenderer } from '../engine/renderer/flyupRenderer'
import { drinkServingSystem } from '../engine/systems/drinkServingSystem'
import { brawlSystem } from '../engine/systems/brawlSystem'
import { securitySystem } from '../engine/systems/securitySystem'
import { cleaningSystem } from '../engine/systems/cleaningSystem'
import { entertainerSystem } from '../engine/systems/entertainerSystem'
import { getUnlockedDrinks } from '../config/drinks'
import { UPGRADES_BY_ID } from '../config/upgrades'

export function DayScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { gameSave, updateSave } = useGameStore()

  // Start game loop on mount — also handles drink unlock check (MBW-30)
  useEffect(() => {
    const { gameSave: save, updateSave: update, pendingEvent } = useGameStore.getState()

    // MBW-30: Compute all drinks unlocked by this day number
    const allUnlocked = getUnlockedDrinks(save.dayNumber).map((d) => d.id)
    const hasNewDrinks = allUnlocked.length > save.unlockedDrinks.length
    if (hasNewDrinks) {
      update({ unlockedDrinks: allUnlocked })
    }
    const unlockedDrinks = hasNewDrinks ? allUnlocked : save.unlockedDrinks

    // MBW-83: pendingEvent was rolled in ShopScreen; pass it to DayConfig
    const dayConfig = generateDayConfig(save, pendingEvent)
    gameLoop.start(dayConfig, save.coins, save.starRating, unlockedDrinks)
    brawlSystem.init(save.dayNumber)
    const bouncerTier = (save.upgrades['bouncer']?.tier ?? 0) as 0 | 1 | 2 | 3
    securitySystem.init(bouncerTier)
    drinkServingSystem.init()

    return () => {
      drinkServingSystem.destroy()
      brawlSystem.destroy()
      securitySystem.destroy()
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

    // MBW-101/179: Cleaner speed from owned upgrade tier (null = no cleaner NPC)
    const cleanerTier = save.upgrades['cleaner']?.tier ?? 0
    const cleanerUpgradeTier = cleanerTier > 0
      ? UPGRADES_BY_ID['cleaner']?.tiers[cleanerTier - 1]
      : null
    const cleanerSpeed = cleanerUpgradeTier
      ? (cleanerUpgradeTier.effects.find((e) => e.type === 'cleaner')?.value ?? null)
      : null
    // MBW-179: Tier 3 cleaner starts next mess without idle pause
    const cleanerNoIdlePause = cleanerTier >= 3

    pixiApp.init(canvas).then(() => {
      if (cancelled || !pixiApp.app) return
      barScene.init(pixiApp.app, unlockedDrinks, ownedUpgrades)
      customerRenderer.init(pixiApp.app)
      flyupRenderer.init(pixiApp.app) // MBW-67
      cleaningSystem.init(pixiApp.app, cleanerSpeed, cleanerNoIdlePause) // MBW-101/179
      // MBW-178: Entertainers only available once Stage is purchased
      if (save.upgrades['stage']) {
        entertainerSystem.init(pixiApp.app, save) // MBW-116
      }
    })

    return () => {
      cancelled = true
      flyupRenderer.destroy()
      cleaningSystem.destroy()
      entertainerSystem.destroy()
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

// MBW-37/66: Color-coded star rating display with gain/loss animation
function StarRating({ rating }: { rating: number }) {
  const [animClass, setAnimClass] = useState('')
  const prevRating = useRef(rating)

  useEffect(() => {
    if (rating === prevRating.current) return
    const gained = rating > prevRating.current
    prevRating.current = rating
    setAnimClass(gained ? 'star-gain' : 'star-loss')
    const t = setTimeout(() => setAnimClass(''), 400)
    return () => clearTimeout(t)
  }, [rating])

  const color = rating > 3 ? '#44cc44' : rating >= 2 ? '#ddcc00' : '#cc2222'
  return (
    <span className={`hud-stars ${animClass}`} style={{ color }}>
      ★ {rating.toFixed(1)}
    </span>
  )
}

function DayHud({ dayNumber }: { dayNumber: number }) {
  const { timeRemaining, phase, coins, starRating, performingEntertainer } = useHudStore()

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = Math.floor(timeRemaining % 60)
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // MBW-154: Escalating urgency animation below 24s / 10s / 5s
  const timerClass =
    timeRemaining < 5 ? 'timer-frantic' :
    timeRemaining < 10 ? 'timer-erratic' :
    timeRemaining < 24 ? 'timer-urgent' : ''

  return (
    <div className="hud">
      <span className="hud-day">Day {dayNumber}</span>
      <span className={`hud-timer ${timerClass}`}>{timeStr}</span>
      <span className="hud-phase">{phase}</span>
      <StarRating rating={starRating} />
      <span className="hud-coins">🪙 {coins}</span>
      {performingEntertainer && (
        <span className="hud-entertainer">♪ {performingEntertainer}</span>
      )}
    </div>
  )
}
