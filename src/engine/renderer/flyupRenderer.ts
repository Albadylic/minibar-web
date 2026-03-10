// MBW-67: Coin '+X' fly-up on earn — PixiJS text that floats up and fades from serve position
import { Container, Text, TextStyle } from 'pixi.js'
import type { Application } from 'pixi.js'
import { eventDispatcher } from '../events/eventDispatcher'
import { customerSystem } from '../systems/customerSystem'

const FLYUP_DURATION = 0.9  // seconds until fully faded
const FLYUP_SPEED    = 45   // canvas units per second upward

const flyupStyle = new TextStyle({
  fontSize: 13,
  fill: 0xffd700,
  fontFamily: 'Georgia, serif',
  fontWeight: 'bold',
  dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.6 },
})

interface Flyup {
  text: Text
  y: number
  alpha: number
}

class FlyupRenderer {
  private stage: Container | null = null
  private flyups: Flyup[] = []
  private lastTime = 0

  init(app: Application): void {
    this.stage = new Container()
    app.stage.addChild(this.stage)
    this.lastTime = performance.now()
    eventDispatcher.on('DRINK_SERVED', this.handleDrinkServed)
  }

  private handleDrinkServed = ({
    customerId,
    coinsEarned,
  }: {
    customerId: string
    coinsEarned: number
  }): void => {
    if (!this.stage || coinsEarned <= 0) return

    const customer = customerSystem.customers.find((c) => c.id === customerId)
    if (!customer) return

    const text = new Text({ text: `+${coinsEarned}`, style: flyupStyle })
    text.anchor.set(0.5)
    // Spawn slightly above the customer's centre
    const startY = customer.position.y - 24
    text.position.set(customer.position.x, startY)
    this.stage.addChild(text)

    this.flyups.push({ text, y: startY, alpha: 1 })
  }

  // Called from game loop render step — uses wall-clock delta so it runs at frame rate
  tick(): void {
    if (!this.stage || this.flyups.length === 0) return

    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now

    for (let i = this.flyups.length - 1; i >= 0; i--) {
      const flyup = this.flyups[i]!
      flyup.y -= FLYUP_SPEED * dt
      flyup.alpha -= dt / FLYUP_DURATION
      flyup.text.position.y = flyup.y
      flyup.text.alpha = Math.max(0, flyup.alpha)

      if (flyup.alpha <= 0) {
        flyup.text.destroy()
        this.flyups.splice(i, 1)
      }
    }
  }

  destroy(): void {
    eventDispatcher.off('DRINK_SERVED', this.handleDrinkServed)
    this.stage?.destroy({ children: true })
    this.stage = null
    this.flyups = []
  }
}

export const flyupRenderer = new FlyupRenderer()
