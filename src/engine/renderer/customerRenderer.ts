// MBW-20: Customer sprite rendering + click/tap detection
// MBW-80: BRAWLING state — hooligan is tappable, shows eject progress bar
// MBW-132: Accessibility — patience bar adds size + motion cues beyond colour
// Food: food order indicator + eating progress bar
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { CustomerEntity } from '../../entities/customer'
import { CUSTOMER_CONFIGS } from '../../config/customers'
import { DRINKS_BY_ID } from '../../config/drinks'
import { FOOD_BY_ID } from '../../config/food'
import { barScene } from './barScene'
import { eventDispatcher } from '../events/eventDispatcher'
import { brawlSystem } from '../systems/brawlSystem'
import { REGULARS_BY_ID } from '../../config/regulars'

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
  foodIndicator: Text    // Food: emoji label above head for food orders
  patienceBarBg: Graphics
  patienceBar: Graphics
  ejectBarBg: Graphics   // MBW-80: brawl eject progress bar
  ejectBar: Graphics
  eatBarBg: Graphics     // Food: eating progress bar
  eatBar: Graphics
  label: Text
}

const labelStyle = new TextStyle({
  fontSize: 8,
  fill: 0xf5e6c8,
  fontFamily: 'Georgia, serif',
})

const foodIndicatorStyle = new TextStyle({
  fontSize: 11,
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

    // Food: emoji indicator above head for food-ordering customers
    const foodIndicator = new Text({ text: '', style: foodIndicatorStyle })
    foodIndicator.anchor.set(0.5)
    foodIndicator.position.set(0, -BODY_RADIUS - 10)
    foodIndicator.visible = false
    root.addChild(foodIndicator)

    // Food: eating progress bar (replaces patience bar while EATING)
    const eatBarBg = new Graphics()
    eatBarBg.position.set(-PATIENCE_BAR_WIDTH / 2, -BODY_RADIUS - 20)
    eatBarBg.visible = false
    root.addChild(eatBarBg)

    const eatBar = new Graphics()
    eatBar.position.set(-PATIENCE_BAR_WIDTH / 2, -BODY_RADIUS - 20)
    eatBar.visible = false
    root.addChild(eatBar)

    // MBW-164: Type-specific markers make special customers instantly recognisable
    // MBW-NEW: Regulars use their class letter (B=Blacksmith, F=Farmer, P=Priest, M=Merchant)
    const markerText =
      customer.isRegular && customer.regularId
        ? (REGULARS_BY_ID[customer.regularId]?.letterMarker ?? customer.skin[0]!.toUpperCase())
        : customer.type === 'HOOLIGAN' ? 'H'
        : customer.type === 'RICH' ? 'D'
        : customer.skin[0]!.toUpperCase()
    const label = new Text({ text: markerText, style: labelStyle })
    label.anchor.set(0.5)
    label.position.set(0, 1)
    root.addChild(label)

    this.stage!.addChild(root)
    return { root, body, drinkIndicator, foodIndicator, patienceBarBg, patienceBar, ejectBarBg, ejectBar, eatBarBg, eatBar, label }
  }

  private updateDisplay(display: CustomerDisplayObjects, customer: CustomerEntity): void {
    const { root, body, drinkIndicator, foodIndicator, patienceBarBg, patienceBar, ejectBarBg, ejectBar, eatBarBg, eatBar } = display

    // Position
    root.position.set(customer.position.x, customer.position.y)

    // Body color — regulars are green; otherwise use type-specific config
    // MBW-NEW: Green sprites make regulars instantly identifiable
    const config = CUSTOMER_CONFIGS[customer.type]
    const bodyColor = customer.isRegular ? 0x22aa44 : config.placeholderColors[customer.skin]
    body.clear()
    body.circle(0, 0, BODY_RADIUS)
    body.fill({ color: bodyColor })

    // Clickable when WAITING (serve/acknowledge food), BRAWLING (eject), or EATING (food delivery target)
    root.eventMode = (customer.status === 'WAITING' || customer.status === 'BRAWLING' || customer.status === 'EATING') ? 'static' : 'none'

    // Food: determine if this customer is in a food ordering state
    const isOrdering = customer.currentOrderType === 'food' && customer.foodOrderStage === 'ORDERING' && customer.status === 'WAITING'
    const isWaitingForFood = customer.currentOrderType === 'food' && customer.foodOrderStage !== null && customer.foodOrderStage !== 'ORDERING' && customer.status === 'WAITING'

    // Drink order indicator — show when WAITING/REORDERING for a drink (not food)
    const showDrinkOrder = (customer.status === 'WAITING' || customer.status === 'REORDERING') && customer.currentOrderType === 'drink'
    drinkIndicator.visible = showDrinkOrder
    if (showDrinkOrder) {
      const drink = DRINKS_BY_ID[customer.drinkOrder]
      drinkIndicator.clear()
      drinkIndicator.circle(0, 0, 6)
      drinkIndicator.fill({ color: drink?.placeholderColor ?? 0xaaaaaa })
    }

    // Food indicator — show emoji when customer is ordering food or waiting for it to be delivered
    const showFoodIndicator = isOrdering || isWaitingForFood
    foodIndicator.visible = showFoodIndicator
    if (showFoodIndicator && customer.foodOrderFoodId) {
      const food = FOOD_BY_ID[customer.foodOrderFoodId]
      foodIndicator.text = food?.emoji ?? '?'
      const isReady = customer.waitingIndicator === 'ready_pulse'
      const isGreyed = customer.waitingIndicator === 'greyed'
      foodIndicator.alpha = isGreyed ? 0.45 : 1.0
      if (isOrdering) {
        // Pulse to get player attention
        const pulse = 0.75 + 0.25 * Math.sin(performance.now() * 0.006)
        foodIndicator.scale.set(pulse)
      } else if (isReady) {
        const pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.01)
        foodIndicator.scale.set(pulse)
      } else {
        foodIndicator.scale.set(1)
      }
    }

    // Patience bar — visible when WAITING for a drink (not food, not eating)
    const showPatience = customer.status === 'WAITING' && customer.currentOrderType === 'drink'
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

    // Food: eating progress bar — visible only when EATING
    const isEating = customer.status === 'EATING'
    eatBarBg.visible = isEating
    eatBar.visible = isEating

    if (isEating) {
      const fillWidth = PATIENCE_BAR_WIDTH * Math.min(1, customer.eatProgress)
      eatBarBg.clear()
      eatBarBg.rect(0, 0, PATIENCE_BAR_WIDTH, PATIENCE_BAR_HEIGHT)
      eatBarBg.fill({ color: 0x333333 })

      eatBar.clear()
      if (fillWidth > 0) {
        eatBar.rect(0, 0, fillWidth, PATIENCE_BAR_HEIGHT)
        eatBar.fill({ color: 0xdd8833 })
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
