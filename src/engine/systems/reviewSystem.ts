// MBW-NEW: Event-driven review generation system.
// Replaces old tag-based review selector. Reviews accumulate during the day and are
// flushed to the store at DAY_ENDED. ReviewSystem also selects the daily featured review.

import { eventDispatcher } from '../events/eventDispatcher'
import { customerSystem } from './customerSystem'
import { cleaningSystem } from './cleaningSystem'
import { useGameStore } from '../../store/gameStore'
import { useHudStore } from '../../store/hudStore'
import { useDayResultStore } from '../../store/dayResultStore'
import type { Review, ReviewTrigger } from '../../types/review'
import { REVIEW_CONFIG, getExpectationsModifier } from '../../config/reviewConfig'
import { getAnonReviewText, getRegularReviewText, NAMED_NPC_POOL } from '../../config/reviewTemplates'
import { REGULARS_BY_ID } from '../../config/regulars'
import { UPGRADES_BY_ID } from '../../config/upgrades'
import type { GameSave } from '../../types/game'

let _reviewIdCounter = 0
function nextReviewId(): string {
  return `rev-${++_reviewIdCounter}`
}

// Compute prestige points from owned upgrades
function getPrestigePoints(upgrades: GameSave['upgrades']): number {
  let points = 0
  for (const [upgradeId, owned] of Object.entries(upgrades)) {
    const config = UPGRADES_BY_ID[upgradeId]
    if (!config) continue
    const tier = config.tiers[owned.tier - 1]
    if (!tier) continue
    for (const effect of tier.effects) {
      if (effect.type === 'prestige') points += effect.value
    }
  }
  return points
}

// Pick a random name from the NPC name pool
function randomNpcName(): string {
  return NAMED_NPC_POOL[Math.floor(Math.random() * NAMED_NPC_POOL.length)] ?? 'A Traveller'
}

class ReviewSystem {
  private todaysReviews: Review[] = []
  private dayCustomersServed = 0
  private dayWrongDrinks = 0
  private dayCoinsEarned = 0

  // MBW-NEW: init + destroy called from DayScreen alongside other systems
  init(): void {
    this.todaysReviews = []
    this.dayCustomersServed = 0
    this.dayWrongDrinks = 0
    this.dayCoinsEarned = 0
    _reviewIdCounter = 0

    eventDispatcher.on('PATIENCE_EXPIRED', this.handlePatienceExpired)
    eventDispatcher.on('DRINK_SERVED', this.handleDrinkServed)
    eventDispatcher.on('WRONG_DRINK', this.handleWrongDrink)
    eventDispatcher.on('BRAWL_RESOLVED', this.handleBrawlResolved)
    eventDispatcher.on('DAY_ENDED', this.handleDayEnded)
  }

  destroy(): void {
    eventDispatcher.off('PATIENCE_EXPIRED', this.handlePatienceExpired)
    eventDispatcher.off('DRINK_SERVED', this.handleDrinkServed)
    eventDispatcher.off('WRONG_DRINK', this.handleWrongDrink)
    eventDispatcher.off('BRAWL_RESOLVED', this.handleBrawlResolved)
    eventDispatcher.off('DAY_ENDED', this.handleDayEnded)
    this.todaysReviews = []
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  private handlePatienceExpired = ({ customerId }: { customerId: string }): void => {
    const { gameSave } = useGameStore.getState()
    if (!this.isActive(gameSave)) return

    const customer = customerSystem.getCustomer(customerId)
    // Only NORMAL/RICH customers generate unserved reviews (hooligans brawl instead)
    if (!customer || customer.type === 'HOOLIGAN' || customer.type === 'DRUNK') return

    const baseChance = this.getNegativeChance(REVIEW_CONFIG.unservedReviewChance, gameSave, customer.type === 'RICH')
    if (Math.random() > baseChance) return

    const review = this.buildReview({
      trigger: 'UNSERVED',
      stars: REVIEW_CONFIG.unservedStars,
      customer,
      gameSave,
    })
    this.todaysReviews.push(review)
  }

  private handleDrinkServed = ({
    customerId,
    drinkId,
    wasCorrect,
  }: {
    customerId: string
    drinkId: string
    wasCorrect: boolean
    coinsEarned: number
  }): void => {
    if (!wasCorrect) return

    const { gameSave } = useGameStore.getState()
    if (!this.isActive(gameSave)) return

    const customer = customerSystem.getCustomer(customerId)
    if (!customer) return

    this.dayCustomersServed++

    // Regulars always leave a review
    if (customer.isRegular) {
      const review = this.buildRegularReview(customer, gameSave)
      this.todaysReviews.push(review)
      return
    }

    // Determine speed tier
    const patienceRatio = customer.patienceMax > 0 ? customer.patienceTimer / customer.patienceMax : 1
    let trigger: ReviewTrigger
    let baseChance: number
    if (patienceRatio > 0.5) {
      trigger = 'SERVED_FAST'
      baseChance = REVIEW_CONFIG.servedFastReviewChance
    } else if (patienceRatio > 0.25) {
      trigger = 'SERVED_NORMAL'
      baseChance = REVIEW_CONFIG.servedNormalReviewChance
    } else {
      trigger = 'SERVED_SLOW'
      baseChance = REVIEW_CONFIG.servedSlowReviewChance
    }

    // Apply modifiers to positive review chance
    let chance = baseChance
    if (customer.type === 'RICH') chance *= REVIEW_CONFIG.richCustomerReviewMultiplier
    const messCount = cleaningSystem.messes.length
    if (messCount === 0) chance += REVIEW_CONFIG.cleanBarPositiveBonus
    if (messCount >= 3) chance -= 0.05  // partial cancel of clean bonus from dirty bar
    const isEntertainerOn = useHudStore.getState().performingEntertainer !== null
    if (isEntertainerOn) chance += REVIEW_CONFIG.entertainerPerformingBonus

    if (Math.random() > chance) return

    const stars = this.rollPositiveStars(trigger, patienceRatio, gameSave)
    const text = getAnonReviewText(trigger, drinkId)
    const isNamed = Math.random() < REVIEW_CONFIG.namedNpcReviewChance
    const customerName = isNamed ? randomNpcName() : undefined

    this.todaysReviews.push(
      this.buildReview({ trigger, stars, customer, gameSave, text, customerName }),
    )
  }

  private handleWrongDrink = ({
    customerId,
    drinkId,
  }: {
    customerId: string
    drinkId: string
  }): void => {
    const { gameSave } = useGameStore.getState()
    if (!this.isActive(gameSave)) return

    const customer = customerSystem.getCustomer(customerId)
    if (!customer) return

    this.dayWrongDrinks++

    const baseChance = this.getNegativeChance(REVIEW_CONFIG.wrongDrinkReviewChance, gameSave, customer.type === 'RICH')
    if (Math.random() > baseChance) return

    const stars =
      customer.type === 'RICH'
        ? 1
        : REVIEW_CONFIG.wrongDrinkStarsMin +
          Math.round(Math.random() * (REVIEW_CONFIG.wrongDrinkStarsMax - REVIEW_CONFIG.wrongDrinkStarsMin))

    const text = getAnonReviewText('WRONG_DRINK', drinkId)
    const isNamed = Math.random() < REVIEW_CONFIG.namedNpcReviewChance
    const customerName = isNamed ? randomNpcName() : undefined

    this.todaysReviews.push(
      this.buildReview({ trigger: 'WRONG_DRINK', stars, customer, gameSave, text, customerName }),
    )
  }

  private handleBrawlResolved = ({
    disruptedCount,
  }: {
    brawlId: string
    byPlayer: boolean
    disruptedCount: number
  }): void => {
    const { gameSave } = useGameStore.getState()
    if (!this.isActive(gameSave)) return

    // Generate 1★ brawl victim review per disrupted customer (capped at 3 for readability)
    const reviewCount = Math.max(1, Math.min(disruptedCount, 3))
    for (let i = 0; i < reviewCount; i++) {
      const isNamed = Math.random() < REVIEW_CONFIG.namedNpcReviewChance
      const customerName = isNamed ? randomNpcName() : undefined
      const text = getAnonReviewText('BRAWL_VICTIM', 'drink')

      const week = this.getCurrentWeek(gameSave.dayNumber)
      this.todaysReviews.push({
        id: nextReviewId(),
        day: gameSave.dayNumber,
        weekNumber: week,
        stars: REVIEW_CONFIG.brawlVictimStars,
        customerType: 'NORMAL',
        customerName,
        isRegular: false,
        trigger: 'BRAWL_VICTIM',
        text,
      })
    }
  }

  private handleDayEnded = ({
    coinsEarned,
    customersServed,
  }: {
    coinsEarned: number
    customersServed: number
  }): void => {
    this.dayCoinsEarned = coinsEarned
    this.dayCustomersServed = customersServed

    const { gameSave, updateSave } = useGameStore.getState()

    // Select featured review for ShopScreen display
    const featuredReview = this.selectFeaturedReview(this.todaysReviews)

    // Flush today's reviews into the persistent store
    updateSave({
      currentWeekReviews: [...gameSave.currentWeekReviews, ...this.todaysReviews],
    })

    // Write day result for ShopScreen
    useDayResultStore.getState().setResult({
      dayNumber: gameSave.dayNumber,
      customersServed: this.dayCustomersServed,
      wrongDrinks: this.dayWrongDrinks,
      coinsEarned: this.dayCoinsEarned,
      eventType: null,  // set by gameLoop after this event
      featuredReview,
      reviewCount: this.todaysReviews.length,
    })
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // Ratings system is inactive during Week 1 (dayNumber 1–7)
  private isActive(gameSave: GameSave): boolean {
    return gameSave.dayNumber > 7
  }

  private getCurrentWeek(dayNumber: number): number {
    return Math.ceil(dayNumber / 7)
  }

  // Get negative review chance with grace period and expectations modifier applied
  private getNegativeChance(baseChance: number, gameSave: GameSave, isRich: boolean): number {
    let chance = baseChance
    if (isRich) chance *= REVIEW_CONFIG.richCustomerReviewMultiplier

    // Dirty bar adds to negative review chance
    const messCount = cleaningSystem.messes.length
    if (messCount >= 3) chance += REVIEW_CONFIG.dirtyBarNegativeBonus

    // Expectations modifier — higher-rated bars get harsher reviews
    chance *= getExpectationsModifier(gameSave.displayedRating)

    // Week 2 grace period — halve negative review probability
    const currentWeek = this.getCurrentWeek(gameSave.dayNumber)
    if (currentWeek === 2) chance *= REVIEW_CONFIG.week2NegativeReviewMultiplier

    return Math.min(chance, 1.0)
  }

  private rollPositiveStars(
    trigger: ReviewTrigger,
    patienceRatio: number,
    gameSave: GameSave,
  ): number {
    if (trigger === 'SERVED_SLOW') return REVIEW_CONFIG.servedSlowStars
    if (trigger === 'SERVED_NORMAL') return REVIEW_CONFIG.servedNormalStars

    // SERVED_FAST: 4 or 5 stars based on prestige
    const prestigePoints = getPrestigePoints(gameSave.upgrades)
    const fiveStarChance = prestigePoints * REVIEW_CONFIG.prestigePerPoint5StarChance
    // Also factor patience ratio — higher patience = more likely 5★
    const bonusChance = (patienceRatio - 0.5) * 0.4
    return Math.random() < fiveStarChance + bonusChance ? 5 : 4
  }

  // Build a review for a regular customer (always leaves a review)
  private buildRegularReview(
    customer: { type: string; regularId?: string; drinkOrder: string; patienceTimer: number; patienceMax: number },
    gameSave: GameSave,
  ): Review {
    const regularId = customer.regularId ?? ''
    const regularConfig = REGULARS_BY_ID[regularId]
    const patienceRatio = customer.patienceMax > 0 ? customer.patienceTimer / customer.patienceMax : 1

    let stars: number
    let trigger: ReviewTrigger
    if (patienceRatio > 0.5) {
      stars = 5
      trigger = 'SERVED_FAST'
    } else if (patienceRatio > 0.25) {
      stars = 4
      trigger = 'SERVED_NORMAL'
    } else {
      stars = 3
      trigger = 'SERVED_SLOW'
    }

    // Clean bar bonus for regulars
    const messCount = cleaningSystem.messes.length
    if (messCount === 0 && stars < 5) stars = Math.min(5, stars + 0.5) // partial — round later via floor
    if (messCount >= 3 && stars > 3) stars = Math.max(3, stars - 1)
    stars = Math.round(stars)

    // Entertainer performing bonus
    const isEntertainerOn = useHudStore.getState().performingEntertainer !== null
    if (isEntertainerOn) stars = Math.min(5, stars + 1)

    const isPositive = stars >= 4
    const text = getRegularReviewText(regularId, isPositive, customer.drinkOrder)

    return {
      id: nextReviewId(),
      day: gameSave.dayNumber,
      weekNumber: this.getCurrentWeek(gameSave.dayNumber),
      stars,
      customerType: 'NORMAL',
      customerName: regularConfig?.displayName,
      isRegular: true,
      regularId,
      trigger,
      text,
    }
  }

  private buildReview({
    trigger,
    stars,
    customer,
    gameSave,
    text,
    customerName,
  }: {
    trigger: ReviewTrigger
    stars: number
    customer: { type: string; isRegular?: boolean; regularId?: string }
    gameSave: GameSave
    text?: string
    customerName?: string
  }): Review {
    return {
      id: nextReviewId(),
      day: gameSave.dayNumber,
      weekNumber: this.getCurrentWeek(gameSave.dayNumber),
      stars,
      customerType: customer.type as Review['customerType'],
      customerName,
      isRegular: customer.isRegular ?? false,
      regularId: customer.regularId,
      trigger,
      text,
    }
  }

  // Select the most notable review for end-of-day display
  // Priority: regular > named NPC > most extreme anonymous
  private selectFeaturedReview(reviews: Review[]): Review | null {
    if (reviews.length === 0) return null

    const regularReview = reviews.find((r) => r.isRegular)
    if (regularReview) return regularReview

    const namedReview = reviews.find((r) => r.customerName)
    if (namedReview) return namedReview

    // Most extreme: lowest stars (negatives more impactful), then highest
    const byStars = [...reviews].sort((a, b) => a.stars - b.stars)
    return byStars[0] ?? null
  }
}

export const reviewSystem = new ReviewSystem()
