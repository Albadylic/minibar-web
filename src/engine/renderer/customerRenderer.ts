// MBW-20: Customer sprite rendering + click/tap detection
// MBW-80: BRAWLING state — hooligan is tappable, shows eject progress bar
// MBW-132: Accessibility — patience bar adds size + motion cues beyond colour
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { CustomerEntity } from '../../entities/customer'
import { CUSTOMER_CONFIGS } from '../../config/customers'
import { DRINKS_BY_ID } from '../../config/drinks'
import { barScene } from './barScene'
import { eventDispatcher } from '../events/eventDispatcher'
import { brawlSystem } from '../systems/brawlSystem'

const BODY_RADIUS = 14
const PATIENCE_BAR_WIDTH = 32
const PATIENCE_BAR_HEIGHT = 4
// MBW-132: Critical patience bar grows taller to provide a size cue beyond colour
const PATIENCE_BAR_HEIGHT_CRITICAL = 6
// MBW-132: Pulse frequency for the critical bar flicker (radians/ms)
const PATIENCE_PULSE_FREQ = 0.008

interface CustomerDisplayObjects {
  root: Container
  body: Graphics
  drinkIndicator: Graphics
  patienceBarBg: Graphics
  patienceBar: Graphics
  ejectBarBg: Graphics   // MBW-80: brawl eject progress bar
  ejectBar: Graphics
  label: Text
}

const labelStyle = new TextStyle({
  fontSize: 8,
  fill: 0xf5e6c8,
  fontFamily: 'Georgia, serif',
})

class CustomerRenderer {
  private stage: Container | null = null
  private displays = new Map<string, CustomerDisplayObjects>()

  init(app: Application): void {
    this.stage = new Container()
    // Customers render above the bar background layer
    app.stage.addChild(this.stage)
  }

  // Called from game loop render step — syncs PixiJS objects to entity state
  sync(customers: CustomerEntity[]): void {
    if (!this.stage) return

    const currentIds = new Set(customers.map((c) => c.id))

    // Remove displays for departed customers
    for (const [id, display] of this.displays) {
      if (!currentIds.has(id)) {
        display.root.destroy({ children: true })
        this.displays.delete(id)
      }
    }

    // Create or update display for each customer
    for (const customer of customers) {
      let display = this.displays.get(customer.id)
      if (!display) {
        display = this.createDisplay(customer)
        this.displays.set(customer.id, display)
      }
      this.updateDisplay(display, customer)
    }
  }

  private createDisplay(customer: CustomerEntity): CustomerDisplayObjects {
    const root = new Container()

    // MBW-20: Enable pointer events for click detection
    root.eventMode = 'static'
    root.cursor = 'pointer'
    root.on('pointerdown', () => {
      eventDispatcher.emit('CUSTOMER_CLICKED', { customerId: customer.id })
    })

    // Body circle
    const body = new Graphics()
    root.addChild(body)

    // Drink order indicator (small colored circle above head)
    const drinkIndicator = new Graphics()
    drinkIndicator.position.set(0, -BODY_RADIUS - 8)
    root.addChild(drinkIndicator)

    // Patience bar background
    const patienceBarBg = new Graphics()
    patienceBarBg.position.set(-PATIENCE_BAR_WIDTH / 2, -BODY_RADIUS - 20)
    root.addChild(patienceBarBg)

    // Patience bar fill
    const patienceBar = new Graphics()
    patienceBar.position.set(-PATIENCE_BAR_WIDTH / 2, -BODY_RADIUS - 20)
    root.addChild(patienceBar)

    // MBW-80: Eject progress bar (shown during BRAWLING state)
    const ejectBarBg = new Graphics()
    ejectBarBg.position.set(-PATIENCE_BAR_WIDTH / 2, -BODY_RADIUS - 20)
    ejectBarBg.visible = false
    root.addChild(ejectBarBg)

    const ejectBar = new Graphics()
    ejectBar.position.set(-PATIENCE_BAR_WIDTH / 2, -BODY_RADIUS - 20)
    ejectBar.visible = false
    root.addChild(ejectBar)

    // MBW-164: Type-specific markers make special customers instantly recognisable
    const markerText =
      customer.type === 'HOOLIGAN' ? 'H' :
      customer.type === 'RICH' ? 'D' :
      customer.skin[0]!.toUpperCase()
    const label = new Text({ text: markerText, style: labelStyle })
    label.anchor.set(0.5)
    label.position.set(0, 1)
    root.addChild(label)

    this.stage!.addChild(root)
    return { root, body, drinkIndicator, patienceBarBg, patienceBar, ejectBarBg, ejectBar, label }
  }

  private updateDisplay(display: CustomerDisplayObjects, customer: CustomerEntity): void {
    const { root, body, drinkIndicator, patienceBarBg, patienceBar, ejectBarBg, ejectBar } = display

    // Position
    root.position.set(customer.position.x, customer.position.y)

    // Body color — use type-specific config (hooligan red vs normal skin colors)
    const config = CUSTOMER_CONFIGS[customer.type]
    const bodyColor = config.placeholderColors[customer.skin]
    body.clear()
    body.circle(0, 0, BODY_RADIUS)
    body.fill({ color: bodyColor })

    // Clickable when WAITING (serve) or BRAWLING (tap to eject)
    root.eventMode = (customer.status === 'WAITING' || customer.status === 'BRAWLING') ? 'static' : 'none'

    // Drink order indicator — show when WAITING or REORDERING
    const showDrinkOrder = customer.status === 'WAITING' || customer.status === 'REORDERING'
    drinkIndicator.visible = showDrinkOrder
    if (showDrinkOrder) {
      const drink = DRINKS_BY_ID[customer.drinkOrder]
      drinkIndicator.clear()
      drinkIndicator.circle(0, 0, 6)
      drinkIndicator.fill({ color: drink?.placeholderColor ?? 0xaaaaaa })
    }

    // Patience bar — visible only when WAITING
    const showPatience = customer.status === 'WAITING'
    const patienceRatio = customer.patienceMax > 0 ? customer.patienceTimer / customer.patienceMax : 1
    patienceBarBg.visible = showPatience
    patienceBar.visible = showPatience

    // Shake the drink order indicator when patience is critical (<=30%)
    if (showDrinkOrder && patienceRatio <= 0.3) {
      const shake = Math.sin(performance.now() * 0.03) * 2.5
      drinkIndicator.position.set(shake, -BODY_RADIUS - 8)
    } else {
      drinkIndicator.position.set(0, -BODY_RADIUS - 8)
    }

    if (showPatience) {
      const ratio = Math.max(0, patienceRatio)
      const fillWidth = PATIENCE_BAR_WIDTH * ratio
      const isCritical = ratio <= 0.3
      const barColor = ratio > 0.6 ? 0x44cc44 : ratio > 0.3 ? 0xddcc00 : 0xcc2222
      // MBW-132: Taller bar at critical patience (size cue beyond colour)
      const barHeight = isCritical ? PATIENCE_BAR_HEIGHT_CRITICAL : PATIENCE_BAR_HEIGHT

      patienceBarBg.clear()
      patienceBarBg.rect(0, 0, PATIENCE_BAR_WIDTH, barHeight)
      // MBW-132: Slightly lighter background for better contrast
      patienceBarBg.fill({ color: 0x333333 })

      patienceBar.clear()
      if (fillWidth > 0) {
        patienceBar.rect(0, 0, fillWidth, barHeight)
        patienceBar.fill({ color: barColor })
      }
      // MBW-132: Pulse alpha when critical — motion cue independent of colour vision
      if (isCritical) {
        const pulse = 0.65 + 0.35 * Math.sin(performance.now() * PATIENCE_PULSE_FREQ)
        patienceBar.alpha = pulse
      } else {
        patienceBar.alpha = 1
      }
    }

    // MBW-80: Eject progress bar — visible only for the brawl instigator when BRAWLING
    const isBrawling = customer.status === 'BRAWLING'
    ejectBarBg.visible = isBrawling
    ejectBar.visible = isBrawling

    if (isBrawling) {
      const brawl = brawlSystem.getBrawlForCustomer(customer.id)
      const progress = (brawl?.instigatorId === customer.id) ? brawl.ejectProgress : 0
      const fillWidth = PATIENCE_BAR_WIDTH * progress

      ejectBarBg.clear()
      ejectBarBg.rect(0, 0, PATIENCE_BAR_WIDTH, PATIENCE_BAR_HEIGHT)
      ejectBarBg.fill({ color: 0x440000 })

      ejectBar.clear()
      if (fillWidth > 0) {
        ejectBar.rect(0, 0, fillWidth, PATIENCE_BAR_HEIGHT)
        ejectBar.fill({ color: 0xff6600 })
      }
    }

    // Update seat occupied state in bar scene
    barScene.setSeatOccupied(customer.seatId, customer.status !== 'LEAVING')
  }

  destroy(): void {
    this.stage?.destroy({ children: true })
    this.stage = null
    this.displays.clear()
  }
}

export const customerRenderer = new CustomerRenderer()
