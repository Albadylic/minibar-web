// MBW-26: Drink selection (click tap to select/deselect)
// MBW-27: Serve action (click customer with drink selected)
// MBW-28: Coin reward on correct serve
import { eventDispatcher } from '../events/eventDispatcher'
import { gameLoop } from '../gameLoop'
import { customerSystem } from './customerSystem'
import { barScene } from '../renderer/barScene'
import { DRINKS_BY_ID } from '../../config/drinks'
import { STAR_RATING } from '../../config/difficulty'

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
    const selectedDrinkId = gameLoop.selectedDrink
    if (!selectedDrinkId) return

    const customer = customerSystem.getCustomer(customerId)
    if (!customer || customer.status !== 'WAITING') return

    // Always clear selection after a serve attempt
    gameLoop.selectDrink(null)
    barScene.setSelectedDrink(null)

    const drink = DRINKS_BY_ID[selectedDrinkId]
    const isCorrect = customer.drinkOrder === selectedDrinkId

    if (isCorrect) {
      // MBW-28: Award coins (+ tip jar bonus on fast serves — MBW-41)
      const isFastServe = customer.patienceTimer / customer.patienceMax > 0.5
      const coins = (drink?.coinReward ?? 0) + (isFastServe ? gameLoop.tipJarBonus : 0)
      gameLoop.addCoins(coins)

      // Star rating gain — skill bonus if patience still > 50%
      const starDelta =
        STAR_RATING.gainPerCorrectServe + (isFastServe ? STAR_RATING.skillBonusGain : 0)
      gameLoop.adjustStarRating(starDelta)
      gameLoop.recordCustomerServed()

      customerSystem.serveCustomer(customerId)

      eventDispatcher.emit('DRINK_SERVED', {
        customerId,
        drinkId: selectedDrinkId,
        wasCorrect: true,
        coinsEarned: coins,
      })
    } else {
      // Wrong drink — star loss, customer leaves
      const isGameOver = gameLoop.adjustStarRating(-STAR_RATING.lossPerWrongDrink)
      gameLoop.recordWrongDrink()
      customerSystem.wrongDrink(customerId)

      eventDispatcher.emit('WRONG_DRINK', { customerId, drinkId: selectedDrinkId })

      if (isGameOver) {
        gameLoop.triggerGameOver()
      }
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
