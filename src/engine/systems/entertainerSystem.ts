// MBW-116/121/122/120: Entertainer arrival, performance, tipping, levelling, return likelihood
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { EntertainerId, EntertainerEntity, TipChoice } from '../../entities/entertainer'
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
  BAR_TIP_POSITION,
  computeEntertainerFee,
  computeDecayMult,
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
  private entertainerData: GameSave['entertainers'] | null = null
  private performing = false
  private barWalkFired = false

  // ---- Public getters for other systems ----

  // MBW-116/122: Patience decay multiplier for current performer, scaled by level
  getDecayMult(customerType: string): number {
    if (!this.performing || !this.entertainer) return 1.0
    const cfg = ENTERTAINER_CONFIGS[this.entertainer.id]
    return computeDecayMult(cfg, this.entertainer.level, customerType)
  }

  // MBW-116: Coin boost multiplier for current performer (1.0 = no boost)
  getCoinBoostMult(): number {
    if (!this.performing || !this.entertainer) return 1.0
    return ENTERTAINER_CONFIGS[this.entertainer.id].coinBoostMult
  }

  // MBW-120: True while a named entertainer has WAITING_TIP status and hasn't been resolved
  get isWaitingForTip(): boolean {
    return this.entertainer?.status === 'WAITING_TIP' && this.entertainer.tipChoice === null
  }

  // Returns the tip prompt data for the shop screen to display after the day ends
  getPendingTipPrompt(): import('../../store/hudStore').TipPrompt | null {
    if (!this.entertainer || this.entertainer.id === 'jukebox') return null
    if (this.entertainer.tipChoice !== null) return null
    const cfg = ENTERTAINER_CONFIGS[this.entertainer.id]
    const fee = computeEntertainerFee(cfg, this.entertainer.level)
    return {
      entertainerId: this.entertainer.id,
      entertainerName: cfg.name,
      pronoun: cfg.pronoun,
      options: [Math.round(fee * 2), fee, Math.max(1, Math.round(fee * 0.5)), 0],
    }
  }

  // ---- Lifecycle ----

  init(app: Application, save: GameSave): void {
    this.entertainerData = save.entertainers
    this.barWalkFired = false
    this.stage = new Container()
    app.stage.addChild(this.stage)

    eventDispatcher.on('PHASE_CHANGED', this.handlePhaseChanged)
  }

  destroy(): void {
    eventDispatcher.off('PHASE_CHANGED', this.handlePhaseChanged)

    this.graphic?.destroy()
    this.label?.destroy()
    this.stage?.destroy({ children: true })
    this.stage = null
    this.graphic = null
    this.label = null
    this.entertainer = null
    this.performing = false
    this.barWalkFired = false
    this.entertainerData = null
  }

  // MBW-120: Player chose a tip option — record choice and let entertainer leave
  resolveTip(choice: TipChoice): void {
    if (!this.entertainer || !this.entertainer.atBar) return
    const e = this.entertainer
    const cfg = ENTERTAINER_CONFIGS[e.id]
    const fee = computeEntertainerFee(cfg, e.level)
    const amounts: [number, number, number, number] = [
      Math.round(fee * 2),
      fee,
      Math.max(1, Math.round(fee * 0.5)),
      0,
    ]
    const amount = amounts[choice]
    if (amount > 0) {
      gameLoop.spendCoins(amount)
    }
    e.tipPaid = choice <= 1  // generous or adequate = "tipped"
    e.tipAmount = amount
    e.tipChoice = choice

    useHudStore.setState({ tipPrompt: null })
    eventDispatcher.emit('ENTERTAINER_TIPPED', { entertainerId: e.id, amount })
    this.startLeaving()
  }

  // Called by gameLoop.endDay() — returns result so save can be updated
  getTipResult(): { entertainerId: Exclude<EntertainerId, 'jukebox'>; tipChoice: TipChoice } | null {
    if (!this.entertainer || this.entertainer.id === 'jukebox') return null
    // If tip was never resolved (e.g. day ended before they arrived), treat as refuse
    const choice = this.entertainer.tipChoice ?? 3
    return {
      entertainerId: this.entertainer.id as Exclude<EntertainerId, 'jukebox'>,
      tipChoice: choice,
    }
  }

  // ---- Tick ----

  tick(dt: number): void {
    if (!this.entertainer || !this.graphic) return
    const e = this.entertainer

    // At 10s remaining (23:00), named performer walks to bar for tip; jukebox just leaves
    if (e.status === 'PERFORMING' && !this.barWalkFired && useHudStore.getState().timeRemaining <= 10) {
      this.barWalkFired = true
      if (e.id === 'jukebox') {
        this.startLeaving()
      } else {
        this.performing = false
        e.status = 'WAITING_TIP'
        e.targetPosition = { x: BAR_TIP_POSITION.x, y: BAR_TIP_POSITION.y }
      }
    }

    // Don't move while waiting at bar for player to pick tip
    if (e.status === 'WAITING_TIP' && e.atBar) return

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

  private rollEntertainer(): EntertainerId {
    const likelihoods = this.entertainerData
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
    // MBW-122: Read current level from save (default 1 for new saves / jukebox)
    const level = id !== 'jukebox' ? (this.entertainerData?.[id]?.level ?? 1) : 1

    this.entertainer = {
      id,
      status: 'ARRIVING',
      position: { x: DOORWAY.x, y: DOORWAY.y },
      targetPosition: { x: STAGE_POSITION.x, y: STAGE_POSITION.y },
      level,
      tipPaid: false,
      tipAmount: 0,
      tipChoice: null,
      atBar: false,
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
    } else if (this.entertainer.status === 'WAITING_TIP') {
      // MBW-120: Reached bar — show tip prompt immediately
      this.entertainer.atBar = true
      this.showTipPrompt()
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

  // MBW-120: Emit 4 tip options to HUD store for React overlay to render
  private showTipPrompt(): void {
    if (!this.entertainer) return
    const e = this.entertainer
    const cfg = ENTERTAINER_CONFIGS[e.id]
    const fee = computeEntertainerFee(cfg, e.level)
    useHudStore.setState({
      tipPrompt: {
        entertainerId: e.id,
        entertainerName: cfg.name,
        pronoun: cfg.pronoun,
        options: [Math.round(fee * 2), fee, Math.max(1, Math.round(fee * 0.5)), 0],
      },
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
