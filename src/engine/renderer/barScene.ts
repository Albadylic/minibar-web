// MBW-13: Bar background (placeholder)
// MBW-15: Drink taps (placeholder circles, interactive)
// MBW-16: Seats and tables (placeholder rectangles)
// MBW-42: Render owned upgrades as placeholder sprites
// MBW-161: Stage area rendered when Stage upgrade is owned
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import {
  BAR_COUNTER_TOP,
  BAR_COUNTER_BOTTOM,
  FLOOR_BOTTOM,
  CANVAS_WIDTH,
  TABLES,
  SEATS,
  TAP_Y,
  TAP_POSITIONS_X,
  DOORWAY,
  STAGE_POSITION,
  STAGE_AREA,
} from '../../config/barLayout'
import { DRINKS_BY_ID } from '../../config/drinks'
import { UPGRADES_BY_ID } from '../../config/upgrades'
import { eventDispatcher } from '../events/eventDispatcher'

// Colours for placeholder art
const COLORS = {
  counter: 0x5c3211,
  counterFront: 0x7a4a1e,
  floor: 0x2e1a06,
  table: 0x6b3d14,
  barStoolEmpty: 0x8b5e2a,
  barStoolOccupied: 0x4a3010,
  tableChairEmpty: 0x7a5020,
  tableChairOccupied: 0x3d2810,
  doorway: 0x120a00,
  tapDefault: 0x6b6b6b,
  tapSelected: 0xffd700,
  tapLabel: 0xf5e6c8,
}

interface TapSprite {
  container: Container
  circle: Graphics
  drinkId: string
}

class BarScene {
  private root: Container | null = null
  private tapSprites: Map<string, TapSprite> = new Map()
  private seatGraphics: Map<string, Graphics> = new Map()
  private selectedDrinkId: string | null = null

  // MBW-147/159/160: extraSeatTier gates which tables/seats are rendered
  // MBW-161: ownedUpgradeIds drives stage visibility
  init(app: Application, unlockedDrinkIds: string[], ownedUpgradeIds: string[] = [], extraSeatTier = 0): void {
    this.root = new Container()
    app.stage.addChild(this.root)

    this.drawBackground()
    if (ownedUpgradeIds.includes('stage')) this.drawStage()
    this.drawSeatsAndTables(extraSeatTier)
    this.drawTaps(unlockedDrinkIds)
    this.drawUpgrades(ownedUpgradeIds)
  }

  // MBW-13: Placeholder bar background
  private drawBackground(): void {
    if (!this.root) return

    // Floor
    const floor = new Graphics()
    floor.rect(0, BAR_COUNTER_BOTTOM, CANVAS_WIDTH, FLOOR_BOTTOM - BAR_COUNTER_BOTTOM)
    floor.fill({ color: COLORS.floor })
    this.root.addChild(floor)

    // Bar counter
    const counter = new Graphics()
    counter.rect(0, BAR_COUNTER_TOP, CANVAS_WIDTH, BAR_COUNTER_BOTTOM - BAR_COUNTER_TOP)
    counter.fill({ color: COLORS.counter })
    this.root.addChild(counter)

    // Counter front edge highlight
    const counterFront = new Graphics()
    counterFront.rect(0, BAR_COUNTER_BOTTOM - 6, CANVAS_WIDTH, 6)
    counterFront.fill({ color: COLORS.counterFront })
    this.root.addChild(counterFront)

    // Doorway (dark rectangle at centre bottom)
    const doorway = new Graphics()
    doorway.rect(DOORWAY.x - 28, FLOOR_BOTTOM - 50, 56, 50)
    doorway.fill({ color: COLORS.doorway })
    this.root.addChild(doorway)
  }

  // MBW-161: Stage area at bottom-left — visible when Stage upgrade is owned
  private drawStage(): void {
    if (!this.root) return
    const { width, height } = STAGE_AREA
    const { x, y } = STAGE_POSITION

    // Stage platform
    const platform = new Graphics()
    platform.rect(x - width / 2, y - height / 2, width, height)
    platform.fill({ color: 0x3a2808 })
    platform.stroke({ color: 0x8b6331, width: 2 })
    this.root.addChild(platform)

    // Stage label
    const labelStyle = new TextStyle({ fontSize: 7, fill: 0xb89060, fontFamily: 'Georgia, serif' })
    const label = new Text({ text: 'STAGE', style: labelStyle })
    label.anchor.set(0.5)
    label.position.set(x, y)
    this.root.addChild(label)
  }

  // MBW-16: Placeholder seats and tables
  // MBW-147/159/160: Filter by extraSeatTier — only render seats/tables available at current tier
  private drawSeatsAndTables(extraSeatTier = 0): void {
    if (!this.root) return

    // Tables
    for (const table of TABLES) {
      if (table.upgradeRequired !== null && table.upgradeRequired > extraSeatTier) continue
      const g = new Graphics()
      g.rect(
        table.position.x - table.width / 2,
        table.position.y - table.height / 2,
        table.width,
        table.height,
      )
      g.fill({ color: COLORS.table })
      this.root.addChild(g)
    }

    // Seats
    for (const seat of SEATS) {
      if (seat.upgradeRequired !== null && seat.upgradeRequired > extraSeatTier) continue
      const g = new Graphics()
      const size = seat.type === 'bar_stool' ? 16 : 14
      g.rect(-size / 2, -size / 2, size, size)
      g.fill({ color: COLORS.barStoolEmpty })
      g.position.set(seat.position.x, seat.position.y)
      this.root.addChild(g)
      this.seatGraphics.set(seat.id, g)
    }
  }

  // MBW-15: Drink tap placeholders — interactive circles
  private drawTaps(unlockedDrinkIds: string[]): void {
    if (!this.root) return

    const labelStyle = new TextStyle({
      fontSize: 9,
      fill: COLORS.tapLabel,
      fontFamily: 'Georgia, serif',
    })
    const keyStyle = new TextStyle({
      fontSize: 8,
      fill: 0xffffff,
      fontFamily: 'Georgia, serif',
      fontWeight: 'bold',
    })

    unlockedDrinkIds.forEach((drinkId, index) => {
      if (index >= TAP_POSITIONS_X.length) return
      const drink = DRINKS_BY_ID[drinkId]
      if (!drink) return

      const x = TAP_POSITIONS_X[index]!

      const container = new Container()
      container.position.set(x, TAP_Y)
      container.eventMode = 'static'
      container.cursor = 'pointer'

      // Tap circle
      const circle = new Graphics()
      circle.circle(0, 0, 12)
      circle.fill({ color: drink.placeholderColor })
      circle.stroke({ color: COLORS.tapDefault, width: 2 })
      container.addChild(circle)

      // MBW-163: Key number label inside circle
      const keyLabel = new Text({ text: String(index + 1), style: keyStyle })
      keyLabel.anchor.set(0.5)
      keyLabel.position.set(0, 0)
      container.addChild(keyLabel)

      // Drink name label
      const label = new Text({ text: drink.name, style: labelStyle })
      label.anchor.set(0.5, 0)
      label.position.set(0, 15)
      container.addChild(label)

      container.on('pointerdown', () => {
        eventDispatcher.emit('DRINK_CLICKED', { drinkId })
      })

      this.root!.addChild(container)
      this.tapSprites.set(drinkId, { container, circle, drinkId })
    })
  }

  // Called when a drink is selected/deselected — highlights the active tap
  setSelectedDrink(drinkId: string | null): void {
    // Deselect previous
    if (this.selectedDrinkId) {
      const prev = this.tapSprites.get(this.selectedDrinkId)
      if (prev) {
        prev.circle.clear()
        const drink = DRINKS_BY_ID[this.selectedDrinkId]
        if (drink) {
          prev.circle.circle(0, 0, 12)
          prev.circle.fill({ color: drink.placeholderColor })
          prev.circle.stroke({ color: COLORS.tapDefault, width: 2 })
        }
      }
    }

    this.selectedDrinkId = drinkId

    // Highlight new selection
    if (drinkId) {
      const tap = this.tapSprites.get(drinkId)
      const drink = DRINKS_BY_ID[drinkId]
      if (tap && drink) {
        tap.circle.clear()
        tap.circle.circle(0, 0, 14)
        tap.circle.fill({ color: drink.placeholderColor })
        tap.circle.stroke({ color: COLORS.tapSelected, width: 3 })
      }
    }
  }

  // Update seat occupied state (called by customer system)
  setSeatOccupied(seatId: string, occupied: boolean): void {
    const g = this.seatGraphics.get(seatId)
    if (!g) return
    g.tint = occupied ? COLORS.barStoolOccupied : 0xffffff
  }

  // Add a newly unlocked drink tap
  addDrinkTap(drinkId: string): void {
    if (!this.root) return
    this.drawTaps([drinkId]) // will use correct index from position array
    // Re-draw all to get correct x positions
    this.rebuildTaps(
      [...this.tapSprites.keys(), drinkId],
    )
  }

  private rebuildTaps(drinkIds: string[]): void {
    // Remove old tap sprites
    for (const { container } of this.tapSprites.values()) {
      container.destroy()
    }
    this.tapSprites.clear()
    this.drawTaps(drinkIds)
  }

  // MBW-42: Render owned upgrades as coloured placeholder shapes in the bar
  private drawUpgrades(ownedUpgradeIds: string[]): void {
    if (!this.root) return

    const labelStyle = new TextStyle({ fontSize: 8, fill: 0xf5e6c8, fontFamily: 'Georgia, serif' })

    for (const upgradeId of ownedUpgradeIds) {
      const config = UPGRADES_BY_ID[upgradeId]
      if (!config) continue

      const g = new Graphics()
      g.rect(-12, -12, 24, 24)
      g.fill({ color: config.placeholderColor })
      g.stroke({ color: 0xffd700, width: 1 })
      g.position.set(config.visualPlacement.x, config.visualPlacement.y)

      const label = new Text({ text: config.name[0] ?? '?', style: labelStyle })
      label.anchor.set(0.5)
      label.position.set(0, 0)
      g.addChild(label)

      this.root.addChild(g)
    }
  }

  destroy(): void {
    this.root?.destroy({ children: true })
    this.root = null
    this.tapSprites.clear()
    this.seatGraphics.clear()
    this.selectedDrinkId = null
  }
}

export const barScene = new BarScene()
