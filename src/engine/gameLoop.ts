// MBW-7: requestAnimationFrame game loop with fixed timestep
// MBW-8: 120s day timer with 4 phases
// MBW-10: Day start/end flow
import { eventDispatcher } from './events/eventDispatcher'
import { pixiApp } from './renderer/pixiApp'
import { customerSystem } from './systems/customerSystem'
import { customerRenderer } from './renderer/customerRenderer'
import { flyupRenderer } from './renderer/flyupRenderer'
import { useGameStore } from '../store/gameStore'
import { useHudStore } from '../store/hudStore'
import type { DayConfig, DayPhase } from '../types/day'
import {
  DAY_DURATION,
  LAST_ORDERS_ELAPSED,
  PHASE_START_TIMES,
  TICK_RATE,
} from '../types/day'
import type { GameSave } from '../types/game'
import { BASE_ARRIVAL_RATES, STAR_RATING, getArrivalRateMultiplier, getPatienceMultiplierForDay } from '../config/difficulty'
import { UPGRADES_BY_ID } from '../config/upgrades'
import { useDayResultStore } from '../store/dayResultStore'
import { GAME_DAY_CONFIG, EVENT_CONFIGS } from '../config/events'
import { brawlSystem } from './systems/brawlSystem'
import { securitySystem } from './systems/securitySystem'
import { cleaningSystem } from './systems/cleaningSystem'
import { entertainerSystem, computeUpdatedLikelihood } from './systems/entertainerSystem'
import { resetBrawlIdCounter } from '../entities/brawl'
import type { EventType } from '../types/day'

// MBW-10/41/51/83: Generate DayConfig from current save — applies owned upgrade effects + day scaling
// event is determined externally (ShopScreen rolls it) and passed in here
export function generateDayConfig(save: GameSave, event: EventType | null = null): DayConfig {
  // MBW-51: Scale arrival rates and patience with day number
  const arrivalMult = getArrivalRateMultiplier(save.dayNumber)
  const dayPatienceMult = getPatienceMultiplierForDay(save.dayNumber)

  let patienceMultiplier = dayPatienceMult
  let tipJarBonus = 0
  let prestigePoints = 0
  let hooliganReductionMult = 1.0

  for (const [upgradeId, owned] of Object.entries(save.upgrades)) {
    const config = UPGRADES_BY_ID[upgradeId]
    if (!config) continue
    const tier = config.tiers[owned.tier - 1]
    if (!tier) continue
    for (const effect of tier.effects) {
      if (effect.type === 'patience_multiplier') {
        patienceMultiplier *= effect.value
      } else if (effect.type === 'tip_jar') {
        tipJarBonus += effect.value
      } else if (effect.type === 'prestige') {
        prestigePoints += effect.value
      } else if (effect.type === 'reduce_hooligan_spawn') {
        hooliganReductionMult *= effect.value
      }
      // extra_capacity is applied to barCapacity in GameSave at purchase time
    }
  }

  // Apply event-specific modifiers
  const eventCfg = event ? EVENT_CONFIGS[event] : null
  const eventArrivalMult = eventCfg?.arrivalMult ?? 1.0
  const eventCoinMult = eventCfg?.coinMult ?? 1.0
  patienceMultiplier *= eventCfg?.patienceMult ?? 1.0

  // MBW-93: Rich weight from prestige + event boost (some events guarantee rich customers)
  const richWeight = prestigePoints * 0.05 + (eventCfg?.richBoost ?? 0)
  // MBW-95: Drunks appear at low rate after Day 5
  const drunkWeight = save.dayNumber >= 5 ? 0.05 : 0

  // MBW-74: Customer type weights — hooligans only on Game Day; rich boosted by prestige/events
  let customerWeights: DayConfig['customerWeights']
  if (event === 'GAME_DAY') {
    customerWeights = {
      normal: GAME_DAY_CONFIG.customerWeights.normal,
      hooligan: GAME_DAY_CONFIG.customerWeights.hooligan * hooliganReductionMult,
      rich: richWeight,
      drunk: drunkWeight,
    }
  } else if (event === 'NOBLES_VISIT') {
    // Noble's Visit: rich customers dominate regardless of prestige
    customerWeights = { normal: 0.4, hooligan: 0, rich: Math.max(richWeight, 0.6), drunk: drunkWeight * 0.5 }
  } else {
    customerWeights = { normal: 1.0, hooligan: 0, rich: richWeight, drunk: drunkWeight }
  }

  return {
    dayNumber: save.dayNumber,
    event,
    duration: DAY_DURATION,
    arrivalRates: {
      morning: BASE_ARRIVAL_RATES.morning * arrivalMult * eventArrivalMult,
      afternoon: BASE_ARRIVAL_RATES.afternoon * arrivalMult * eventArrivalMult,
      evening: BASE_ARRIVAL_RATES.evening * arrivalMult * eventArrivalMult,
      night: BASE_ARRIVAL_RATES.night * arrivalMult * eventArrivalMult,
    },
    modifiers: {
      patienceMultiplier,
      coinMultiplier: eventCoinMult,
      tipJarBonus,
    },
    customerWeights,
  }
}

function getPhaseForElapsed(elapsed: number): DayPhase {
  if (elapsed < PHASE_START_TIMES.AFTERNOON) return 'MORNING'
  if (elapsed < PHASE_START_TIMES.EVENING) return 'AFTERNOON'
  if (elapsed < PHASE_START_TIMES.NIGHT) return 'EVENING'
  return 'NIGHT'
}

class GameLoop {
  private rafId: number | null = null
  private accumulator = 0
  private lastTime = 0

  // Day state
  private dayConfig: DayConfig | null = null
  private timeElapsed = 0
  private currentPhase: DayPhase = 'MORNING'
  private lastOrdersFired = false
  private dayEndedFired = false

  // Runtime values — initialised from GameSave, mutated during the day
  private coins = 0
  private startCoins = 0
  private starRating = 3.0
  private startStarRating = 3.0
  private selectedDrinkId: string | null = null
  private customersServed = 0
  private wrongDrinks = 0
  private unlockedDrinks: string[] = []

  // MBW-10: Start the day — called by DayScreen on mount
  start(
    dayConfig: DayConfig,
    initialCoins: number,
    initialStarRating: number,
    unlockedDrinks: string[],
  ): void {
    if (this.rafId !== null) this.stop()

    this.dayConfig = dayConfig
    this.timeElapsed = 0
    this.currentPhase = 'MORNING'
    this.lastOrdersFired = false
    this.dayEndedFired = false
    this.coins = initialCoins
    this.startCoins = initialCoins
    this.starRating = initialStarRating
    this.startStarRating = initialStarRating
    this.selectedDrinkId = null
    this.customersServed = 0
    this.wrongDrinks = 0
    this.unlockedDrinks = unlockedDrinks
    this.accumulator = 0

    customerSystem.reset()
    brawlSystem.reset()
    resetBrawlIdCounter()

    useHudStore.setState({
      timeRemaining: DAY_DURATION,
      phase: 'MORNING',
      coins: initialCoins,
      starRating: initialStarRating,
      selectedDrinkId: null,
    })

    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private loop = (currentTime: number): void => {
    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1)
    this.lastTime = currentTime
    this.accumulator += delta

    while (this.accumulator >= TICK_RATE) {
      this.update(TICK_RATE)
      this.accumulator -= TICK_RATE
    }

    this.render()

    if (!this.dayEndedFired) {
      this.rafId = requestAnimationFrame(this.loop)
    }
  }

  // MBW-8: Fixed-step simulation update
  private update(dt: number): void {
    if (this.dayEndedFired) return

    this.timeElapsed += dt
    const timeRemaining = Math.max(DAY_DURATION - this.timeElapsed, 0)

    // Phase transitions
    const newPhase = getPhaseForElapsed(this.timeElapsed)
    if (newPhase !== this.currentPhase) {
      this.currentPhase = newPhase
      eventDispatcher.emit('PHASE_CHANGED', { phase: newPhase })
    }

    // Last Orders
    if (!this.lastOrdersFired && this.timeElapsed >= LAST_ORDERS_ELAPSED) {
      this.lastOrdersFired = true
      eventDispatcher.emit('LAST_ORDERS', {})
    }

    // Day end
    if (this.timeElapsed >= DAY_DURATION) {
      this.dayEndedFired = true
      this.endDay()
      return
    }

    // MBW-18/19/21/22/24: Update customer simulation
    customerSystem.update(
      dt,
      this.dayConfig!,
      this.currentPhase,
      this.lastOrdersFired,
      this.unlockedDrinks,
    )

    // MBW-78/80: Update brawl system
    brawlSystem.update(dt)
    // MBW-88/89: Update security system (brawl auto-resolve, drunk escort)
    securitySystem.update(dt)
    // MBW-101: Update cleaner NPC pathfinding
    cleaningSystem.tick(dt)
    // MBW-116: Advance entertainer walk animation
    entertainerSystem.tick(dt)

    useHudStore.setState({
      timeRemaining,
      phase: this.currentPhase,
      coins: this.coins,
      starRating: this.starRating,
      selectedDrinkId: this.selectedDrinkId,
    })
  }

  // MBW-11: Render step — sync customer display objects then render PixiJS
  private render(): void {
    flyupRenderer.tick() // MBW-67: advance coin fly-up animations
    customerRenderer.sync(customerSystem.customers)
    pixiApp.render()
  }

  // MBW-10: Commit results, save, transition to shop
  private endDay(): void {
    const coinsEarned = this.coins - this.startCoins
    const starRatingDelta = this.starRating - this.startStarRating

    eventDispatcher.emit('DAY_ENDED', {
      coinsEarned,
      customersServed: this.customersServed,
    })

    const { gameSave, updateSave, goToScreen } = useGameStore.getState()

    // MBW-121: Update entertainer return likelihoods based on whether the player tipped
    const tipResult = entertainerSystem.getTipResult()
    const updatedEntertainers = { ...gameSave.entertainers }
    if (tipResult) {
      const current = gameSave.entertainers[tipResult.entertainerId].returnLikelihood
      updatedEntertainers[tipResult.entertainerId] = {
        returnLikelihood: computeUpdatedLikelihood(current, tipResult.tipped),
      }
    }

    updateSave({
      coins: this.coins,
      starRating: this.starRating,
      dayNumber: gameSave.dayNumber + 1,
      entertainers: updatedEntertainers,
      stats: {
        ...gameSave.stats,
        totalDaysPlayed: gameSave.stats.totalDaysPlayed + 1,
        totalCustomersServed: gameSave.stats.totalCustomersServed + this.customersServed,
        totalCoinsEarned: gameSave.stats.totalCoinsEarned + Math.max(0, coinsEarned),
        totalWrongDrinks: gameSave.stats.totalWrongDrinks + this.wrongDrinks,
      },
    })

    // MBW-59/60: Snapshot day result so ShopScreen can select and display a review
    useDayResultStore.getState().setResult({
      dayNumber: gameSave.dayNumber,
      customersServed: this.customersServed,
      wrongDrinks: this.wrongDrinks,
      coinsEarned: Math.max(0, coinsEarned),
      starRatingDelta,
      finalRating: this.starRating,
    })

    this.stop()
    goToScreen('BETWEEN_DAY_SHOP')
  }

  // --- Public API for game systems ---

  addCoins(amount: number): void {
    this.coins += amount
  }

  // Returns false if player can't afford it
  spendCoins(amount: number): boolean {
    if (this.coins < amount) return false
    this.coins -= amount
    return true
  }

  // Returns true if rating dropped below game over threshold
  adjustStarRating(delta: number): boolean {
    this.starRating = Math.max(0, Math.min(STAR_RATING.max, this.starRating + delta))
    return this.starRating < STAR_RATING.gameOverThreshold
  }

  selectDrink(drinkId: string | null): void {
    this.selectedDrinkId = drinkId
    useHudStore.setState({ selectedDrinkId: drinkId })
  }

  recordCustomerServed(): void {
    this.customersServed++
  }

  recordWrongDrink(): void {
    this.wrongDrinks++
  }

  triggerGameOver(): void {
    if (this.dayEndedFired) return
    this.dayEndedFired = true
    this.stop()

    const { gameSave, updateSave, goToScreen } = useGameStore.getState()
    updateSave({
      coins: this.coins,
      starRating: this.starRating,
      stats: {
        ...gameSave.stats,
        totalDaysPlayed: gameSave.stats.totalDaysPlayed + 1,
      },
    })
    goToScreen('GAME_OVER')
  }

  get selectedDrink(): string | null {
    return this.selectedDrinkId
  }

  get isRunning(): boolean {
    return this.rafId !== null
  }

  get tipJarBonus(): number {
    return this.dayConfig?.modifiers.tipJarBonus ?? 0
  }

  get dayCoinMultiplier(): number {
    return this.dayConfig?.modifiers.coinMultiplier ?? 1.0
  }

  get state() {
    return {
      timeElapsed: this.timeElapsed,
      phase: this.currentPhase,
      isLastOrders: this.lastOrdersFired,
      coins: this.coins,
      starRating: this.starRating,
      selectedDrinkId: this.selectedDrinkId,
      dayConfig: this.dayConfig,
    }
  }
}

export const gameLoop = new GameLoop()
