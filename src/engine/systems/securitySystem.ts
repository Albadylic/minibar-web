// MBW-88: Bouncer upgrade — NPC sprite walks to brawler and resolves on arrival
// MBW-89: Tier 2 Security Team — faster, handles multiple brawls simultaneously
// MBW-180: Tier 3 Security Team — fastest response, handles all brawls, near-instant drunk escort
import { Container, Graphics } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { SecurityState } from '../../entities/security'
import { eventDispatcher } from '../events/eventDispatcher'
import { brawlSystem } from './brawlSystem'
import { customerSystem } from './customerSystem'
import type { CustomerEntity } from '../../entities/customer'

// Drunk escort delay per tier (seconds)
const DRUNK_ESCORT_DELAYS: Record<1 | 2 | 3, number> = { 1: 6, 2: 3, 3: 1 }
// px/s per tier — faster tiers close distance quicker
const BOUNCER_SPEEDS: Record<1 | 2 | 3, number> = { 1: 90, 2: 150, 3: 250 }

const BOUNCER_START = { x: 330, y: 615 } // right of doorway at entrance
const BOUNCER_REACH = 15                  // px — resolve brawl when within this distance
const BOUNCER_RADIUS = 8

class SecuritySystem {
  private state: SecurityState | null = null
  private drunkTimers = new Map<string, number>() // customerId → countdown
  private stage: Container | null = null
  private bouncerGraphic: Graphics | null = null

  init(bouncerTier: 0 | 1 | 2 | 3): void {
    if (bouncerTier === 0) {
      this.state = null
      return
    }
    this.state = {
      tier: bouncerTier,
      responses: [],
      bouncerPos: { ...BOUNCER_START },
      returning: false,
    }
    eventDispatcher.on('BRAWL_STARTED', this.handleBrawlStarted)
    eventDispatcher.on('CUSTOMER_ARRIVED', this.handleCustomerArrived)
    eventDispatcher.on('DRUNK_ESCORTED', this.handleDrunkEscorted)
  }

  initGraphics(app: Application): void {
    if (!this.state) return
    this.stage = new Container()
    app.stage.addChild(this.stage)
    this.bouncerGraphic = new Graphics()
    this.bouncerGraphic.circle(0, 0, BOUNCER_RADIUS)
    this.bouncerGraphic.fill({ color: 0x111111 })
    this.bouncerGraphic.position.set(this.state.bouncerPos.x, this.state.bouncerPos.y)
    this.stage.addChild(this.bouncerGraphic)
  }

  destroyGraphics(): void {
    this.stage?.destroy({ children: true })
    this.stage = null
    this.bouncerGraphic = null
  }

  destroy(): void {
    this.destroyGraphics()
    eventDispatcher.off('BRAWL_STARTED', this.handleBrawlStarted)
    eventDispatcher.off('CUSTOMER_ARRIVED', this.handleCustomerArrived)
    eventDispatcher.off('DRUNK_ESCORTED', this.handleDrunkEscorted)
    this.state = null
    this.drunkTimers.clear()
  }

  reset(): void {
    this.state = null
    this.drunkTimers.clear()
  }

  // MBW-88: On BRAWL_STARTED, queue a response (Tier 1 max 1 active; Tier 2/3 handle multiple)
  private handleBrawlStarted = ({ brawlId, instigatorId }: { brawlId: string; instigatorId: string }): void => {
    if (!this.state) return
    const { tier, responses } = this.state
    if (tier === 1 && responses.length >= 1) return
    this.state.responses.push({ brawlId, instigatorId })
  }

  // MBW-97: Auto-escort drunks when security is owned
  private handleCustomerArrived = ({ customerId }: { customerId: string }): void => {
    if (!this.state) return
    const customer = customerSystem.getCustomer(customerId)
    if (!customer || customer.canBeServed) return // only drunks
    this.drunkTimers.set(customerId, DRUNK_ESCORT_DELAYS[this.state.tier])
  }

  private handleDrunkEscorted = ({ customerId }: { customerId: string }): void => {
    this.drunkTimers.delete(customerId)
  }

  update(dt: number): void {
    if (!this.state) return

    // NPC movement
    const { state } = this

    if (state.responses.length > 0) {
      const response = state.responses[0]!
      const brawler = customerSystem.getCustomer(response.instigatorId)

      if (!brawler) {
        // Brawl already resolved without us — dequeue and go home
        state.responses.shift()
        if (state.responses.length === 0) state.returning = true
      } else {
        const dx = brawler.position.x - state.bouncerPos.x
        const dy = brawler.position.y - state.bouncerPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const step = BOUNCER_SPEEDS[state.tier] * dt

        if (dist <= BOUNCER_REACH) {
          brawlSystem.securityResolve(response.brawlId)
          state.responses.shift()
          if (state.responses.length === 0) state.returning = true
        } else {
          state.bouncerPos.x += (dx / dist) * step
          state.bouncerPos.y += (dy / dist) * step
        }
      }
    } else if (state.returning) {
      const dx = BOUNCER_START.x - state.bouncerPos.x
      const dy = BOUNCER_START.y - state.bouncerPos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const step = BOUNCER_SPEEDS[state.tier] * dt

      if (dist <= step) {
        state.bouncerPos.x = BOUNCER_START.x
        state.bouncerPos.y = BOUNCER_START.y
        state.returning = false
      } else {
        state.bouncerPos.x += (dx / dist) * step
        state.bouncerPos.y += (dy / dist) * step
      }
    }

    // Sync graphic
    this.bouncerGraphic?.position.set(state.bouncerPos.x, state.bouncerPos.y)

    // Tick drunk escort timers
    for (const [customerId, timer] of this.drunkTimers) {
      const newTimer = timer - dt
      if (newTimer <= 0) {
        this.drunkTimers.delete(customerId)
        const customer = customerSystem.getCustomer(customerId) as CustomerEntity | undefined
        if (customer && !customer.canBeServed) {
          customerSystem.escortDrunk(customerId)
          eventDispatcher.emit('DRUNK_ESCORTED', { customerId, byPlayer: false })
        }
      } else {
        this.drunkTimers.set(customerId, newTimer)
      }
    }
  }

  get isActive(): boolean {
    return this.state !== null
  }
}

export const securitySystem = new SecuritySystem()
