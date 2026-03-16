// MBW-99: Mess spawning — probabilistic on serve/leave events
// MBW-100: Tap-to-clean — messes are clickable PixiJS objects
// MBW-101: Cleaner NPC — autonomous pathfinding to nearest mess
// MBW-179: Tier 2 adds 50% speed; tier 3 adds double speed + no idle pause between messes
import { Container, Graphics } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { MessEntity } from '../../entities/mess'
import { nextMessId, resetMessIdCounter } from '../../entities/mess'
import { eventDispatcher } from '../events/eventDispatcher'
import { customerSystem } from './customerSystem'
import { MESS } from '../../config/difficulty'
import type { TableConfig } from '../../config/barLayout'
import { CANVAS_WIDTH, FLOOR_TOP, FLOOR_BOTTOM, SEATS_BY_ID, TABLES, BAR_COUNTER_TOP, BAR_COUNTER_BOTTOM } from '../../config/barLayout'

const MESS_RADIUS = 5
const CLEANER_RADIUS = 8
const CLEANER_START = { x: 30, y: 580 }
const CLEANER_REACH = 12 // canvas units — "arrived" when within this distance
// MBW-179: Tier 1/2 pause between messes; tier 3 starts next mess immediately
const CLEANER_IDLE_PAUSE = 1.5 // seconds

interface CleanerState {
  active: boolean
  position: { x: number; y: number }
  targetMessId: string | null
  targetTableId: string | null
  waypoints: Array<{ x: number; y: number }>  // path to walk; last point is the final cleaning spot
  speed: number
  noIdlePause: boolean
  idlePauseRemaining: number
}

class CleaningSystem {
  messes: MessEntity[] = []
  private stage: Container | null = null
  private messDisplays = new Map<string, Graphics>()
  private cleanerGraphic: Graphics | null = null
  private cleaner: CleanerState = { active: false, position: { ...CLEANER_START }, targetMessId: null, targetTableId: null, waypoints: [], speed: 80, noIdlePause: false, idlePauseRemaining: 0 }
  // MBW-167: Seats blocked because they have a mess on them
  private blockedSeatIds = new Set<string>()

  init(app: Application, cleanerSpeed: number | null, noIdlePause = false): void {
    this.stage = new Container()
    // MBW-166: Render above customers so glasses are visible over seated patrons
    app.stage.addChild(this.stage)

    if (cleanerSpeed !== null) {
      this.cleaner = { active: true, position: { ...CLEANER_START }, targetMessId: null, targetTableId: null, waypoints: [], speed: cleanerSpeed, noIdlePause, idlePauseRemaining: 0 }
      this.cleanerGraphic = new Graphics()
      this.cleanerGraphic.circle(0, 0, CLEANER_RADIUS)
      this.cleanerGraphic.fill({ color: 0x446655 })
      this.cleanerGraphic.position.set(CLEANER_START.x, CLEANER_START.y)
      this.stage.addChild(this.cleanerGraphic)
    }

    resetMessIdCounter()
    // MBW-166: Glasses only appear on departure, not immediately after serving
    eventDispatcher.on('CUSTOMER_LEFT', this.handleCustomerLeft)
  }

  destroy(): void {
    eventDispatcher.off('CUSTOMER_LEFT', this.handleCustomerLeft)
    this.stage?.destroy({ children: true })
    this.stage = null
    this.messDisplays.clear()
    this.messes = []
    this.blockedSeatIds.clear()
    this.cleanerGraphic = null
    this.cleaner.active = false
  }

  reset(): void {
    this.messes = []
    this.messDisplays.clear()
    this.blockedSeatIds.clear()
    this.cleaner.position = { ...CLEANER_START }
    this.cleaner.targetMessId = null
    this.cleaner.targetTableId = null
    this.cleaner.waypoints = []
    this.cleaner.idlePauseRemaining = 0
  }

  // MBW-167: Returns true if a seat is blocked by an uncleaned mess
  isBlocked(seatId: string): boolean {
    return this.blockedSeatIds.has(seatId)
  }

  // MBW-166: Glass left at seat when customer leaves (bar counter for stools, table surface for chairs)
  private handleCustomerLeft = ({ customerId }: { customerId: string }): void => {
    if (this.messes.length >= MESS.maxMesses) return
    if (Math.random() > MESS.spawnChanceOnLeave) return
    const customer = customerSystem.customers.find((c) => c.id === customerId)
    if (!customer) return

    const seat = SEATS_BY_ID[customer.seatId]
    if (!seat) return

    let glassX: number
    let glassY: number
    let onCounter = false
    if (seat.type === 'bar_stool') {
      // Place glass on the bar counter surface, centred on the stool x
      glassX = seat.position.x
      glassY = BAR_COUNTER_TOP + 20
      onCounter = true
    } else {
      // Place glass at the table centre, offset left/right to avoid stacking
      const table = TABLES.find((t) => t.id === seat.tableId)
      const existingAtTable = this.messes.filter((m) => {
        if (!m.seatId) return false
        const s = SEATS_BY_ID[m.seatId]
        return s?.tableId === seat.tableId
      }).length
      const sign = existingAtTable % 2 === 0 ? 1 : -1
      const magnitude = Math.floor((existingAtTable + 1) / 2) * 12
      glassX = (table ? table.position.x : seat.position.x) + sign * magnitude
      glassY = table ? table.position.y : seat.position.y - 20
    }

    this.spawnMess(glassX, glassY, customer.seatId, onCounter, seat.tableId)
  }

  private spawnMess(x: number, y: number, seatId: string | null = null, onCounter = false, tableId: string | null = null): void {
    // Clamp to bar counter or floor area depending on placement
    const clampedX = Math.max(10, Math.min(CANVAS_WIDTH - 10, x))
    const clampedY = onCounter
      ? Math.max(BAR_COUNTER_TOP + 5, Math.min(BAR_COUNTER_BOTTOM - 5, y))
      : Math.max(FLOOR_TOP + 5, Math.min(FLOOR_BOTTOM - 5, y))

    const mess: MessEntity = { id: nextMessId(), position: { x: clampedX, y: clampedY }, seatId, tableId }
    // MBW-167: Block the associated seat
    if (seatId) this.blockedSeatIds.add(seatId)
    this.messes.push(mess)

    if (!this.stage) return
    // MBW-166: White circle represents a glass left on the bar/table
    const g = new Graphics()
    g.circle(0, 0, MESS_RADIUS)
    g.fill({ color: 0xf0f0f0 })
    g.position.set(clampedX, clampedY)
    g.eventMode = 'static'
    g.cursor = 'pointer'
    g.on('pointerdown', () => this.cleanMess(mess.id))
    this.stage.addChild(g)
    this.messDisplays.set(mess.id, g)

    eventDispatcher.emit('MESS_SPAWNED', { messId: mess.id, position: { x: clampedX, y: clampedY } })
  }

  // MBW-100: Player taps a mess to clean it
  cleanMess(messId: string): void {
    const idx = this.messes.findIndex((m) => m.id === messId)
    if (idx === -1) return
    const mess = this.messes[idx]!
    // MBW-167: Unblock the seat when mess is cleaned
    if (mess.seatId) this.blockedSeatIds.delete(mess.seatId)
    this.messes.splice(idx, 1)

    const g = this.messDisplays.get(messId)
    if (g) {
      g.destroy()
      this.messDisplays.delete(messId)
    }

    // If the cleaned mess belongs to the table the cleaner is heading to,
    // clear the target when no more messes remain there (player tapped them away)
    if (this.cleaner.targetTableId !== null && mess.tableId === this.cleaner.targetTableId) {
      const remaining = this.messes.filter((m) => m.tableId === this.cleaner.targetTableId)
      if (remaining.length === 0) {
        this.cleaner.targetMessId = null
        this.cleaner.targetTableId = null
        this.cleaner.waypoints = []
      }
    } else if (this.cleaner.targetMessId === messId) {
      // Counter mess targeted directly
      this.cleaner.targetMessId = null
      this.cleaner.waypoints = []
    }

    eventDispatcher.emit('MESS_CLEANED', { messId })
  }

  // MBW-101: Cleaner NPC tick — pathfind to nearest mess/table, clean on arrival
  // MBW-179: Tier 1/2 pause 1.5s after each clean; tier 3 starts immediately
  tick(dt: number): void {
    if (!this.cleaner.active || !this.cleanerGraphic) return

    // Count down idle pause between messes
    if (this.cleaner.idlePauseRemaining > 0) {
      this.cleaner.idlePauseRemaining = Math.max(0, this.cleaner.idlePauseRemaining - dt)
      return
    }

    // Pick a target and compute an obstacle-avoiding path if we don't have one
    if (!this.cleaner.targetMessId) {
      const target = this.pickNextTarget()
      if (!target) return
      this.cleaner.targetMessId = target.messId
      this.cleaner.targetTableId = target.tableId
      this.cleaner.waypoints = this.computePath(this.cleaner.position, target.spot, target.tableId)
    }
    if (this.cleaner.waypoints.length === 0) return

    // Move toward the current waypoint
    const spot = this.cleaner.waypoints[0]!
    const dx = spot.x - this.cleaner.position.x
    const dy = spot.y - this.cleaner.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = this.cleaner.speed * dt

    if (dist <= CLEANER_REACH) {
      // Snap to waypoint and advance
      this.cleaner.position.x = spot.x
      this.cleaner.position.y = spot.y
      this.cleaner.waypoints.shift()
      if (this.cleaner.waypoints.length === 0) {
        this.onArrival()
      }
    } else {
      this.cleaner.position.x += (dx / dist) * step
      this.cleaner.position.y += (dy / dist) * step
    }

    this.cleanerGraphic.position.set(this.cleaner.position.x, this.cleaner.position.y)
  }

  // Batch-clean all messes at the target table, or the single counter mess
  private onArrival(): void {
    if (!this.cleaner.noIdlePause) {
      this.cleaner.idlePauseRemaining = CLEANER_IDLE_PAUSE
    }

    if (this.cleaner.targetTableId !== null) {
      const tableId = this.cleaner.targetTableId
      const ids = this.messes.filter((m) => m.tableId === tableId).map((m) => m.id)
      for (const id of ids) this.cleanMess(id)
    } else if (this.cleaner.targetMessId) {
      this.cleanMess(this.cleaner.targetMessId)
    }

    this.cleaner.targetMessId = null
    this.cleaner.targetTableId = null
    this.cleaner.waypoints = []
  }

  // Returns the nearest cleaning destination — table side-spot or counter mess position
  private pickNextTarget(): { messId: string; tableId: string | null; spot: { x: number; y: number } } | null {
    if (this.messes.length === 0) return null
    const pos = this.cleaner.position

    type Candidate = { messId: string; tableId: string | null; spot: { x: number; y: number }; dist2: number }
    const candidates: Candidate[] = []

    // Counter messes: walk directly to the glass
    for (const m of this.messes) {
      if (m.tableId !== null) continue
      const dx = m.position.x - pos.x
      const dy = m.position.y - pos.y
      candidates.push({ messId: m.id, tableId: null, spot: m.position, dist2: dx * dx + dy * dy })
    }

    // Table messes: one candidate per table, walk to nearest side-spot
    const seen = new Set<string>()
    for (const m of this.messes) {
      if (m.tableId === null || seen.has(m.tableId)) continue
      seen.add(m.tableId)
      const spot = this.getCleaningSpot(m.tableId, pos)
      const dx = spot.x - pos.x
      const dy = spot.y - pos.y
      candidates.push({ messId: m.id, tableId: m.tableId, spot, dist2: dx * dx + dy * dy })
    }

    let best = candidates[0]!
    for (const c of candidates) {
      if (c.dist2 < best.dist2) best = c
    }
    return best
  }

  // Returns the closest of the four table side-spots (N/S/E/W) to `from`
  private getCleaningSpot(tableId: string, from: { x: number; y: number }): { x: number; y: number } {
    const table = TABLES.find((t) => t.id === tableId)
    if (!table) return from
    const { x: tx, y: ty, width: tw, height: th } = table
    const margin = CLEANER_RADIUS + 4
    const spots = [
      { x: tx,                   y: ty - th / 2 - margin },  // North
      { x: tx,                   y: ty + th / 2 + margin },  // South
      { x: tx - tw / 2 - margin, y: ty },                    // West
      { x: tx + tw / 2 + margin, y: ty },                    // East
    ]
    let best = spots[0]!
    let bestDist = Infinity
    for (const s of spots) {
      const dx = s.x - from.x
      const dy = s.y - from.y
      const d2 = dx * dx + dy * dy
      if (d2 < bestDist) { bestDist = d2; best = s }
    }
    return best
  }

  // Computes a waypoint path from `from` to `to` that avoids non-target tables.
  // Uses Liang-Barsky segment-AABB intersection to detect blocking tables and
  // inserts corner waypoints to route around them. Recurses up to depth 4.
  private computePath(
    from: { x: number; y: number },
    to: { x: number; y: number },
    skipTableId: string | null,
    depth = 0,
  ): Array<{ x: number; y: number }> {
    if (depth > 4) return [to]

    const MARGIN = CLEANER_RADIUS + 4
    let blockingTable: TableConfig | null = null
    let earliestT = Infinity

    for (const table of TABLES) {
      if (table.id === skipTableId) continue
      // Skip tables whose exclusion zone already contains `from` (cleaner starting at this table's edge)
      if (this.pointInsideTable(from, table, MARGIN + 1)) continue

      const t = this.pathEntersTableAt(from, to, table, MARGIN)
      if (t !== null && t < earliestT) {
        earliestT = t
        blockingTable = table
      }
    }

    if (!blockingTable) return [to]

    // Choose the corner of the blocking table's exclusion zone that minimises total detour distance
    const bt = blockingTable
    const halfW = bt.width / 2 + MARGIN
    const halfH = bt.height / 2 + MARGIN
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

    const pathToCorner = this.computePath(from, bestCorner, skipTableId, depth + 1)
    const pathFromCorner = this.computePath(bestCorner, to, skipTableId, depth + 1)
    return [...pathToCorner, ...pathFromCorner]
  }

  // Liang-Barsky: returns the parametric t where segment p1→p2 first enters the table's
  // inflated bounding box, or null if the segment doesn't intersect it.
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

    const tests = [
      { p: -dx, q: p1.x - left  },
      { p:  dx, q: right - p1.x },
      { p: -dy, q: p1.y - top   },
      { p:  dy, q: bottom - p1.y },
    ]

    for (const { p, q } of tests) {
      if (p === 0) {
        if (q < 0) return null  // parallel and outside this boundary
      } else {
        const t = q / p
        if (p < 0) tEnter = Math.max(tEnter, t)
        else       tExit  = Math.min(tExit,  t)
      }
    }

    if (tEnter > tExit) return null
    if (tExit < 0 || tEnter > 1) return null
    return Math.max(0, tEnter)
  }

  // Returns true if point p is inside the table's inflated bounding box
  private pointInsideTable(p: { x: number; y: number }, table: TableConfig, margin: number): boolean {
    return (
      p.x >= table.position.x - table.width  / 2 - margin &&
      p.x <= table.position.x + table.width  / 2 + margin &&
      p.y >= table.position.y - table.height / 2 - margin &&
      p.y <= table.position.y + table.height / 2 + margin
    )
  }
}

export const cleaningSystem = new CleaningSystem()
