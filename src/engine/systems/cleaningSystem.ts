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
import { CANVAS_WIDTH, FLOOR_TOP, FLOOR_BOTTOM, SEATS_BY_ID, TABLES, BAR_COUNTER_BOTTOM } from '../../config/barLayout'

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
  speed: number
  noIdlePause: boolean
  idlePauseRemaining: number
}

class CleaningSystem {
  messes: MessEntity[] = []
  private stage: Container | null = null
  private messDisplays = new Map<string, Graphics>()
  private cleanerGraphic: Graphics | null = null
  private cleaner: CleanerState = { active: false, position: { ...CLEANER_START }, targetMessId: null, speed: 80, noIdlePause: false, idlePauseRemaining: 0 }

  init(app: Application, cleanerSpeed: number | null, noIdlePause = false): void {
    this.stage = new Container()
    // MBW-166: Render above customers so glasses are visible over seated patrons
    app.stage.addChild(this.stage)

    if (cleanerSpeed !== null) {
      this.cleaner = { active: true, position: { ...CLEANER_START }, targetMessId: null, speed: cleanerSpeed, noIdlePause, idlePauseRemaining: 0 }
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
    this.cleanerGraphic = null
    this.cleaner.active = false
  }

  reset(): void {
    this.messes = []
    this.messDisplays.clear()
    this.cleaner.position = { ...CLEANER_START }
    this.cleaner.targetMessId = null
    this.cleaner.idlePauseRemaining = 0
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
    if (seat.type === 'bar_stool') {
      // Place glass on the bar counter surface, above the stool
      glassX = seat.position.x
      glassY = BAR_COUNTER_BOTTOM - 8
    } else {
      // Place glass at the centre of the table the chair belongs to
      const table = TABLES.find((t) => t.id === seat.tableId)
      glassX = table ? table.position.x : seat.position.x
      glassY = table ? table.position.y : seat.position.y - 20
    }

    this.spawnMess(glassX, glassY)
  }

  private spawnMess(x: number, y: number): void {
    // Clamp to floor area
    const clampedX = Math.max(10, Math.min(CANVAS_WIDTH - 10, x))
    const clampedY = Math.max(FLOOR_TOP + 5, Math.min(FLOOR_BOTTOM - 5, y))

    const mess: MessEntity = { id: nextMessId(), position: { x: clampedX, y: clampedY } }
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
    this.messes.splice(idx, 1)

    const g = this.messDisplays.get(messId)
    if (g) {
      g.destroy()
      this.messDisplays.delete(messId)
    }

    // If cleaner was heading to this mess, clear its target
    if (this.cleaner.targetMessId === messId) {
      this.cleaner.targetMessId = null
    }

    eventDispatcher.emit('MESS_CLEANED', { messId })
  }

  // MBW-101: Cleaner NPC tick — pathfind to nearest mess, clean on arrival
  // MBW-179: Tier 1/2 pause 1.5s after each clean; tier 3 starts immediately
  tick(dt: number): void {
    if (!this.cleaner.active || !this.cleanerGraphic) return

    // Count down idle pause between messes
    if (this.cleaner.idlePauseRemaining > 0) {
      this.cleaner.idlePauseRemaining = Math.max(0, this.cleaner.idlePauseRemaining - dt)
      return
    }

    // Find a target if we don't have one
    if (!this.cleaner.targetMessId) {
      this.cleaner.targetMessId = this.findNearestMess()
    }
    if (!this.cleaner.targetMessId) return // no messes

    const mess = this.messes.find((m) => m.id === this.cleaner.targetMessId)
    if (!mess) {
      this.cleaner.targetMessId = null
      return
    }

    // Move toward mess
    const dx = mess.position.x - this.cleaner.position.x
    const dy = mess.position.y - this.cleaner.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = this.cleaner.speed * dt

    if (dist <= CLEANER_REACH) {
      // Arrived — clean the mess, then start idle pause (unless tier 3)
      this.cleaner.position.x = mess.position.x
      this.cleaner.position.y = mess.position.y
      this.cleaner.targetMessId = null
      if (!this.cleaner.noIdlePause) {
        this.cleaner.idlePauseRemaining = CLEANER_IDLE_PAUSE
      }
      this.cleanMess(mess.id)
    } else {
      this.cleaner.position.x += (dx / dist) * step
      this.cleaner.position.y += (dy / dist) * step
    }

    this.cleanerGraphic.position.set(this.cleaner.position.x, this.cleaner.position.y)
  }

  private findNearestMess(): string | null {
    if (this.messes.length === 0) return null
    let nearest: MessEntity | null = null
    let minDist = Infinity
    for (const mess of this.messes) {
      const dx = mess.position.x - this.cleaner.position.x
      const dy = mess.position.y - this.cleaner.position.y
      const dist = dx * dx + dy * dy
      if (dist < minDist) {
        minDist = dist
        nearest = mess
      }
    }
    return nearest?.id ?? null
  }
}

export const cleaningSystem = new CleaningSystem()
