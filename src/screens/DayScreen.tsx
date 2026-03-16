// MBW-7/8/10: Game loop
// MBW-11: PixiJS canvas mount
// MBW-13/15/16: Bar scene
// MBW-26/27/28: Drink serving system
// MBW-30: Drink unlock progression
// MBW-70: Loading screen while PixiJS initialises
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
import { waiterSystem } from '../engine/systems/waiterSystem'
import { customerSystem } from '../engine/systems/customerSystem'
import { kingsTraySystem } from '../engine/systems/kingsTraySystem'
import { getUnlockedDrinks } from '../config/drinks'
import { UPGRADES_BY_ID } from '../config/upgrades'
import { eventDispatcher } from '../engine/events/eventDispatcher'
import { DAY_DURATION } from '../types/day'

export function DayScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { gameSave, updateSave } = useGameStore()
  // MBW-70: Track PixiJS init state so we can show loading overlay
  const [pixiReady, setPixiReady] = useState(false)

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
    // MBW-147/160: Extra Seating upgrade tier controls which seats are active
    const extraSeatTier = save.upgrades['extra_seating']?.tier ?? 0
    customerSystem.setExtraSeatTier(extraSeatTier)
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
    // MBW-147/160: Extra Seating tier for barScene seat/table rendering
    const extraSeatTier = save.upgrades['extra_seating']?.tier ?? 0

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

    // MBW-163: Number keys 1–9 select drinks; same key deselects
    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10)
      if (isNaN(num) || num < 1 || num > 9) return
      const drinkId = unlockedDrinks[num - 1]
      if (!drinkId) return
      eventDispatcher.emit('DRINK_CLICKED', { drinkId })
    }
    window.addEventListener('keydown', handleKeyDown)

    pixiApp.init(canvas).then(() => {
      if (cancelled || !pixiApp.app) return
      setPixiReady(true)
      barScene.init(pixiApp.app, unlockedDrinks, ownedUpgrades, extraSeatTier)
      // MBW-109: Noble's Visit king's tray mechanic
      const kingsTray = gameLoop.state.dayConfig?.kingsTray
      if (kingsTray) {
        kingsTraySystem.init(pixiApp.app, kingsTray)
      }
      customerRenderer.init(pixiApp.app)
      flyupRenderer.init(pixiApp.app) // MBW-67
      cleaningSystem.init(pixiApp.app, cleanerSpeed, cleanerNoIdlePause) // MBW-101/179
      // MBW-178: Entertainers only available once Stage is purchased
      if (save.upgrades['stage']) {
        entertainerSystem.init(pixiApp.app, save) // MBW-116
      }
      // MBW-182: Waiter NPC
      const waiterTier = save.upgrades['waiter']?.tier ?? 0
      if (waiterTier > 0) {
        waiterSystem.init(pixiApp.app, waiterTier as 1 | 2 | 3)
      }
    })

    return () => {
      cancelled = true
      window.removeEventListener('keydown', handleKeyDown)
      flyupRenderer.destroy()
      kingsTraySystem.destroy()
      cleaningSystem.destroy()
      entertainerSystem.destroy()
      waiterSystem.destroy()
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
      {/* MBW-70: Loading overlay until PixiJS is ready */}
      {!pixiReady && <PixiLoadingOverlay />}
      <div className="hud-overlay">
        <DayHud dayNumber={gameSave.dayNumber} />
      </div>
      <TipPromptOverlay />
    </div>
  )
}

// MBW-70: Themed loading overlay shown while PixiJS Application initialises.
// When V1.5 sprite sheets are added, wire Assets.load() progress into this component.
function PixiLoadingOverlay() {
  return (
    <div className="pixi-loading-overlay">
      <p className="pixi-loading-text">Opening the doors<span className="pixi-loading-dots" /></p>
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

// MBW-120: Tip prompt overlay — shown when entertainer reaches bar at Last Orders
function TipPromptOverlay() {
  const { tipPrompt, coins } = useHudStore()
  if (!tipPrompt) return null

  const labels = ['Generous', 'Adequate', 'Poor', 'Refuse']

  return (
    <div className="tip-overlay">
      <div className="tip-card">
        <p className="tip-title">{tipPrompt.entertainerName} wants paying</p>
        <div className="tip-options">
          {tipPrompt.options.map((amount, i) => (
            <button
              key={i}
              className={`tip-btn tip-btn-${i}`}
              disabled={amount > coins}
              onClick={() => entertainerSystem.resolveTip(i as 0 | 1 | 2 | 3)}
            >
              <span className="tip-label">{labels[i]}</span>
              <span className="tip-amount">{amount > 0 ? `🪙 ${amount}` : 'Nothing'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function DayHud({ dayNumber }: { dayNumber: number }) {
  const { timeRemaining, coins, starRating, performingEntertainer } = useHudStore()

  // MBW-185: Single forward-counting game clock (12:00 → 00:00 over 120s)
  const elapsed = DAY_DURATION - timeRemaining
  const totalMins = 720 + Math.floor(elapsed) * 6
  const gameHours = Math.floor(totalMins / 60) % 24
  const gameMins = totalMins % 60
  const clockStr = `${gameHours.toString().padStart(2, '0')}:${gameMins.toString().padStart(2, '0')}`

  return (
    <div className="hud">
      <span className="hud-day">Day {dayNumber}</span>
      <span className="hud-timer">{clockStr}</span>
      <StarRating rating={starRating} />
      <span className="hud-coins">🪙 {coins}</span>
      {performingEntertainer && (
        <span className="hud-entertainer">♪ {performingEntertainer}</span>
      )}
    </div>
  )
}
