// MBW-116/121: Entertainer arrival, performance, tip, and return likelihood
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { EntertainerId, EntertainerEntity } from '../../entities/entertainer'
import type { CustomerType } from '../../entities/customer'
import type { GameSave } from '../../types/game'
import {
  ENTERTAINER_CONFIGS,
  ENTERTAINER_IDS,
  DEFAULT_RETURN_LIKELIHOOD,
  TIP_BONUS,
  NO_TIP_PENALTY,
  MIN_LIKELIHOOD,
  MAX_LIKELIHOOD,
  STAGE_POSITION,
} from '../../config/entertainers'
import { DOORWAY } from '../../config/barLayout'
import { eventDispatcher } from '../events/eventDispatcher'
import { gameLoop } from '../gameLoop'
import { useHudStore } from '../../store/hudStore'

const WALK_SPEED = 100  // px/s
const LABEL_STYLE = new TextStyle({ fontSize: 10, fill: 0xffffff, fontFamily: 'Georgia, serif' })

class EntertainerSystem {
  private entertainer: EntertainerEntity | null = null
  private stage: Container | null = null
  private graphic: Graphics | null = null
  private label: Text | null = null
  private returnLikelihoods: GameSave['entertainers'] | null = null
  private performing = false

  // ---- Public getters for other systems ----

  // MBW-116: Patience decay multiplier for current performer (1.0 = no boost)
  getDecayMult(customerType: CustomerType): number {
    if (!this.performing || !this.entertainer) return 1.0
    return ENTERTAINER_CONFIGS[this.entertainer.id].patienceDecayMult[customerType]
  }

  // MBW-116: Coin boost multiplier for current performer (1.0 = no boost)
  getCoinBoostMult(): number {
    if (!this.performing || !this.entertainer) return 1.0
    return ENTERTAINER_CONFIGS[this.entertainer.id].coinBoostMult
  }

  // ---- Lifecycle ----

  init(app: Application, save: GameSave): void {
    this.returnLikelihoods = save.entertainers
    this.stage = new Container()
    app.stage.addChild(this.stage)

    eventDispatcher.on('PHASE_CHANGED', this.handlePhaseChanged)
    eventDispatcher.on('LAST_ORDERS', this.handleLastOrders)
  }

  destroy(): void {
    eventDispatcher.off('PHASE_CHANGED', this.handlePhaseChanged)
    eventDispatcher.off('LAST_ORDERS', this.handleLastOrders)

    this.graphic?.destroy()
    this.label?.destroy()
    this.stage?.destroy({ children: true })
    this.stage = null
    this.graphic = null
    this.label = null
    this.entertainer = null
    this.performing = false
    this.returnLikelihoods = null
  }

  // Called by gameLoop.endDay() — returns tip result so save can be updated
  getTipResult(): { entertainerId: Exclude<EntertainerId, 'jukebox'>; tipped: boolean } | null {
    if (!this.entertainer || this.entertainer.id === 'jukebox') return null
    return {
      entertainerId: this.entertainer.id as Exclude<EntertainerId, 'jukebox'>,
      tipped: this.entertainer.tipPaid,
    }
  }

  // ---- Tick ----

  tick(dt: number): void {
    if (!this.entertainer || !this.graphic) return
    const e = this.entertainer

    const dx = e.targetPosition.x - e.position.x
    const dy = e.targetPosition.y - e.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = WALK_SPEED * dt

    if (dist > step) {
      e.position.x += (dx / dist) * step
      e.position.y += (dy / dist) * step
    } else {
      e.position.x = e.targetPosition.x
      e.position.y = e.targetPosition.y
      this.onReachedTarget()
    }

    // MBW-152: onReachedTarget may destroy graphic/label when entertainer exits — guard before access
    this.graphic?.position.set(e.position.x, e.position.y)
    this.label?.position.set(e.position.x, e.position.y - 20)
  }

  // ---- Private ----

  // MBW-116: At Evening, roll which entertainer appears and spawn them
  private handlePhaseChanged = ({ phase }: { phase: string }): void => {
    if (phase !== 'EVENING') return
    const id = this.rollEntertainer()
    this.spawnEntertainer(id)
  }

  // MBW-116: At Last Orders, entertainer stops performing and waits for tip
  private handleLastOrders = (): void => {
    if (!this.entertainer) return
    if (this.entertainer.status === 'PERFORMING') {
      this.performing = false
      this.entertainer.status = 'WAITING_TIP'
      // Jukebox doesn't wait for tip — just leaves
      if (this.entertainer.id === 'jukebox') {
        this.startLeaving()
      } else {
        this.makeClickable()
      }
    }
  }

  private rollEntertainer(): EntertainerId {
    const likelihoods = this.returnLikelihoods
    const passed: Exclude<EntertainerId, 'jukebox'>[] = []

    for (const id of ENTERTAINER_IDS) {
      const likelihood = likelihoods?.[id]?.returnLikelihood ?? DEFAULT_RETURN_LIKELIHOOD
      if (Math.random() < likelihood) {
        passed.push(id)
      }
    }

    if (passed.length === 0) return 'jukebox'
    return passed[Math.floor(Math.random() * passed.length)]!
  }

  private spawnEntertainer(id: EntertainerId): void {
    if (!this.stage) return
    const cfg = ENTERTAINER_CONFIGS[id]

    this.entertainer = {
      id,
      status: 'ARRIVING',
      position: { x: DOORWAY.x, y: DOORWAY.y },
      targetPosition: { x: STAGE_POSITION.x, y: STAGE_POSITION.y },
      tipPaid: false,
      tipAmount: 0,
    }

    // PixiJS placeholder graphic
    const g = new Graphics()
    g.circle(0, 0, 16)
    g.fill({ color: cfg.placeholderColor })
    g.position.set(DOORWAY.x, DOORWAY.y)
    this.stage.addChild(g)
    this.graphic = g

    const lbl = new Text({ text: cfg.name[0]!, style: LABEL_STYLE })
    lbl.anchor.set(0.5)
    lbl.position.set(DOORWAY.x, DOORWAY.y - 20)
    this.stage.addChild(lbl)
    this.label = lbl

    eventDispatcher.emit('ENTERTAINER_ARRIVED', { entertainerId: id })
  }

  private onReachedTarget(): void {
    if (!this.entertainer) return
    if (this.entertainer.status === 'ARRIVING') {
      this.entertainer.status = 'PERFORMING'
      this.performing = true
      const cfg = ENTERTAINER_CONFIGS[this.entertainer.id]
      useHudStore.setState({ performingEntertainer: cfg.name })
    } else if (this.entertainer.status === 'LEAVING') {
      eventDispatcher.emit('ENTERTAINER_LEFT', { entertainerId: this.entertainer.id })
      useHudStore.setState({ performingEntertainer: null })
      this.graphic?.destroy()
      this.label?.destroy()
      this.graphic = null
      this.label = null
      this.entertainer = null
    }
  }

  private makeClickable(): void {
    if (!this.graphic || !this.entertainer) return
    const e = this.entertainer
    const cfg = ENTERTAINER_CONFIGS[e.id]
    this.graphic.eventMode = 'static'
    this.graphic.cursor = 'pointer'
    this.graphic.on('pointerdown', () => {
      if (e.tipPaid || cfg.tipCost === 0) return
      const tipped = gameLoop.spendCoins(cfg.tipCost)
      if (!tipped) return
      e.tipPaid = true
      e.tipAmount = cfg.tipCost
      eventDispatcher.emit('ENTERTAINER_TIPPED', { entertainerId: e.id, amount: cfg.tipCost })
      this.startLeaving()
    })
  }

  private startLeaving(): void {
    if (!this.entertainer) return
    this.performing = false
    this.entertainer.status = 'LEAVING'
    this.entertainer.targetPosition = { x: DOORWAY.x, y: DOORWAY.y }
    if (this.graphic) this.graphic.eventMode = 'none'
  }
}

export const entertainerSystem = new EntertainerSystem()

// MBW-121: Compute updated return likelihood after a day (called from gameLoop.endDay)
export function computeUpdatedLikelihood(current: number, tipped: boolean): number {
  const delta = tipped ? TIP_BONUS : -NO_TIP_PENALTY
  return Math.max(MIN_LIKELIHOOD, Math.min(MAX_LIKELIHOOD, current + delta))
}
