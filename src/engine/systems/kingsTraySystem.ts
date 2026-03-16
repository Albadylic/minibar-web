// MBW-109: Noble's Visit — King's Tray mechanic
// Player fills a tray of drinks before the King arrives at arrivalTime.
// Complete tray → coin payout; incomplete → star rating penalty.
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import { DRINKS_BY_ID } from '../../config/drinks'
import { gameLoop } from '../gameLoop'
import { eventDispatcher } from '../events/eventDispatcher'
import { BAR_COUNTER_TOP } from '../../config/barLayout'

const KINGS_TRAY_PAYOUT = 200  // coins awarded on full completion
const KINGS_TRAY_STAR_PENALTY = 0.4  // star loss when king arrives to empty/partial tray
const SLOT_RADIUS = 8
const SLOT_SPACING = 26  // centre-to-centre distance between slots
const TRAY_PADDING = 10

interface TraySlot {
  drinkId: string
  filled: boolean
  circle: Graphics
  cx: number
  cy: number
}

class KingsTraySystem {
  private stage: Container | null = null
  private slots: TraySlot[] = []
  private arrivalTime = 0
  private timeElapsed = 0
  private resolved = false
  private active = false
  private countdownText: Text | null = null

  init(app: Application, tray: { drinks: string[]; arrivalTime: number }): void {
    this.stage = new Container()
    // Render above the bar scene
    app.stage.addChild(this.stage)

    this.arrivalTime = tray.arrivalTime
    this.timeElapsed = 0
    this.resolved = false
    this.active = true
    this.slots = []

    const count = tray.drinks.length
    const trayWidth = TRAY_PADDING * 2 + count * SLOT_RADIUS * 2 + (count - 1) * (SLOT_SPACING - SLOT_RADIUS * 2)
    const trayHeight = SLOT_RADIUS * 2 + TRAY_PADDING * 2
    // Position: centred in bar counter area, slightly right of centre
    const trayX = 187 - trayWidth / 2
    const trayY = BAR_COUNTER_TOP + 4

    // Tray background
    const bg = new Graphics()
    bg.rect(trayX, trayY, trayWidth, trayHeight)
    bg.fill({ color: 0x2a1505 })
    bg.stroke({ color: 0xddb060, width: 2 })
    this.stage.addChild(bg)

    // Tray label
    const labelStyle = new TextStyle({ fontSize: 7, fill: 0xddb060, fontFamily: 'Georgia, serif' })
    const label = new Text({ text: "King's Tray", style: labelStyle })
    label.anchor.set(0.5, 0)
    label.position.set(trayX + trayWidth / 2, trayY + 1)
    this.stage.addChild(label)

    // Drink slots
    tray.drinks.forEach((drinkId, i) => {
      const drink = DRINKS_BY_ID[drinkId]
      const cx = trayX + TRAY_PADDING + SLOT_RADIUS + i * SLOT_SPACING
      const cy = trayY + trayHeight / 2 + 3

      const circle = new Graphics()
      circle.circle(cx, cy, SLOT_RADIUS)
      circle.fill({ color: 0x111111 })
      circle.stroke({ color: drink?.placeholderColor ?? 0x888888, width: 2 })
      circle.eventMode = 'static'
      circle.cursor = 'pointer'

      // Capture cx/cy/drinkId/index in closure
      const capturedIndex = i
      circle.on('pointerdown', () => this.tryFill(capturedIndex))
      this.stage!.addChild(circle)

      this.slots.push({ drinkId, filled: false, circle, cx, cy })
    })

    // Countdown text above tray
    const countdownStyle = new TextStyle({ fontSize: 7, fill: 0xffddaa, fontFamily: 'Georgia, serif' })
    this.countdownText = new Text({ text: '', style: countdownStyle })
    this.countdownText.anchor.set(0.5, 1)
    this.countdownText.position.set(trayX + trayWidth / 2, trayY - 1)
    this.stage.addChild(this.countdownText)
  }

  tick(dt: number): void {
    if (!this.active || this.resolved || !this.stage) return

    this.timeElapsed += dt

    // Update countdown
    const remaining = Math.max(0, this.arrivalTime - this.timeElapsed)
    if (this.countdownText) {
      this.countdownText.text = `King in ${Math.ceil(remaining)}s`
    }

    if (this.timeElapsed >= this.arrivalTime) {
      this.resolve()
    }
  }

  private tryFill(slotIndex: number): void {
    if (!this.active || this.resolved) return
    const slot = this.slots[slotIndex]
    if (!slot || slot.filled) return

    const selectedDrink = gameLoop.selectedDrink
    if (!selectedDrink || selectedDrink !== slot.drinkId) return

    // Fill the slot with the drink's colour
    slot.filled = true
    const drink = DRINKS_BY_ID[slot.drinkId]
    slot.circle.clear()
    slot.circle.circle(slot.cx, slot.cy, SLOT_RADIUS)
    slot.circle.fill({ color: drink?.placeholderColor ?? 0x888888 })
    slot.circle.stroke({ color: 0xddb060, width: 2 })
    slot.circle.eventMode = 'none'
    slot.circle.cursor = 'default'

    eventDispatcher.emit('KINGS_TRAY_SLOT_FILLED', { slotIndex, drinkId: slot.drinkId })
  }

  private resolve(): void {
    this.resolved = true
    const complete = this.slots.every((s) => s.filled)

    if (complete) {
      gameLoop.addCoins(KINGS_TRAY_PAYOUT)
      eventDispatcher.emit('KINGS_TRAY_RESOLVED', { complete: true, coinsEarned: KINGS_TRAY_PAYOUT })
    } else {
      const isGameOver = gameLoop.adjustStarRating(-KINGS_TRAY_STAR_PENALTY)
      eventDispatcher.emit('KINGS_TRAY_RESOLVED', { complete: false, coinsEarned: 0 })
      if (isGameOver) {
        gameLoop.triggerGameOver()
      }
    }

    // Dim the tray to signal resolution
    if (this.stage) {
      this.stage.alpha = 0.4
    }
    if (this.countdownText) {
      this.countdownText.text = complete ? '👑 Done!' : '👑 Failed'
    }
  }

  destroy(): void {
    eventDispatcher.off('KINGS_TRAY_SLOT_FILLED', () => {})
    this.stage?.destroy({ children: true })
    this.stage = null
    this.slots = []
    this.active = false
    this.resolved = false
    this.countdownText = null
  }
}

export const kingsTraySystem = new KingsTraySystem()
