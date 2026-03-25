// MBW-NEW: Achievement tracking system — subscribes to game events, checks conditions,
// completes achievements, queues toasts, and flushes earned stats to the save.
import { eventDispatcher } from '../events/eventDispatcher'
import { useGameStore } from '../../store/gameStore'
import { useHudStore } from '../../store/hudStore'
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from '../../config/achievements'
import { UPGRADES_BY_ID } from '../../config/upgrades'
import { customerSystem } from './customerSystem'
import { cleaningSystem } from './cleaningSystem'
import { gameLoop } from '../gameLoop'
import type { GameSave } from '../../types/game'

const STAFF_IDS = ['bouncer', 'cleaner', 'doorman', 'waiter'] as const

class AchievementSystem {
  // Day-local counters — reset on init()
  private dayFastServes = 0
  private dayWrongDrinks = 0
  private dayUnservedCustomers = 0
  private dayBrawlsResolved = 0
  private dayCleanerMesses = 0
  private dayCoinsEarned = 0
  private dayCustomersServed = 0
  private uniqueDrinksServedToday = new Set<string>()

  // In-memory stats snapshot — owns the new stats, reads gameLoop-owned stats as baselines
  private stats: GameSave['stats'] | null = null
  private baseCoinsEarned = 0      // gameSave.stats.totalCoinsEarned at day start
  private baseCustomersServed = 0  // gameSave.stats.totalCustomersServed at day start

  // ---- Event handlers ----

  private handleDrinkServed = ({
    customerId,
    drinkId,
    coinsEarned,
  }: {
    customerId: string
    drinkId: string
    wasCorrect: boolean
    coinsEarned: number
  }): void => {
    if (!this.stats) return
    const customer = customerSystem.getCustomer(customerId)
    if (!customer) return

    this.stats.totalDrinksServed++
    this.dayCoinsEarned += coinsEarned
    this.dayCustomersServed++
    this.uniqueDrinksServedToday.add(drinkId)

    if (customer.patienceTimer / customer.patienceMax > 0.75) this.dayFastServes++
    if (customer.type === 'RICH') this.stats.totalRichServed++

    this.checkCumulative('totalDrinksServed', this.stats.totalDrinksServed)
    this.checkCumulative('totalRichServed', this.stats.totalRichServed)
    this.checkCumulative('totalCoinsEarned', this.baseCoinsEarned + this.dayCoinsEarned)
    this.checkCumulative('totalCustomersServed', this.baseCustomersServed + this.dayCustomersServed)
  }

  private handlePatienceExpired = (_payload: { customerId: string }): void => {
    this.dayUnservedCustomers++
  }

  private handleWrongDrink = (_payload: { customerId: string; drinkId: string }): void => {
    this.dayWrongDrinks++
  }

  private handleBrawlResolved = ({
    disruptedCount,
  }: {
    brawlId: string
    byPlayer: boolean
    disruptedCount: number
  }): void => {
    if (!this.stats) return
    this.stats.totalBrawls++
    this.dayBrawlsResolved++

    this.checkCumulative('totalBrawls', this.stats.totalBrawls)
    if (this.stats.totalBrawls === 1) this.tryComplete('BRAWL_1')
    if (disruptedCount === 0) this.tryComplete('BRAWL_CLEAN')
  }

  private handleMessCleaned = ({ byPlayer }: { messId: string; byPlayer: boolean }): void => {
    if (!this.stats) return
    this.stats.totalMessesCleaned++
    if (!byPlayer) this.dayCleanerMesses++
    this.checkCumulative('totalMessesCleaned', this.stats.totalMessesCleaned)
  }

  private handleDrunkEscorted = (_payload: { customerId: string; byPlayer: boolean }): void => {
    if (!this.stats) return
    this.stats.totalDrunksEscorted++
    this.checkCumulative('totalDrunksEscorted', this.stats.totalDrunksEscorted)
  }

  private handleEntertainerArrived = ({ entertainerId }: { entertainerId: string }): void => {
    if (!this.stats || entertainerId === 'jukebox') return
    this.stats.totalEntertainersHosted++
    if (!this.stats.seenEntertainers.includes(entertainerId)) {
      this.stats.seenEntertainers = [...this.stats.seenEntertainers, entertainerId]
    }
    this.checkCumulative('totalEntertainersHosted', this.stats.totalEntertainersHosted)
    if (this.stats.seenEntertainers.length >= 3) this.tryComplete('ALL_ENTERTAINERS')
  }

  private handleEntertainerTipped = ({
    wasGenerous,
  }: {
    entertainerId: string
    amount: number
    wasGenerous: boolean
  }): void => {
    if (!this.stats || !wasGenerous) return
    this.stats.totalGenerousTips++
    this.checkCumulative('totalGenerousTips', this.stats.totalGenerousTips)
  }

  private handleCustomerArrived = (_payload: { customerId: string; seatId: string }): void => {
    const { gameSave } = useGameStore.getState()
    const activeCount = customerSystem.customers.filter((c) => c.status !== 'LEAVING').length
    if (activeCount >= gameSave.barCapacity) this.tryComplete('FULL_HOUSE')
  }

  private handleKingsTrayResolved = ({ complete }: { complete: boolean; coinsEarned: number }): void => {
    if (complete) this.tryComplete('KINGS_TRAY')
  }

  private handleDayEnded = ({ coinsEarned, customersServed }: { coinsEarned: number; customersServed: number }): void => {
    if (!this.stats) return
    const { gameSave } = useGameStore.getState()

    // Compute effective totals for gameLoop-owned stats
    const effectiveTotalCustomers = gameSave.stats.totalCustomersServed + customersServed
    const effectiveTotalDays = gameSave.stats.totalDaysPlayed + 1
    this.checkCumulative('totalCustomersServed', effectiveTotalCustomers)
    this.checkCumulative('totalDaysPlayed', effectiveTotalDays)

    // Day milestone
    this.tryComplete(`DAY_${gameSave.dayNumber}`)

    // Single-day achievements
    if (this.dayWrongDrinks === 0 && this.dayUnservedCustomers === 0) this.tryComplete('PERFECT_DAY')
    if (this.dayFastServes >= 5) this.tryComplete('SPEED_5')
    if (this.dayFastServes >= 10) this.tryComplete('SPEED_10')
    if (coinsEarned >= 200) this.tryComplete('BIG_DAY')
    if (cleaningSystem.messes.length === 0) this.tryComplete('CLEAN_DAY')
    if (this.dayCleanerMesses >= 20) this.tryComplete('CLEANER_20')
    if (gameLoop.state.dayConfig?.event === 'GAME_DAY' && this.dayBrawlsResolved === 0) {
      this.tryComplete('GAMEDAY_CLEAN')
    }
    if (gameSave.unlockedDrinks.length > 0 && gameSave.unlockedDrinks.every((d) => this.uniqueDrinksServedToday.has(d))) {
      this.tryComplete('DRINK_VARIETY')
    }

    // State-based achievements (re-check in case anything changed in-day)
    this.checkStateAchievements(gameSave)

    // Flush achievementSystem-owned stats to gameSave.
    // gameLoop.endDay() will merge its own stat increments after this call.
    const { updateSave } = useGameStore.getState()
    updateSave({
      stats: {
        ...gameSave.stats,
        totalDrinksServed: this.stats.totalDrinksServed,
        totalBrawls: this.stats.totalBrawls,
        totalMessesCleaned: this.stats.totalMessesCleaned,
        totalDrunksEscorted: this.stats.totalDrunksEscorted,
        totalEntertainersHosted: this.stats.totalEntertainersHosted,
        totalGenerousTips: this.stats.totalGenerousTips,
        totalRichServed: this.stats.totalRichServed,
        seenEntertainers: this.stats.seenEntertainers,
      },
    })

    this.resetDayCounters()
  }

  // ---- Lifecycle ----

  init(): void {
    const { gameSave } = useGameStore.getState()

    this.stats = { ...gameSave.stats, seenEntertainers: [...gameSave.stats.seenEntertainers] }
    this.baseCoinsEarned = gameSave.stats.totalCoinsEarned
    this.baseCustomersServed = gameSave.stats.totalCustomersServed
    this.resetDayCounters()

    eventDispatcher.on('DRINK_SERVED', this.handleDrinkServed)
    eventDispatcher.on('PATIENCE_EXPIRED', this.handlePatienceExpired)
    eventDispatcher.on('WRONG_DRINK', this.handleWrongDrink)
    eventDispatcher.on('BRAWL_RESOLVED', this.handleBrawlResolved)
    eventDispatcher.on('MESS_CLEANED', this.handleMessCleaned)
    eventDispatcher.on('DRUNK_ESCORTED', this.handleDrunkEscorted)
    eventDispatcher.on('ENTERTAINER_ARRIVED', this.handleEntertainerArrived)
    eventDispatcher.on('ENTERTAINER_TIPPED', this.handleEntertainerTipped)
    eventDispatcher.on('CUSTOMER_ARRIVED', this.handleCustomerArrived)
    eventDispatcher.on('KINGS_TRAY_RESOLVED', this.handleKingsTrayResolved)
    eventDispatcher.on('DAY_ENDED', this.handleDayEnded)

    // Check state-based achievements on init — catches anything earned in the shop
    this.checkStateAchievements(gameSave)

    // MBW-NEW: Retroactive cumulative check — catches stats earned before v4 migration
    if (this.stats) {
      this.checkCumulative('totalDrinksServed', this.stats.totalDrinksServed)
      this.checkCumulative('totalBrawls', this.stats.totalBrawls)
      this.checkCumulative('totalMessesCleaned', this.stats.totalMessesCleaned)
      this.checkCumulative('totalDrunksEscorted', this.stats.totalDrunksEscorted)
      this.checkCumulative('totalEntertainersHosted', this.stats.totalEntertainersHosted)
      this.checkCumulative('totalGenerousTips', this.stats.totalGenerousTips)
      this.checkCumulative('totalRichServed', this.stats.totalRichServed)
    }
    this.checkCumulative('totalCustomersServed', gameSave.stats.totalCustomersServed)
    this.checkCumulative('totalCoinsEarned', gameSave.stats.totalCoinsEarned)
    this.checkCumulative('totalDaysPlayed', gameSave.stats.totalDaysPlayed)
  }

  destroy(): void {
    eventDispatcher.off('DRINK_SERVED', this.handleDrinkServed)
    eventDispatcher.off('PATIENCE_EXPIRED', this.handlePatienceExpired)
    eventDispatcher.off('WRONG_DRINK', this.handleWrongDrink)
    eventDispatcher.off('BRAWL_RESOLVED', this.handleBrawlResolved)
    eventDispatcher.off('MESS_CLEANED', this.handleMessCleaned)
    eventDispatcher.off('DRUNK_ESCORTED', this.handleDrunkEscorted)
    eventDispatcher.off('ENTERTAINER_ARRIVED', this.handleEntertainerArrived)
    eventDispatcher.off('ENTERTAINER_TIPPED', this.handleEntertainerTipped)
    eventDispatcher.off('CUSTOMER_ARRIVED', this.handleCustomerArrived)
    eventDispatcher.off('KINGS_TRAY_RESOLVED', this.handleKingsTrayResolved)
    eventDispatcher.off('DAY_ENDED', this.handleDayEnded)
    this.stats = null
  }

  // Called from WeeklyReportScreen after endWeek() has updated the save
  checkWeeklyAchievements(): void {
    const { gameSave, updateSave } = useGameStore.getState()
    const { displayedRating, weeklyHistory } = gameSave
    const lastWeek = weeklyHistory[weeklyHistory.length - 1]

    const newRatingEverBelow2_5 = gameSave.achievements.ratingEverBelow2_5 || displayedRating < 2.5

    let newStreak = gameSave.achievements.consecutivePerfectWeeks
    if (lastWeek && lastWeek.averageRating >= 4.5) {
      newStreak++
    } else {
      newStreak = 0
    }

    updateSave({
      achievements: {
        ...gameSave.achievements,
        ratingEverBelow2_5: newRatingEverBelow2_5,
        consecutivePerfectWeeks: newStreak,
      },
    })

    if (newRatingEverBelow2_5 && displayedRating >= 4.0) this.tryComplete('RATING_RECOVERY')
    if (newStreak >= 2) this.tryComplete('RATING_5_WEEKS_2')
    if (newStreak >= 3) this.tryComplete('RATING_5_WEEKS_3')
  }

  // ---- Private helpers ----

  private resetDayCounters(): void {
    this.dayFastServes = 0
    this.dayWrongDrinks = 0
    this.dayUnservedCustomers = 0
    this.dayBrawlsResolved = 0
    this.dayCleanerMesses = 0
    this.dayCoinsEarned = 0
    this.dayCustomersServed = 0
    this.uniqueDrinksServedToday = new Set()
  }

  private checkCumulative(stat: keyof GameSave['stats'], effectiveValue: number): void {
    const { gameSave } = useGameStore.getState()
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.condition.type !== 'cumulative') continue
      if (achievement.condition.stat !== stat) continue
      if (gameSave.achievements.completed[achievement.id]) continue
      if (effectiveValue >= achievement.condition.target) {
        this.tryComplete(achievement.id)
      }
    }
  }

  private checkStateAchievements(gameSave: GameSave): void {
    const { upgrades } = gameSave
    const upgradeIds = Object.keys(upgrades)

    if (upgradeIds.length > 0) this.tryComplete('FIRST_UPGRADE')

    const ownedStaff = STAFF_IDS.filter((id) => upgrades[id])
    if (ownedStaff.length > 0) this.tryComplete('FIRST_HIRE')
    if (ownedStaff.length === STAFF_IDS.length) this.tryComplete('ALL_STAFF')

    const anyMaxed = upgradeIds.some((id) => {
      const config = UPGRADES_BY_ID[id]
      return config !== undefined && (upgrades[id]?.tier ?? 0) >= config.maxTier
    })
    if (anyMaxed) this.tryComplete('MAX_UPGRADE')

    const allStaffMaxed = STAFF_IDS.every((id) => {
      const config = UPGRADES_BY_ID[id]
      return config !== undefined && (upgrades[id]?.tier ?? 0) >= config.maxTier
    })
    if (allStaffMaxed && STAFF_IDS.every((id) => upgrades[id])) this.tryComplete('MAX_STAFF')

    const allMaxed = Object.values(UPGRADES_BY_ID).every((config) => {
      return (upgrades[config.id]?.tier ?? 0) >= config.maxTier
    })
    if (allMaxed) this.tryComplete('ALL_UPGRADES')

    if (upgrades['no_team_colours']) this.tryComplete('HOOLIGAN_POSTER')
  }

  private tryComplete(id: string): void {
    if (!ACHIEVEMENTS_BY_ID[id]) return
    const result = useGameStore.getState().completeAchievement(id)
    if (!result) return

    useHudStore.setState((state) => ({
      achievementToastQueue: [...state.achievementToastQueue, result],
      pendingAchievementSummary: [...(state.pendingAchievementSummary ?? []), result],
    }))

    eventDispatcher.emit('ACHIEVEMENT_COMPLETED', {
      id: result.id,
      tier: result.tier,
      reward: result.reward,
    })
  }
}

export const achievementSystem = new AchievementSystem()
