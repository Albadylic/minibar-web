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
import { SEATS, SEATS_BY_ID, TABLES, DOORWAY } from '../../config/barLayout'
import type { TableConfig } from '../../config/barLayout'
import { DRINKS_BY_ID } from '../../config/drinks'
import { eventDispatcher } from '../events/eventDispatcher'
import { gameLoop } from '../gameLoop'
import { STAR_RATING } from '../../config/difficulty'
import { entertainerSystem } from './entertainerSystem'
import { cleaningSystem } from './cleaningSystem'

// Obstacle clearance margin for customer path avoidance — seats are 12px outside table edges,
// so margin=10 keeps seats just outside the exclusion zone while still avoiding visual overlap
const CUSTOMER_PATH_MARGIN = 10

class CustomerSystem {
  customers: CustomerEntity[] = []
  private occupiedSeatIds = new Set<string>()
  private timeSinceLastSpawn = 0
  // MBW-56: Store unlocked drinks so reorders stay within unlocked set
  private unlockedDrinks: string[] = []
  // MBW-147/160: Extra Seating upgrade tier gates which seats customers can use
  private extraSeatTier = 0

  reset(): void {
    this.customers = []
    this.occupiedSeatIds.clear()
    this.timeSinceLastSpawn = 0
    this.unlockedDrinks = []
    resetCustomerIdCounter()
  }

  // MBW-147/160: Called from DayScreen after game loop starts with the player's Extra Seating tier
  setExtraSeatTier(tier: number): void {
    this.extraSeatTier = tier
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
    // MBW-167: Exclude seats blocked by uncleaned glasses
    // MBW-147/160: Exclude seats that require a higher Extra Seating tier than the player owns
    const available = SEATS.filter(
      (s) =>
        !this.occupiedSeatIds.has(s.id) &&
        !cleaningSystem.isBlocked(s.id) &&
        (s.upgradeRequired === null || s.upgradeRequired <= this.extraSeatTier),
    )
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

    // Compute obstacle-avoiding path to seat, skipping the destination table itself
    const seatTableId = SEATS_BY_ID[seatId]?.tableId ?? null
    const approachWaypoints = this.computePath(DOORWAY, seatPosition, seatTableId)

    const customer: CustomerEntity = {
      id: nextCustomerId(),
      type,
      skin,
      status: 'APPROACHING',
      seatId,
      position: { x: DOORWAY.x, y: DOORWAY.y },
      targetPosition: { x: seatPosition.x, y: seatPosition.y },
      waypoints: approachWaypoints,
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
    // Compute obstacle-avoiding path back to doorway, skipping the customer's own table
    const seatTableId = SEATS_BY_ID[customer.seatId]?.tableId ?? null
    customer.waypoints = this.computePath(customer.position, DOORWAY, seatTableId)
    this.occupiedSeatIds.delete(customer.seatId)
    eventDispatcher.emit('CUSTOMER_LEFT', { customerId: customer.id })
  }

  // Returns true if the customer reached their final targetPosition this tick.
  // Advances through waypoints one at a time; falls back to targetPosition when empty.
  private moveToward(
    customer: CustomerEntity,
    dt: number,
    speed: number,
  ): boolean {
    const target = customer.waypoints.length > 0 ? customer.waypoints[0]! : customer.targetPosition
    const dx = target.x - customer.position.x
    const dy = target.y - customer.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = speed * dt

    if (dist <= step) {
      customer.position.x = target.x
      customer.position.y = target.y
      if (customer.waypoints.length > 0) {
        customer.waypoints.shift()
        // Return true only when the last waypoint (= final destination) was just reached
        return customer.waypoints.length === 0
      }
      return true
    }

    customer.position.x += (dx / dist) * step
    customer.position.y += (dy / dist) * step
    return false
  }

  // Computes a waypoint path from `from` to `to` that avoids non-target tables.
  // Identical algorithm to cleaningSystem — Liang-Barsky + corner detour, depth-limited.
  private computePath(
    from: { x: number; y: number },
    to: { x: number; y: number },
    skipTableId: string | null,
    depth = 0,
  ): Array<{ x: number; y: number }> {
    if (depth > 4) return [to]

    let blockingTable: TableConfig | null = null
    let earliestT = Infinity

    for (const table of TABLES) {
      if (table.id === skipTableId) continue
      if (this.pointInsideTable(from, table, CUSTOMER_PATH_MARGIN + 1)) continue

      const t = this.pathEntersTableAt(from, to, table, CUSTOMER_PATH_MARGIN)
      if (t !== null && t < earliestT) {
        earliestT = t
        blockingTable = table
      }
    }

    if (!blockingTable) return [to]

    const bt = blockingTable
    const halfW = bt.width  / 2 + CUSTOMER_PATH_MARGIN
    const halfH = bt.height / 2 + CUSTOMER_PATH_MARGIN
    const corners = [
      { x: bt.position.x - halfW, y: bt.position.y - halfH },
      { x: bt.position.x + halfW, y: bt.position.y - halfH },
      { x: bt.position.x - halfW, y: bt.position.y + halfH },
      { x: bt.position.x + halfW, y: bt.position.y + halfH },
    ]
    let bestCorner = corners[0]!
    let bestCost = Infinity
    for (const c of corners) {
      const cost = Math.hypot(c.x - from.x, c.y - from.y) + Math.hypot(to.x - c.x, to.y - c.y)
      if (cost < bestCost) { bestCost = cost; bestCorner = c }
    }

    const pathToCorner   = this.computePath(from,       bestCorner, skipTableId, depth + 1)
    const pathFromCorner = this.computePath(bestCorner, to,         skipTableId, depth + 1)
    return [...pathToCorner, ...pathFromCorner]
  }

  private pathEntersTableAt(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    table: TableConfig,
    margin: number,
  ): number | null {
    const left   = table.position.x - table.width  / 2 - margin
    const right  = table.position.x + table.width  / 2 + margin
    const top    = table.position.y - table.height / 2 - margin
    const bottom = table.position.y + table.height / 2 + margin
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    let tEnter = 0
    let tExit = 1
    for (const { p, q } of [
      { p: -dx, q: p1.x - left  },
      { p:  dx, q: right - p1.x },
      { p: -dy, q: p1.y - top   },
      { p:  dy, q: bottom - p1.y },
    ]) {
      if (p === 0) { if (q < 0) return null }
      else {
        const t = q / p
        if (p < 0) tEnter = Math.max(tEnter, t)
        else       tExit  = Math.min(tExit,  t)
      }
    }
    if (tEnter > tExit || tExit < 0 || tEnter > 1) return null
    return Math.max(0, tEnter)
  }

  private pointInsideTable(p: { x: number; y: number }, table: TableConfig, margin: number): boolean {
    return (
      p.x >= table.position.x - table.width  / 2 - margin &&
      p.x <= table.position.x + table.width  / 2 + margin &&
      p.y >= table.position.y - table.height / 2 - margin &&
      p.y <= table.position.y + table.height / 2 + margin
    )
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

  // MBW-150: Called when brawler reaches a seat — cancels that customer's order and ejects them
  disruptByBrawler(customerId: string): void {
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
