// MBW-26: Drink selection (click tap to select/deselect)
// MBW-27: Serve action (click customer with drink selected)
// MBW-28: Coin reward on correct serve
// MBW-NEW: Star rating adjustments removed — review system handles reputation now
import { eventDispatcher } from '../events/eventDispatcher'
import { gameLoop } from '../gameLoop'
import { customerSystem } from './customerSystem'
import { barScene } from '../renderer/barScene'
import { DRINKS_BY_ID } from '../../config/drinks'
import type { DrinkConfig } from '../../config/drinks'
import { entertainerSystem } from './entertainerSystem'
import type { CustomerEntity } from '../../entities/customer'

class DrinkServingSystem {
  // MBW-26: Toggle drink selection on tap click
  private handleDrinkClicked = ({ drinkId }: { drinkId: string }): void => {
    const current = gameLoop.selectedDrink
    const next = current === drinkId ? null : drinkId
    gameLoop.selectDrink(next)
    barScene.setSelectedDrink(next)
  }

  // MBW-27: Attempt serve when customer is clicked with a drink selected
  private handleCustomerClicked = ({ customerId }: { customerId: string }): void => {
    const customer = customerSystem.getCustomer(customerId)
    if (!customer) return

    // MBW-95: Drunk customer — player taps to escort out (no drink needed)
    if (!customer.canBeServed) {
      if (customer.status === 'WAITING') {
        customerSystem.escortDrunk(customerId)
        eventDispatcher.emit('DRUNK_ESCORTED', { customerId, byPlayer: true })
      }
      return
    }

    const selectedDrinkId = gameLoop.selectedDrink
    if (!selectedDrinkId) return
    if (customer.status !== 'WAITING') return

    // Always clear selection after a serve attempt
    gameLoop.selectDrink(null)
    barScene.setSelectedDrink(null)

    const drink = DRINKS_BY_ID[selectedDrinkId]
    const isCorrect = customer.drinkOrder === selectedDrinkId

    if (isCorrect) {
      this._doServe(customer, drink!)
    } else {
      gameLoop.recordWrongDrink()
      customerSystem.wrongDrink(customerId)

      eventDispatcher.emit('WRONG_DRINK', { customerId, drinkId: selectedDrinkId })
    }
  }

  // MBW-NEW: Shared serve logic — used by click handler and serveAll()
  private _doServe(customer: CustomerEntity, drink: DrinkConfig): void {
    const isFastServe = customer.patienceTimer / customer.patienceMax > 0.5
    let coins = Math.round(
      drink.coinReward *
        customer.coinMultiplier *
        gameLoop.dayCoinMultiplier *
        entertainerSystem.getCoinBoostMult(),
    ) + (isFastServe ? gameLoop.tipJarBonus : 0)
    if (gameLoop.doubleMoney) coins *= 2
    gameLoop.addCoins(coins)
    gameLoop.recordCustomerServed()
    customerSystem.serveCustomer(customer.id)
    eventDispatcher.emit('DRINK_SERVED', {
      customerId: customer.id,
      drinkId: drink.id,
      wasCorrect: true,
      coinsEarned: coins,
    })
  }

  // MBW-NEW: Serve All powerup — instantly serves all WAITING customers their requested drink
  serveAll(): void {
    const waiting = customerSystem.customers.filter((c) => c.status === 'WAITING' && c.canBeServed)
    for (const customer of waiting) {
      const drink = DRINKS_BY_ID[customer.drinkOrder]
      if (!drink) continue
      this._doServe(customer, drink)
    }
  }

  init(): void {
    eventDispatcher.on('DRINK_CLICKED', this.handleDrinkClicked)
    eventDispatcher.on('CUSTOMER_CLICKED', this.handleCustomerClicked)
  }

  destroy(): void {
    eventDispatcher.off('DRINK_CLICKED', this.handleDrinkClicked)
    eventDispatcher.off('CUSTOMER_CLICKED', this.handleCustomerClicked)
  }
}

export const drinkServingSystem = new DrinkServingSystem()
