// MBW-182: Waiter NPC — autonomous drink serving
// Tier 1: 1 order at a time, 70px/s
// Tier 2: 2 concurrent orders, 100px/s
// Tier 3: 3 concurrent orders, 130px/s, prioritises lowest-patience customers
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { WaiterWorker } from '../../entities/waiter'
import { customerSystem } from './customerSystem'
import { entertainerSystem } from './entertainerSystem'
import { eventDispatcher } from '../events/eventDispatcher'
import { gameLoop } from '../gameLoop'
import { DRINKS_BY_ID } from '../../config/drinks'
import { STAR_RATING } from '../../config/difficulty'
import { BAR_COUNTER_BOTTOM } from '../../config/barLayout'

const WAITER_RADIUS = 8
const REACH_DIST = 12  // canvas units — close enough to "arrive"
// Waiter parks here when idle
const WAITER_HOME = { x: 344, y: 570 }
// Point on bar counter where waiter "picks up" the drink
const BAR_PICKUP = { x: 187, y: BAR_COUNTER_BOTTOM }
// Walk speed per tier (px/s)
const SPEEDS: Record<1 | 2 | 3, number> = { 1: 70, 2: 100, 3: 130 }

const LABEL_STYLE = new TextStyle({ fontSize: 9, fill: 0xffffff, fontFamily: 'Georgia, serif' })

class WaiterSystem {
  private workers: WaiterWorker[] = []
  private graphics: Map<number, Graphics> = new Map()
  private labels: Map<number, Text> = new Map()
  private stage: Container | null = null
  private tier: 1 | 2 | 3 = 1
  private prioritizeLowestPatience = false

  init(app: Application, waiterTier: 1 | 2 | 3): void {
    this.tier = waiterTier
    this.prioritizeLowestPatience = waiterTier === 3
    this.stage = new Container()
    app.stage.addChild(this.stage)

    for (let i = 0; i < waiterTier; i++) {
      const worker: WaiterWorker = {
        id: i,
        status: 'IDLE',
        position: { x: WAITER_HOME.x, y: WAITER_HOME.y },
        targetPosition: { x: WAITER_HOME.x, y: WAITER_HOME.y },
        assignedCustomerId: null,
        drinkToServe: null,
      }
      this.workers.push(worker)

      const g = new Graphics()
      g.circle(0, 0, WAITER_RADIUS)
      g.fill({ color: 0x44a899 })
      g.position.set(WAITER_HOME.x, WAITER_HOME.y)
      this.stage.addChild(g)
      this.graphics.set(i, g)

      const lbl = new Text({ text: 'W', style: LABEL_STYLE })
      lbl.anchor.set(0.5)
      lbl.position.set(WAITER_HOME.x, WAITER_HOME.y)
      this.stage.addChild(lbl)
      this.labels.set(i, lbl)
    }
  }

  destroy(): void {
    this.stage?.destroy({ children: true })
    this.stage = null
    this.workers = []
    this.graphics.clear()
    this.labels.clear()
  }

  update(dt: number): void {
    if (this.workers.length === 0) return
    const speed = SPEEDS[this.tier]

    // Build set of currently targeted customers before ticking (add to it as idle workers assign)
    const targeted = new Set<string>(
      this.workers.filter((w) => w.assignedCustomerId !== null).map((w) => w.assignedCustomerId!),
    )

    for (const worker of this.workers) {
      this.tickWorker(worker, dt, speed, targeted)
      const g = this.graphics.get(worker.id)
      const lbl = this.labels.get(worker.id)
      g?.position.set(worker.position.x, worker.position.y)
      lbl?.position.set(worker.position.x, worker.position.y)
    }
  }

  private tickWorker(
    worker: WaiterWorker,
    dt: number,
    speed: number,
    targeted: Set<string>,
  ): void {
    switch (worker.status) {
      case 'IDLE': {
        const customerId = this.findCustomer(targeted)
        if (!customerId) return
        const customer = customerSystem.getCustomer(customerId)
        if (!customer) return
        worker.assignedCustomerId = customerId
        worker.drinkToServe = customer.drinkOrder
        worker.status = 'GOING_TO_BAR'
        worker.targetPosition = { x: BAR_PICKUP.x, y: BAR_PICKUP.y }
        targeted.add(customerId)
        break
      }

      case 'GOING_TO_BAR': {
        if (this.moveToward(worker, dt, speed)) {
          // Customer may have left or been served while we were en route
          const customer = worker.assignedCustomerId
            ? customerSystem.getCustomer(worker.assignedCustomerId)
            : null
          if (!customer || customer.status !== 'WAITING') {
            this.returnHome(worker)
            return
          }
          worker.status = 'GOING_TO_CUSTOMER'
          worker.targetPosition = { x: customer.position.x, y: customer.position.y }
        }
        break
      }

      case 'GOING_TO_CUSTOMER': {
        if (this.moveToward(worker, dt, speed)) {
          this.serveAssignedCustomer(worker)
        }
        break
      }

      case 'RETURNING': {
        if (this.moveToward(worker, dt, speed)) {
          worker.status = 'IDLE'
        }
        break
      }
    }
  }

  // Returns true when the worker reaches the target this tick
  private moveToward(worker: WaiterWorker, dt: number, speed: number): boolean {
    const dx = worker.targetPosition.x - worker.position.x
    const dy = worker.targetPosition.y - worker.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = speed * dt

    if (dist <= REACH_DIST || dist <= step) {
      worker.position.x = worker.targetPosition.x
      worker.position.y = worker.targetPosition.y
      return true
    }

    worker.position.x += (dx / dist) * step
    worker.position.y += (dy / dist) * step
    return false
  }

  private serveAssignedCustomer(worker: WaiterWorker): void {
    const customerId = worker.assignedCustomerId
    if (!customerId) { this.returnHome(worker); return }

    const customer = customerSystem.getCustomer(customerId)
    if (!customer || customer.status !== 'WAITING') {
      this.returnHome(worker)
      return
    }

    const drink = DRINKS_BY_ID[customer.drinkOrder]
    const coins = Math.round(
      (drink?.coinReward ?? 0)
      * customer.coinMultiplier
      * gameLoop.dayCoinMultiplier
      * entertainerSystem.getCoinBoostMult(),
    )

    gameLoop.addCoins(coins)
    gameLoop.adjustStarRating(STAR_RATING.gainPerCorrectServe)
    gameLoop.recordCustomerServed()
    customerSystem.serveCustomer(customerId)

    eventDispatcher.emit('DRINK_SERVED', {
      customerId,
      drinkId: customer.drinkOrder,
      wasCorrect: true,
      coinsEarned: coins,
    })

    this.returnHome(worker)
  }

  private returnHome(worker: WaiterWorker): void {
    worker.assignedCustomerId = null
    worker.drinkToServe = null
    worker.status = 'RETURNING'
    worker.targetPosition = { x: WAITER_HOME.x, y: WAITER_HOME.y }
  }

  // Find the best unassigned WAITING customer
  private findCustomer(targeted: Set<string>): string | null {
    const waiting = customerSystem.customers.filter(
      (c) => c.status === 'WAITING' && c.canBeServed && !targeted.has(c.id),
    )
    if (waiting.length === 0) return null

    if (this.prioritizeLowestPatience) {
      waiting.sort((a, b) => a.patienceTimer - b.patienceTimer)
    }

    return waiting[0]!.id
  }

  get isActive(): boolean {
    return this.workers.length > 0
  }
}

export const waiterSystem = new WaiterSystem()
