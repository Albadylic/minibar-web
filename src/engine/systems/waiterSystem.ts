// Waiter NPC — food delivery from service counter to tables
// Tier 1: 1 delivery at a time, slow
// Tier 2: 2 simultaneous, faster
// Tier 3: 3 simultaneous, fastest — prioritises lowest patience remaining
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { WaiterWorker } from '../../entities/waiter'
import { kitchenSystem } from './kitchenSystem'
import { customerSystem } from './customerSystem'
import { PLATE_SLOT_POSITIONS } from '../../config/barLayout'

const WAITER_RADIUS = 8
const REACH_DIST = 12
// Waiter parks at bottom-right when idle
const WAITER_HOME = { x: 351, y: 580 }
// Service counter pickup point (near middle plate)
const SERVICE_PICKUP = { x: PLATE_SLOT_POSITIONS[1]!.x, y: PLATE_SLOT_POSITIONS[1]!.y }
const SPEEDS: Record<1 | 2 | 3, number> = { 1: 70, 2: 100, 3: 130 }

const LABEL_STYLE = new TextStyle({ fontSize: 9, fill: 0x333333, fontFamily: 'Georgia, serif' })

class WaiterSystem {
  private workers: WaiterWorker[] = []
  private graphics: Map<number, Graphics> = new Map()
  private labels: Map<number, Text> = new Map()
  private stage: Container | null = null
  private tier: 1 | 2 | 3 = 1
  private prioritiseLowest = false

  init(app: Application, tier: 1 | 2 | 3): void {
    this.tier = tier
    this.prioritiseLowest = tier === 3
    this.stage = new Container()
    app.stage.addChild(this.stage)

    for (let i = 0; i < tier; i++) {
      const worker: WaiterWorker = {
        id: i,
        status: 'IDLE',
        position: { ...WAITER_HOME },
        targetPosition: { ...WAITER_HOME },
        assignedCustomerId: null,
        assignedPlateId: null,
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

    const assignedCustomers = new Set<string>(
      this.workers.filter((w) => w.assignedCustomerId).map((w) => w.assignedCustomerId!),
    )

    for (const worker of this.workers) {
      this.tickWorker(worker, dt, speed, assignedCustomers)
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
    assignedCustomers: Set<string>,
  ): void {
    switch (worker.status) {
      case 'IDLE': {
        const result = kitchenSystem.getPlatedOrder()
        if (!result) return
        // Don't pick up if another worker is already assigned to this customer
        if (assignedCustomers.has(result.customerId)) return

        // Prioritise lowest patience if tier 3
        let chosenCustomerId = result.customerId
        let chosenPlateId = result.plate.id
        if (this.prioritiseLowest) {
          // Find the plate whose customer has the least patience remaining
          let lowest = Infinity
          for (const plate of kitchenSystem.plates) {
            if (plate.status !== 'plated' || !plate.foodOrder) continue
            if (assignedCustomers.has(plate.foodOrder.customerId)) continue
            const c = customerSystem.getCustomer(plate.foodOrder.customerId)
            if (!c) continue
            const rem = plate.foodOrder.patienceRemaining
            if (rem < lowest) {
              lowest = rem
              chosenCustomerId = plate.foodOrder.customerId
              chosenPlateId = plate.id
            }
          }
        }

        worker.assignedCustomerId = chosenCustomerId
        worker.assignedPlateId = chosenPlateId
        worker.status = 'GOING_TO_SERVICE_COUNTER'
        worker.targetPosition = { ...SERVICE_PICKUP }
        assignedCustomers.add(chosenCustomerId)
        break
      }

      case 'GOING_TO_SERVICE_COUNTER': {
        if (this.moveToward(worker, dt, speed)) {
          const plate = kitchenSystem.plates.find((p) => p.id === worker.assignedPlateId)
          if (!plate || plate.status !== 'plated') {
            this.returnHome(worker)
            return
          }
          const customer = worker.assignedCustomerId
            ? customerSystem.getCustomer(worker.assignedCustomerId)
            : null
          if (!customer) { this.returnHome(worker); return }

          worker.status = 'GOING_TO_CUSTOMER'
          worker.targetPosition = { x: customer.position.x, y: customer.position.y }
        }
        break
      }

      case 'GOING_TO_CUSTOMER': {
        if (this.moveToward(worker, dt, speed)) {
          const plate = kitchenSystem.plates.find((p) => p.id === worker.assignedPlateId)
          if (!plate || !plate.foodOrder || !worker.assignedCustomerId) {
            this.returnHome(worker)
            return
          }
          kitchenSystem.waiterDeliver(plate, worker.assignedCustomerId)
          this.returnHome(worker)
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

  private returnHome(worker: WaiterWorker): void {
    worker.assignedCustomerId = null
    worker.assignedPlateId = null
    worker.status = 'RETURNING'
    worker.targetPosition = { ...WAITER_HOME }
  }

  get isActive(): boolean {
    return this.workers.length > 0
  }
}

export const waiterSystem = new WaiterSystem()
