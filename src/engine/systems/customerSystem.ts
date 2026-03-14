// MBW-18: Customer spawning by phase
// MBW-19: Patience timer countdown
// MBW-21: Walking animation (doorway → seat)
// MBW-22: Leaving animation (seat → doorway)
// MBW-24: Lingering after served
// MBW-74: Hooligan spawning on Game Days
// MBW-156: Removed afternoon departure/return rule — hooligans stay for full day
import type { CustomerEntity, CustomerType } from '../../entities/customer'
import { nextCustomerId, resetCustomerIdCounter } from '../../entities/customer'
import type { DayPhase } from '../../types/day'
import type { DayConfig } from '../../types/day'
import { CUSTOMER_CONFIGS, randomSkin, randomInRange } from '../../config/customers'
import { SEATS, DOORWAY } from '../../config/barLayout'
import { DRINKS_BY_ID } from '../../config/drinks'
import { eventDispatcher } from '../events/eventDispatcher'
import { gameLoop } from '../gameLoop'
import { STAR_RATING } from '../../config/difficulty'
import { entertainerSystem } from './entertainerSystem'

class CustomerSystem {
  customers: CustomerEntity[] = []
  private occupiedSeatIds = new Set<string>()
  private timeSinceLastSpawn = 0
  // MBW-56: Store unlocked drinks so reorders stay within unlocked set
  private unlockedDrinks: string[] = []

  reset(): void {
    this.customers = []
    this.occupiedSeatIds.clear()
    this.timeSinceLastSpawn = 0
    this.unlockedDrinks = []
    resetCustomerIdCounter()
  }

  // Main update — called each fixed tick from the game loop
  update(
    dt: number,
    dayConfig: DayConfig,
    phase: DayPhase,
    isLastOrders: boolean,
    unlockedDrinks: string[],
  ): void {
    // MBW-56: Keep unlocked drinks in sync so reorders use the correct set
    this.unlockedDrinks = unlockedDrinks

    // MBW-18: Spawn new customers each tick (suppressed during Last Orders)
    if (!isLastOrders) {
      this.updateSpawning(dt, dayConfig, phase, unlockedDrinks)
    }

    // Update all active customers
    const toRemove: string[] = []
    for (const customer of this.customers) {
      this.updateCustomer(customer, dt)
      if (customer.status === 'LEAVING' && this.hasReachedTarget(customer)) {
        toRemove.push(customer.id)
      }
    }

    // Remove customers who reached the doorway
    for (const id of toRemove) {
      this.removeCustomer(id)
    }
  }

  // MBW-18: Probabilistic spawning gated by arrival rate and seat availability
  // MBW-74: Weighted type selection — picks NORMAL or HOOLIGAN based on DayConfig weights
  private updateSpawning(
    dt: number,
    dayConfig: DayConfig,
    phase: DayPhase,
    unlockedDrinks: string[],
  ): void {
    this.timeSinceLastSpawn += dt

    const phaseKey = phase.toLowerCase() as keyof typeof dayConfig.arrivalRates
    const rate = dayConfig.arrivalRates[phaseKey]
    const interval = 1 / rate

    if (this.timeSinceLastSpawn < interval) return

    const availableSeat = this.pickAvailableSeat()
    if (!availableSeat) return // bar full

    // Reset timer with slight randomisation to avoid perfect metering
    this.timeSinceLastSpawn = -(Math.random() * interval * 0.25)

    let customerType = this.rollCustomerType(dayConfig.customerWeights, phase)
    // MBW-181: Doorman tier 2 — chance to turn away a hooligan at the door
    if (customerType === 'HOOLIGAN' && dayConfig.modifiers.hooliganFilterChance > 0 && Math.random() < dayConfig.modifiers.hooliganFilterChance) {
      customerType = 'NORMAL'
    }
    // MBW-181: Doorman tier 3 — rich clientele get a patience boost on entry
    const effectivePatienceMult = customerType === 'RICH'
      ? dayConfig.modifiers.patienceMultiplier * dayConfig.modifiers.richPatienceMultiplier
      : dayConfig.modifiers.patienceMultiplier
    this.spawnCustomer(availableSeat.id, availableSeat.position, unlockedDrinks, effectivePatienceMult, customerType)
  }

  // MBW-74/91/95: Weighted random selection across all customer types
  // Phase gates: hooligans won't spawn in Afternoon; rich won't spawn at Night
  private rollCustomerType(
    weights: DayConfig['customerWeights'],
    phase: DayPhase,
  ): CustomerType {
    const effectiveHooligan = CUSTOMER_CONFIGS.HOOLIGAN.preferredPhases.includes(phase) ? weights.hooligan : 0
    const effectiveRich = CUSTOMER_CONFIGS.RICH.preferredPhases.includes(phase) ? (weights.rich ?? 0) : 0
    const effectiveDrunk = weights.drunk ?? 0
    const total = weights.normal + effectiveHooligan + effectiveRich + effectiveDrunk
    if (total === 0) return 'NORMAL'
    const r = Math.random() * total
    if (r < weights.normal) return 'NORMAL'
    if (r < weights.normal + effectiveHooligan) return 'HOOLIGAN'
    if (r < weights.normal + effectiveHooligan + effectiveRich) return 'RICH'
    return 'DRUNK'
  }

  private pickAvailableSeat(): (typeof SEATS)[number] | null {
    const available = SEATS.filter((s) => !this.occupiedSeatIds.has(s.id))
    if (available.length === 0) return null
    return available[Math.floor(Math.random() * available.length)]!
  }

  private spawnCustomer(
    seatId: string,
    seatPosition: { x: number; y: number },
    unlockedDrinks: string[],
    patienceMultiplier: number,
    type: CustomerType = 'NORMAL',
  ): void {
    const config = CUSTOMER_CONFIGS[type]
    const skin = randomSkin()
    const patienceMax = randomInRange(config.patience.min, config.patience.max) * patienceMultiplier
    // MBW-86: Weighted drink selection by customer type affinity
    const drinkOrder = this.rollDrinkOrder(unlockedDrinks, type)

    const customer: CustomerEntity = {
      id: nextCustomerId(),
      type,
      skin,
      status: 'APPROACHING',
      seatId,
      position: { x: DOORWAY.x, y: DOORWAY.y },
      targetPosition: { x: seatPosition.x, y: seatPosition.y },
      drinkOrder,
      patienceTimer: patienceMax,
      patienceMax,
      lingerTimer: 0,
      drinksServed: 0,
      willReorder: false,
      canBrawl: config.canBrawl,
      canBeServed: config.canBeServed,
      coinMultiplier: config.coinMultiplier,
    }

    this.occupiedSeatIds.add(seatId)
    this.customers.push(customer)
    eventDispatcher.emit('CUSTOMER_ARRIVED', { customerId: customer.id, seatId })
  }

  // MBW-86: Weighted selection — drink weights come from DrinkConfig.customerAffinities
  private rollDrinkOrder(unlockedDrinks: string[], type: CustomerType = 'NORMAL'): string {
    if (unlockedDrinks.length === 0) return 'lager'

    const weights: number[] = unlockedDrinks.map((drinkId) => {
      const drink = DRINKS_BY_ID[drinkId]
      if (!drink) return 1.0
      const affs = drink.customerAffinities
      if (type === 'HOOLIGAN') return affs.hooligan ?? affs.normal
      if (type === 'RICH') return affs.rich ?? affs.normal
      return affs.normal
    })

    const total = weights.reduce((sum, w) => sum + w, 0)
    let r = Math.random() * total
    for (let i = 0; i < unlockedDrinks.length; i++) {
      r -= weights[i]!
      if (r <= 0) return unlockedDrinks[i]!
    }
    return unlockedDrinks[unlockedDrinks.length - 1]!
  }

  private updateCustomer(customer: CustomerEntity, dt: number): void {
    switch (customer.status) {
      case 'APPROACHING':
        this.updateApproaching(customer, dt) // MBW-21
        break
      case 'WAITING':
        this.updateWaiting(customer, dt) // MBW-19
        break
      case 'SERVED_LINGERING':
        this.updateLingering(customer, dt) // MBW-24
        break
      case 'REORDERING':
        // Brief state — immediately transition to WAITING with new order
        customer.status = 'WAITING'
        break
      case 'BRAWLING':
        // MBW-78: Brawl system controls BRAWLING customers — no tick needed here
        break
      case 'LEAVING':
        this.updateLeaving(customer, dt) // MBW-22
        break
    }
  }

  // MBW-21: Interpolate from doorway to seat
  private updateApproaching(customer: CustomerEntity, dt: number): void {
    const speed = CUSTOMER_CONFIGS.NORMAL.walkSpeed
    const moved = this.moveToward(customer, dt, speed)
    if (moved) {
      customer.status = 'WAITING'
      // Start patience timer only once seated
    }
  }

  // MBW-19: Patience countdown
  // MBW-78: Hooligans trigger a brawl instead of leaving when patience expires
  // MBW-116: Patience decay slowed while an entertainer is performing
  private updateWaiting(customer: CustomerEntity, dt: number): void {
    customer.patienceTimer -= dt * entertainerSystem.getDecayMult(customer.type)
    if (customer.patienceTimer <= 0) {
      customer.patienceTimer = 0
      eventDispatcher.emit('PATIENCE_EXPIRED', { customerId: customer.id })

      if (customer.canBrawl) {
        // Brawl system handles this — sets status to BRAWLING
        customer.status = 'BRAWLING'
        return
      }

      // Normal customer — star rating loss and leave
      const isGameOver = gameLoop.adjustStarRating(-STAR_RATING.lossPerBadReview)
      if (isGameOver) {
        gameLoop.triggerGameOver()
        return
      }
      this.startLeaving(customer)
    }
  }

  // MBW-24: Linger after being served
  private updateLingering(customer: CustomerEntity, dt: number): void {
    customer.lingerTimer -= dt
    if (customer.lingerTimer <= 0) {
      if (customer.willReorder) {
        // MBW-56: Use unlocked drinks, not the full DRINKS_BY_ID set
        const config = CUSTOMER_CONFIGS[customer.type]
        customer.drinkOrder = this.rollDrinkOrder(this.unlockedDrinks, customer.type)
        customer.patienceTimer = randomInRange(config.patience.min, config.patience.max)
        customer.patienceMax = customer.patienceTimer
        customer.status = 'REORDERING'
      } else {
        this.startLeaving(customer)
      }
    }
  }

  // MBW-22: Walk from seat back to doorway, then remove
  private updateLeaving(customer: CustomerEntity, dt: number): void {
    this.moveToward(customer, dt, CUSTOMER_CONFIGS.NORMAL.walkSpeed)
  }

  private startLeaving(customer: CustomerEntity): void {
    customer.status = 'LEAVING'
    customer.targetPosition = { x: DOORWAY.x, y: DOORWAY.y }
    this.occupiedSeatIds.delete(customer.seatId)
    eventDispatcher.emit('CUSTOMER_LEFT', { customerId: customer.id })
  }

  // Returns true if the customer reached their target this tick
  private moveToward(
    customer: CustomerEntity,
    dt: number,
    speed: number,
  ): boolean {
    const dx = customer.targetPosition.x - customer.position.x
    const dy = customer.targetPosition.y - customer.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = speed * dt

    if (dist <= step) {
      customer.position.x = customer.targetPosition.x
      customer.position.y = customer.targetPosition.y
      return true
    }

    customer.position.x += (dx / dist) * step
    customer.position.y += (dy / dist) * step
    return false
  }

  private hasReachedTarget(customer: CustomerEntity): boolean {
    return (
      customer.position.x === customer.targetPosition.x &&
      customer.position.y === customer.targetPosition.y
    )
  }

  private removeCustomer(id: string): void {
    this.customers = this.customers.filter((c) => c.id !== id)
  }

  // Called by serving system when a customer is successfully served
  serveCustomer(customerId: string): boolean {
    const customer = this.customers.find((c) => c.id === customerId)
    if (!customer || customer.status !== 'WAITING') return false
    const config = CUSTOMER_CONFIGS[customer.type]

    customer.drinksServed++
    customer.willReorder = Math.random() < config.reorderChance
    customer.lingerTimer = randomInRange(config.linger.min, config.linger.max)
    customer.status = 'SERVED_LINGERING'
    return true
  }

  // Called by serving system on wrong drink — customer leaves immediately
  wrongDrink(customerId: string): void {
    const customer = this.customers.find((c) => c.id === customerId)
    if (!customer) return
    this.startLeaving(customer)
  }

  // MBW-95: Called by player tap or security to remove a drunk customer
  escortDrunk(customerId: string): void {
    const customer = this.customers.find((c) => c.id === customerId)
    if (!customer) return
    this.startLeaving(customer)
  }

  // MBW-80: Called by brawl system to eject brawling customers regardless of current status
  forceLeaveBrawl(customerId: string): void {
    const customer = this.customers.find((c) => c.id === customerId)
    if (!customer) return
    this.startLeaving(customer)
  }

  getCustomer(id: string): CustomerEntity | undefined {
    return this.customers.find((c) => c.id === id)
  }

  isOccupied(seatId: string): boolean {
    return this.occupiedSeatIds.has(seatId)
  }
}

export const customerSystem = new CustomerSystem()
