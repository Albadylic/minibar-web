// MBW-20: Customer sprite rendering + click/tap detection
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { CustomerEntity } from '../../entities/customer'
import { CUSTOMER_CONFIGS } from '../../config/customers'
import { DRINKS_BY_ID } from '../../config/drinks'
import { barScene } from './barScene'
import { eventDispatcher } from '../events/eventDispatcher'

const BODY_RADIUS = 14
const PATIENCE_BAR_WIDTH = 32
const PATIENCE_BAR_HEIGHT = 4

interface CustomerDisplayObjects {
  root: Container
  body: Graphics
  drinkIndicator: Graphics
  patienceBarBg: Graphics
  patienceBar: Graphics
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

    // Skin name label (small, for placeholder clarity)
    const label = new Text({ text: customer.skin[0]!.toUpperCase(), style: labelStyle })
    label.anchor.set(0.5)
    label.position.set(0, 1)
    root.addChild(label)

    this.stage!.addChild(root)
    return { root, body, drinkIndicator, patienceBarBg, patienceBar, label }
  }

  private updateDisplay(display: CustomerDisplayObjects, customer: CustomerEntity): void {
    const { root, body, drinkIndicator, patienceBarBg, patienceBar } = display

    // Position
    root.position.set(customer.position.x, customer.position.y)

    // Body color from skin config
    const bodyColor = CUSTOMER_CONFIGS.NORMAL.placeholderColors[customer.skin]
    body.clear()
    body.circle(0, 0, BODY_RADIUS)
    body.fill({ color: bodyColor })

    // Clickable only when WAITING
    root.eventMode = customer.status === 'WAITING' ? 'static' : 'none'

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
    patienceBarBg.visible = showPatience
    patienceBar.visible = showPatience

    if (showPatience) {
      const ratio = Math.max(0, customer.patienceTimer / customer.patienceMax)
      const fillWidth = PATIENCE_BAR_WIDTH * ratio
      const barColor = ratio > 0.6 ? 0x44cc44 : ratio > 0.3 ? 0xddcc00 : 0xcc2222

      patienceBarBg.clear()
      patienceBarBg.rect(0, 0, PATIENCE_BAR_WIDTH, PATIENCE_BAR_HEIGHT)
      patienceBarBg.fill({ color: 0x222222 })

      patienceBar.clear()
      if (fillWidth > 0) {
        patienceBar.rect(0, 0, fillWidth, PATIENCE_BAR_HEIGHT)
        patienceBar.fill({ color: barColor })
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
