// Kitchen & Service Counter PixiJS renderer
// Renders ovens (up to 3), service counter plate slots, and kitchen background.
// Kitchen zone visible from Day 1 but greyed/non-interactive until Day 15.
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { OvenState, PlateState } from '../../types/food'
import {
  KITCHEN_TOP,
  KITCHEN_CENTER_Y,
  OVEN_SLOT_POSITIONS,
  SERVICE_COUNTER_LEFT,
  SERVICE_COUNTER_WIDTH,
  BAR_COUNTER_BOTTOM,
  PLATE_SLOT_POSITIONS,
} from '../../config/barLayout'
import { FOOD_BY_ID } from '../../config/food'
import { eventDispatcher } from '../events/eventDispatcher'

const OVEN_RADIUS = 18
const PLATE_RADIUS = 10

const LABEL_STYLE = new TextStyle({ fontSize: 7, fill: 0xf5e6c8, fontFamily: 'Georgia, serif' })
const EMOJI_STYLE = new TextStyle({ fontSize: 11, fontFamily: 'serif' })
const SMALL_STYLE = new TextStyle({ fontSize: 6, fill: 0xaaaaaa, fontFamily: 'Georgia, serif' })

// Oven visual colours per status
const OVEN_COLORS: Record<string, number> = {
  empty:    0x444444,
  cooking:  0x884422,
  ready:    0x226622,
  overdone: 0x886600,
  burnt:    0x221111,
}

interface OvenDisplay {
  container: Container
  body: Graphics
  progressBar: Graphics
  emojiLabel: Text
  statusLabel: Text
}

interface PlateDisplay {
  container: Container
  body: Graphics
  emojiLabel: Text
}

class KitchenRenderer {
  private root: Container | null = null
  private ovenDisplays: OvenDisplay[] = []
  private plateDisplays: PlateDisplay[] = []
  private active = false  // false = greyed out (pre-Day 15)

  init(app: Application, ovensOwned: number, foodUnlocked: boolean): void {
    this.root = new Container()
    app.stage.addChild(this.root)
    this.active = foodUnlocked

    this.drawBackground(foodUnlocked)
    this.drawServiceCounter(foodUnlocked)
    this.buildOvenDisplays(ovensOwned, foodUnlocked)
    this.buildPlateDisplays(foodUnlocked)
  }

  private drawBackground(active: boolean): void {
    if (!this.root) return

    // Kitchen zone background
    const bg = new Graphics()
    bg.rect(0, KITCHEN_TOP, SERVICE_COUNTER_LEFT, BAR_COUNTER_BOTTOM)
    bg.fill({ color: active ? 0x2a1a00 : 0x111111 })
    this.root.addChild(bg)

    // "KITCHEN" label
    const labelStyle = new TextStyle({ fontSize: 7, fill: active ? 0x886644 : 0x444444, fontFamily: 'Georgia, serif' })
    const lbl = new Text({ text: 'KITCHEN', style: labelStyle })
    lbl.anchor.set(0, 0.5)
    lbl.position.set(4, KITCHEN_CENTER_Y)
    this.root.addChild(lbl)
  }

  private drawServiceCounter(active: boolean): void {
    if (!this.root) return

    const bg = new Graphics()
    bg.rect(SERVICE_COUNTER_LEFT, KITCHEN_TOP, SERVICE_COUNTER_WIDTH, BAR_COUNTER_BOTTOM)
    bg.fill({ color: active ? 0x3a2000 : 0x1a1a1a })
    bg.stroke({ color: active ? 0x664422 : 0x333333, width: 1 })
    this.root.addChild(bg)

    const labelStyle = new TextStyle({ fontSize: 6, fill: active ? 0x886644 : 0x333333, fontFamily: 'Georgia, serif' })
    const lbl = new Text({ text: 'SERVICE', style: labelStyle })
    lbl.anchor.set(0.5, 0)
    lbl.position.set(SERVICE_COUNTER_LEFT + SERVICE_COUNTER_WIDTH / 2, 3)
    this.root.addChild(lbl)
  }

  private buildOvenDisplays(ovensOwned: number, active: boolean): void {
    for (let i = 0; i < 3; i++) {
      const pos = OVEN_SLOT_POSITIONS[i]!
      const unlocked = active && i < ovensOwned

      const container = new Container()
      container.position.set(pos.x, pos.y)
      container.eventMode = unlocked ? 'static' : 'none'
      container.cursor = 'pointer'

      const ovenId = `oven_${i + 1}`
      container.on('pointerdown', () => {
        if (unlocked) eventDispatcher.emit('OVEN_CLICKED', { ovenId })
      })

      const body = new Graphics()
      body.circle(0, 0, OVEN_RADIUS)
      body.fill({ color: unlocked ? OVEN_COLORS.empty : 0x222222 })
      body.stroke({ color: unlocked ? 0x886644 : 0x333333, width: 1 })
      container.addChild(body)

      const progressBar = new Graphics()
      progressBar.position.set(-OVEN_RADIUS, OVEN_RADIUS + 2)
      container.addChild(progressBar)

      const emojiLabel = new Text({ text: '', style: EMOJI_STYLE })
      emojiLabel.anchor.set(0.5)
      emojiLabel.position.set(0, 0)
      container.addChild(emojiLabel)

      const statusLabel = new Text({ text: unlocked ? 'empty' : (active ? '—' : ''), style: SMALL_STYLE })
      statusLabel.anchor.set(0.5, 0)
      statusLabel.position.set(0, OVEN_RADIUS + 3)
      container.addChild(statusLabel)

      // Locked indicator for ovens 2/3 not yet purchased
      if (!unlocked && i > 0) {
        const lockStyle = new TextStyle({ fontSize: 8, fill: 0x333333, fontFamily: 'serif' })
        const lock = new Text({ text: active ? '🔒' : '', style: lockStyle })
        lock.anchor.set(0.5)
        lock.position.set(0, 0)
        container.addChild(lock)
      }

      this.root!.addChild(container)
      this.ovenDisplays.push({ container, body, progressBar, emojiLabel, statusLabel })
    }
  }

  private buildPlateDisplays(active: boolean): void {
    for (let i = 0; i < 3; i++) {
      const pos = PLATE_SLOT_POSITIONS[i]!
      const plateId = `plate_${i + 1}`

      const container = new Container()
      container.position.set(pos.x, pos.y)
      container.eventMode = active ? 'static' : 'none'
      container.cursor = 'pointer'

      container.on('pointerdown', () => {
        if (active) eventDispatcher.emit('PLATE_SLOT_CLICKED', { plateId })
      })

      const body = new Graphics()
      body.circle(0, 0, PLATE_RADIUS)
      body.fill({ color: active ? 0x555544 : 0x222222 })
      body.stroke({ color: active ? 0x887766 : 0x333333, width: 1 })
      container.addChild(body)

      const emojiLabel = new Text({ text: '', style: new TextStyle({ fontSize: 9, fontFamily: 'serif' }) })
      emojiLabel.anchor.set(0.5)
      emojiLabel.position.set(0, 0)
      container.addChild(emojiLabel)

      this.root!.addChild(container)
      this.plateDisplays.push({ container, body, emojiLabel })
    }
  }

  // Called each tick from kitchenSystem — syncs oven visuals to state
  syncOvens(ovens: OvenState[], selectedOvenId: string | null, time: number): void {
    for (let i = 0; i < ovens.length && i < this.ovenDisplays.length; i++) {
      const oven = ovens[i]!
      const display = this.ovenDisplays[i]!
      const food = FOOD_BY_ID[oven.foodOrder?.foodId ?? '']
      const isSelected = selectedOvenId === oven.id

      // Update interactivity
      display.container.eventMode = oven.unlocked ? 'static' : 'none'

      // Body color
      display.body.clear()
      display.body.circle(0, 0, OVEN_RADIUS)
      display.body.fill({ color: oven.unlocked ? OVEN_COLORS[oven.status] ?? OVEN_COLORS.empty : 0x222222 })
      display.body.stroke({ color: isSelected ? 0xffd700 : (oven.unlocked ? 0x886644 : 0x333333), width: isSelected ? 2 : 1 })

      // Emoji
      display.emojiLabel.text = oven.foodOrder ? (food?.emoji ?? '') : ''

      // Status label
      if (oven.status === 'burnt') {
        display.statusLabel.text = '🔥 burnt'
      } else if (oven.status === 'overdone') {
        display.statusLabel.text = '⚠ overdone'
      } else if (oven.status === 'ready') {
        // Pulse label
        display.statusLabel.text = Math.sin(time * 0.005) > 0 ? '✓ ready' : ''
      } else if (oven.status === 'cooking' && oven.foodOrder) {
        const pct = 1 - oven.cookTimer / (food?.cookTime ?? 1)
        display.statusLabel.text = `${Math.round(pct * 100)}%`
      } else {
        display.statusLabel.text = oven.unlocked ? 'empty' : (this.active ? '—' : '')
      }

      // Progress bar (cooking only)
      display.progressBar.clear()
      if (oven.status === 'cooking' && oven.foodOrder && food) {
        const pct = Math.max(0, Math.min(1, 1 - oven.cookTimer / food.cookTime))
        const barW = OVEN_RADIUS * 2
        display.progressBar.rect(0, 0, barW, 3).fill({ color: 0x333333 })
        if (pct > 0) {
          display.progressBar.rect(0, 0, Math.round(barW * pct), 3).fill({ color: 0xdd8800 })
        }
      }
    }
  }

  // Called each tick — syncs plate slot visuals to state
  syncPlates(plates: PlateState[], selectedPlateId: string | null): void {
    for (let i = 0; i < plates.length && i < this.plateDisplays.length; i++) {
      const plate = plates[i]!
      const display = this.plateDisplays[i]!
      const isSelected = selectedPlateId === plate.id
      const food = FOOD_BY_ID[plate.foodOrder?.foodId ?? '']

      display.body.clear()
      display.body.circle(0, 0, PLATE_RADIUS)
      display.body.fill({
        color: plate.status === 'plated'
          ? (plate.foodOrder?.overdone ? 0x887733 : 0x448844)
          : 0x555544,
      })
      display.body.stroke({ color: isSelected ? 0xffd700 : 0x887766, width: isSelected ? 2 : 1 })

      display.emojiLabel.text = plate.status === 'plated' ? (food?.emoji ?? '') : ''
    }
  }

  // Unlock ovens 2 and/or 3 when purchased in shop
  unlockOven(ovenIndex: number): void {
    const display = this.ovenDisplays[ovenIndex]
    if (!display) return
    display.container.eventMode = 'static'
    display.body.clear()
    display.body.circle(0, 0, OVEN_RADIUS)
    display.body.fill({ color: OVEN_COLORS.empty })
    display.body.stroke({ color: 0x886644, width: 1 })
    display.statusLabel.text = 'empty'
  }

  destroy(): void {
    this.root?.destroy({ children: true })
    this.root = null
    this.ovenDisplays = []
    this.plateDisplays = []
  }
}

export const kitchenRenderer = new KitchenRenderer()
