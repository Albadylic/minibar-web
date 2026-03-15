// MBW-78: Brawl trigger on hooligan patience expiry
// MBW-80: Manual tap-to-eject with eject progress bar
// MBW-150: Brawler roams seat-to-seat, cancelling orders and causing chaos
import type { BrawlEntity } from '../../entities/brawl'
import { nextBrawlId } from '../../entities/brawl'
import { customerSystem } from './customerSystem'
import { eventDispatcher } from '../events/eventDispatcher'
import { gameLoop } from '../gameLoop'
import { BRAWL, getBrawlTapsRequired } from '../../config/difficulty'
import { STAR_RATING } from '../../config/difficulty'
import { SEATS, SEATS_BY_ID } from '../../config/barLayout'

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

  // MBW-78: Patience expired on a hooligan — start a brawl
  private handlePatienceExpired = ({ customerId }: { customerId: string }): void => {
    const customer = customerSystem.getCustomer(customerId)
    if (!customer || !customer.canBrawl) return
    // Status is already set to BRAWLING by customerSystem.updateWaiting
    this.startBrawl(customer.id)
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

  // MBW-150: Create brawl entity and pick initial roam target
  private startBrawl(instigatorId: string): void {
    const tapsRequired = getBrawlTapsRequired(this.dayNumber)

    const brawl: BrawlEntity = {
      id: nextBrawlId(),
      instigatorId,
      disruptedCustomerIds: [],
      timer: BRAWL.autoResolveFallback,
      tapsRequired,
      tapsReceived: 0,
      ejectProgress: 0,
      securityResponding: false,
      securityTimer: 0,
      targetSeatId: null,
      roamCooldown: 0,
    }

    this.brawls.push(brawl)
    eventDispatcher.emit('BRAWL_STARTED', {
      brawlId: brawl.id,
      instigatorId,
      affectedCount: 0,
    })

    // Pick first roam target immediately
    this.pickNextTarget(brawl)
  }

  // MBW-150: Each tick — roam brawler toward next seat, disrupting customers
  update(dt: number): void {
    for (let i = this.brawls.length - 1; i >= 0; i--) {
      const brawl = this.brawls[i]!
      brawl.timer -= dt
      if (brawl.timer <= 0) {
        this.resolveBrawl(brawl.id, false)
        continue
      }

      if (brawl.roamCooldown > 0) {
        brawl.roamCooldown -= dt
        if (brawl.roamCooldown <= 0 && !brawl.targetSeatId) {
          this.pickNextTarget(brawl)
        }
      } else {
        this.moveBrawler(brawl, dt)
      }
    }
  }

  // MBW-150: Move brawler toward their target seat
  private moveBrawler(brawl: BrawlEntity, dt: number): void {
    if (!brawl.targetSeatId) {
      this.pickNextTarget(brawl)
      return
    }

    const instigator = customerSystem.getCustomer(brawl.instigatorId)
    if (!instigator) return

    const targetSeat = SEATS_BY_ID[brawl.targetSeatId]
    if (!targetSeat) {
      brawl.targetSeatId = null
      return
    }

    const target = targetSeat.position
    const dx = target.x - instigator.position.x
    const dy = target.y - instigator.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = BRAWL.walkSpeed * dt

    if (dist <= step) {
      instigator.position.x = target.x
      instigator.position.y = target.y
      this.onReachedSeat(brawl, brawl.targetSeatId)
      brawl.targetSeatId = null
      brawl.roamCooldown = BRAWL.roamCooldown
    } else {
      instigator.position.x += (dx / dist) * step
      instigator.position.y += (dy / dist) * step
    }
  }

  // MBW-150: Arrived at a seat — disrupt the customer there if one is waiting
  private onReachedSeat(brawl: BrawlEntity, seatId: string): void {
    const victim = customerSystem.customers.find(
      (c) => c.seatId === seatId && (c.status === 'WAITING' || c.status === 'SERVED_LINGERING'),
    )
    if (!victim) return

    brawl.disruptedCustomerIds.push(victim.id)
    customerSystem.disruptByBrawler(victim.id)
    const isGameOver = gameLoop.adjustStarRating(-BRAWL.starLossPerCasualty)
    if (isGameOver) {
      gameLoop.triggerGameOver()
    }
  }

  // MBW-150: Pick a random occupied seat (other than instigator's seat) as the next roam target
  private pickNextTarget(brawl: BrawlEntity): void {
    const instigator = customerSystem.getCustomer(brawl.instigatorId)
    if (!instigator) return

    const candidates = SEATS.filter(
      (s) => s.id !== instigator.seatId && customerSystem.isOccupied(s.id),
    )
    if (candidates.length === 0) return
    brawl.targetSeatId = candidates[Math.floor(Math.random() * candidates.length)]!.id
  }

  // MBW-80: Resolve brawl — eject instigator; collateral customers already left during roaming
  private resolveBrawl(brawlId: string, byPlayer: boolean): void {
    const idx = this.brawls.findIndex((b) => b.id === brawlId)
    if (idx === -1) return
    const brawl = this.brawls[idx]!

    // Eject the instigator
    customerSystem.forceLeaveBrawl(brawl.instigatorId)

    // Auto-resolve is worse — extra rating hit for letting it escalate
    if (!byPlayer) {
      gameLoop.adjustStarRating(-STAR_RATING.lossPerBadReview)
    }

    this.brawls.splice(idx, 1)
    eventDispatcher.emit('BRAWL_RESOLVED', { brawlId, byPlayer })
  }

  // MBW-88: Called by securitySystem when bouncer resolves a brawl
  securityResolve(brawlId: string): void {
    this.resolveBrawl(brawlId, true)
  }

  getBrawlForCustomer(customerId: string): BrawlEntity | undefined {
    return this.brawls.find(
      (b) => b.instigatorId === customerId || b.disruptedCustomerIds.includes(customerId),
    )
  }
}

export const brawlSystem = new BrawlSystem()
