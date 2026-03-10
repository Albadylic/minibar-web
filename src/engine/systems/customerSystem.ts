// MBW-18: Customer spawning by phase
// MBW-19: Patience timer countdown
// MBW-21: Walking animation (doorway → seat)
// MBW-22: Leaving animation (seat → doorway)
// MBW-24: Lingering after served
import type { CustomerEntity } from '../../entities/customer'
import { nextCustomerId, resetCustomerIdCounter } from '../../entities/customer'
import type { DayPhase } from '../../types/day'
import type { DayConfig } from '../../types/day'
import { CUSTOMER_CONFIGS, randomSkin, randomInRange } from '../../config/customers'
import { SEATS, DOORWAY } from '../../config/barLayout'
import { DRINKS_BY_ID } from '../../config/drinks'
import { eventDispatcher } from '../events/eventDispatcher'
import { gameLoop } from '../gameLoop'
import { STAR_RATING } from '../../config/difficulty'

class CustomerSystem {
  customers: CustomerEntity[] = []
  private occupiedSeatIds = new Set<string>()
  private timeSinceLastSpawn = 0

  reset(): void {
    this.customers = []
    this.occupiedSeatIds.clear()
    this.timeSinceLastSpawn = 0
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
    // MBW-18: Spawn
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

    this.spawnCustomer(availableSeat.id, availableSeat.position, unlockedDrinks, dayConfig.modifiers.patienceMultiplier)
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
  ): void {
    const config = CUSTOMER_CONFIGS.NORMAL
    const skin = randomSkin()
    const drinkOrder = this.rollDrinkOrder(unlockedDrinks)
    const patienceMax = randomInRange(config.patience.min, config.patience.max) * patienceMultiplier

    const customer: CustomerEntity = {
      id: nextCustomerId(),
      type: 'NORMAL',
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
    }

    this.occupiedSeatIds.add(seatId)
    this.customers.push(customer)
    eventDispatcher.emit('CUSTOMER_ARRIVED', { customerId: customer.id, seatId })
  }

  private rollDrinkOrder(unlockedDrinks: string[]): string {
    // Equal weight among unlocked drinks for NORMAL customers in V1.0
    // (Drink-customer affinity system is V2.0 — MBW-86)
    if (unlockedDrinks.length === 0) return 'lager'
    return unlockedDrinks[Math.floor(Math.random() * unlockedDrinks.length)]!
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
  private updateWaiting(customer: CustomerEntity, dt: number): void {
    customer.patienceTimer -= dt
    if (customer.patienceTimer <= 0) {
      customer.patienceTimer = 0
      eventDispatcher.emit('PATIENCE_EXPIRED', { customerId: customer.id })
      // Star rating loss
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
        const allDrinkIds = Object.keys(DRINKS_BY_ID)
        customer.drinkOrder = this.rollDrinkOrder(allDrinkIds)
        customer.patienceTimer = randomInRange(
          CUSTOMER_CONFIGS.NORMAL.patience.min,
          CUSTOMER_CONFIGS.NORMAL.patience.max,
        )
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

    customer.drinksServed++
    customer.willReorder = Math.random() < CUSTOMER_CONFIGS.NORMAL.reorderChance
    customer.lingerTimer = randomInRange(
      CUSTOMER_CONFIGS.NORMAL.linger.min,
      CUSTOMER_CONFIGS.NORMAL.linger.max,
    )
    customer.status = 'SERVED_LINGERING'
    return true
  }

  // Called by serving system on wrong drink — customer leaves immediately
  wrongDrink(customerId: string): void {
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
