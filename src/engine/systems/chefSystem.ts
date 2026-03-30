// Chef NPC system — automates kitchen queue management
// Level 1: auto-moves queue orders to available ovens
// Level 2: faster, prioritises lowest Patience Window 2 remaining
// Level 3: also auto-moves cooked food from ovens to service counter plates
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import { kitchenSystem } from './kitchenSystem'
import { OVEN_SLOT_POSITIONS, KITCHEN_CENTER_Y } from '../../config/barLayout'

const CHEF_RADIUS = 8
// Seconds between automated actions (shorter = faster chef response)
const ACTION_INTERVAL: Record<1 | 2 | 3, number> = { 1: 1.5, 2: 0.8, 3: 0.4 }

const CHEF_HOME = { x: OVEN_SLOT_POSITIONS[0]!.x - 24, y: KITCHEN_CENTER_Y }

class ChefSystem {
  private tier: 1 | 2 | 3 = 1
  private actionCooldown = 0
  private stage: Container | null = null
  private graphic: Graphics | null = null

  init(app: Application, tier: 1 | 2 | 3): void {
    this.tier = tier
    this.actionCooldown = ACTION_INTERVAL[tier]
    this.stage = new Container()
    app.stage.addChild(this.stage)

    // Chef NPC — white circle placeholder
    this.graphic = new Graphics()
    this.graphic.circle(0, 0, CHEF_RADIUS)
    this.graphic.fill({ color: 0xffffff })
    this.graphic.stroke({ color: 0xccaa66, width: 1 })
    this.graphic.position.set(CHEF_HOME.x, CHEF_HOME.y)
    this.stage.addChild(this.graphic)

    const labelStyle = new TextStyle({ fontSize: 7, fill: 0x333333, fontFamily: 'Georgia, serif' })
    const lbl = new Text({ text: 'C', style: labelStyle })
    lbl.anchor.set(0.5)
    lbl.position.set(CHEF_HOME.x, CHEF_HOME.y)
    this.stage.addChild(lbl)
  }

  destroy(): void {
    this.stage?.destroy({ children: true })
    this.stage = null
    this.graphic = null
  }

  tick(dt: number): void {
    this.actionCooldown -= dt
    if (this.actionCooldown > 0) return
    this.actionCooldown = ACTION_INTERVAL[this.tier]

    const prioritise = this.tier >= 2

    // Try to move queue → oven
    const moved = kitchenSystem.chefMoveQueueToOven(prioritise)

    // Level 3: also move cooked food → plate
    if (this.tier >= 3 && !moved) {
      kitchenSystem.chefMoveOvenToPlate()
    }
  }
}

export const chefSystem = new ChefSystem()
