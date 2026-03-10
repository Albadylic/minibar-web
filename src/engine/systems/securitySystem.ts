// MBW-88: Bouncer upgrade — auto-responds to brawls after a response delay
// MBW-89: Tier 2 Security Team — faster, handles multiple brawls simultaneously
import type { SecurityState } from '../../entities/security'
import { eventDispatcher } from '../events/eventDispatcher'
import { brawlSystem } from './brawlSystem'
import { customerSystem } from './customerSystem'
import type { CustomerEntity } from '../../entities/customer'

// Delay before security auto-escorts a drunk customer (seconds)
const DRUNK_ESCORT_DELAY = 6

class SecuritySystem {
  private state: SecurityState | null = null
  private drunkTimers = new Map<string, number>() // customerId → countdown

  init(bouncerTier: 0 | 1 | 2): void {
    if (bouncerTier === 0) {
      this.state = null
      return
    }
    this.state = { tier: bouncerTier, responses: [] }
    eventDispatcher.on('BRAWL_STARTED', this.handleBrawlStarted)
    eventDispatcher.on('CUSTOMER_ARRIVED', this.handleCustomerArrived)
    eventDispatcher.on('DRUNK_ESCORTED', this.handleDrunkEscorted)
  }

  destroy(): void {
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

  // MBW-88: On BRAWL_STARTED, schedule an auto-resolve if security is free (Tier 1) or always (Tier 2)
  private handleBrawlStarted = ({ brawlId }: { brawlId: string }): void => {
    if (!this.state) return
    const { tier, responses } = this.state
    if (tier === 1 && responses.length >= 1) return // bouncer is busy

    const responseTime = tier === 2 ? 4 : 7
    this.state.responses.push({ brawlId, timer: responseTime })
  }

  // MBW-97: Auto-escort drunks when security is owned
  private handleCustomerArrived = ({ customerId }: { customerId: string }): void => {
    if (!this.state) return
    const customer = customerSystem.getCustomer(customerId)
    if (!customer || customer.canBeServed) return // only drunks
    const delay = this.state.tier === 2 ? DRUNK_ESCORT_DELAY / 2 : DRUNK_ESCORT_DELAY
    this.drunkTimers.set(customerId, delay)
  }

  private handleDrunkEscorted = ({ customerId }: { customerId: string }): void => {
    this.drunkTimers.delete(customerId)
  }

  update(dt: number): void {
    if (!this.state) return

    // Tick brawl responses
    for (let i = this.state.responses.length - 1; i >= 0; i--) {
      const response = this.state.responses[i]!
      response.timer -= dt
      if (response.timer <= 0) {
        this.state.responses.splice(i, 1)
        brawlSystem.securityResolve(response.brawlId)
      }
    }

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
