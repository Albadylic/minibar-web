// MBW-78: Brawl trigger on hooligan patience expiry
// MBW-79: Radius-based collateral damage calculation
// MBW-80: Manual tap-to-eject with eject progress bar
import type { BrawlEntity } from '../../entities/brawl'
import { nextBrawlId } from '../../entities/brawl'
import { customerSystem } from './customerSystem'
import { eventDispatcher } from '../events/eventDispatcher'
import { gameLoop } from '../gameLoop'
import { BRAWL, getBrawlTapsRequired, getBrawlRadius } from '../../config/difficulty'
import { STAR_RATING } from '../../config/difficulty'

class BrawlSystem {
  brawls: BrawlEntity[] = []
  private dayNumber = 1

  reset(): void {
    this.brawls = []
  }

  init(dayNumber: number): void {
    this.dayNumber = dayNumber
    eventDispatcher.on('PATIENCE_EXPIRED', this.handlePatienceExpired)
    eventDispatcher.on('CUSTOMER_CLICKED', this.handleCustomerClicked)
  }

  destroy(): void {
    eventDispatcher.off('PATIENCE_EXPIRED', this.handlePatienceExpired)
    eventDispatcher.off('CUSTOMER_CLICKED', this.handleCustomerClicked)
    this.brawls = []
  }

  // MBW-78: Patience expired on a hooligan — start a brawl at their position
  private handlePatienceExpired = ({ customerId }: { customerId: string }): void => {
    const customer = customerSystem.getCustomer(customerId)
    if (!customer || !customer.canBrawl) return
    // Status is already set to BRAWLING by customerSystem.updateWaiting
    this.startBrawl(customer.id, customer.position)
  }

  // MBW-80: Player taps a brawling hooligan — increment eject progress
  private handleCustomerClicked = ({ customerId }: { customerId: string }): void => {
    const customer = customerSystem.getCustomer(customerId)
    if (!customer || customer.status !== 'BRAWLING') return

    const brawl = this.brawls.find((b) => b.instigatorId === customerId)
    if (!brawl) return

    brawl.tapsReceived++
    brawl.ejectProgress = brawl.tapsReceived / brawl.tapsRequired

    eventDispatcher.emit('BRAWLER_TAPPED', {
      brawlId: brawl.id,
      tapsReceived: brawl.tapsReceived,
      tapsRequired: brawl.tapsRequired,
    })

    if (brawl.tapsReceived >= brawl.tapsRequired) {
      this.resolveBrawl(brawl.id, true)
    }
  }

  // MBW-79: Create brawl, calculate collateral damage within radius
  private startBrawl(instigatorId: string, position: { x: number; y: number }): void {
    const radius = getBrawlRadius(this.dayNumber)
    const tapsRequired = getBrawlTapsRequired(this.dayNumber)

    // Find customers within radius (excluding the instigator)
    const affectedIds: string[] = []
    for (const other of customerSystem.customers) {
      if (other.id === instigatorId || other.status === 'LEAVING' || other.status === 'BRAWLING') continue
      const dx = other.position.x - position.x
      const dy = other.position.y - position.y
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        affectedIds.push(other.id)
        other.status = 'BRAWLING' // pulled into the chaos
      }
    }

    const brawl: BrawlEntity = {
      id: nextBrawlId(),
      instigatorId,
      position,
      radius,
      affectedCustomerIds: affectedIds,
      timer: BRAWL.autoResolveFallback,
      tapsRequired,
      tapsReceived: 0,
      ejectProgress: 0,
      securityResponding: false,
      securityTimer: 0,
    }

    this.brawls.push(brawl)
    eventDispatcher.emit('BRAWL_STARTED', {
      brawlId: brawl.id,
      instigatorId,
      affectedCount: affectedIds.length,
    })
  }

  // MBW-80: Called each tick — count down auto-resolve fallback timer
  update(dt: number): void {
    for (let i = this.brawls.length - 1; i >= 0; i--) {
      const brawl = this.brawls[i]!
      brawl.timer -= dt
      if (brawl.timer <= 0) {
        // Auto-resolve: bad outcome — no star recovery
        this.resolveBrawl(brawl.id, false)
      }
    }
  }

  // MBW-80: Resolve brawl — eject instigator, release affected customers (they leave angrily)
  private resolveBrawl(brawlId: string, byPlayer: boolean): void {
    const idx = this.brawls.findIndex((b) => b.id === brawlId)
    if (idx === -1) return
    const brawl = this.brawls[idx]!

    // Apply star rating losses for each affected customer
    const affectedCount = brawl.affectedCustomerIds.length
    if (affectedCount > 0) {
      const totalLoss = affectedCount * BRAWL.starLossPerCasualty
      const isGameOver = gameLoop.adjustStarRating(-totalLoss)

      // All affected customers leave
      for (const affectedId of brawl.affectedCustomerIds) {
        const affected = customerSystem.getCustomer(affectedId)
        if (affected) {
          // Use forceLeave so the seat is freed
          customerSystem.forceLeaveBrawl(affectedId)
        }
      }

      if (isGameOver) {
        gameLoop.triggerGameOver()
      }
    }

    // Eject the instigator
    customerSystem.forceLeaveBrawl(brawl.instigatorId)

    // Star loss for the instigator itself (bad for the bar's reputation)
    if (!byPlayer) {
      // Auto-resolve is worse — extra rating hit for letting it get out of hand
      gameLoop.adjustStarRating(-STAR_RATING.lossPerBadReview)
    }

    this.brawls.splice(idx, 1)
    eventDispatcher.emit('BRAWL_RESOLVED', { brawlId, byPlayer })
  }

  getBrawlForCustomer(customerId: string): BrawlEntity | undefined {
    return this.brawls.find(
      (b) => b.instigatorId === customerId || b.affectedCustomerIds.includes(customerId),
    )
  }
}

export const brawlSystem = new BrawlSystem()
