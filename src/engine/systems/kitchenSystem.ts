// Food & Kitchen system
// Manages order queue, oven cooking lifecycle, plating, delivery interactions,
// and Patience Window 2 expiry.
import type { OvenState, PlateState, FoodOrder } from '../../types/food'
import { nextFoodOrderId, resetFoodOrderIdCounter } from '../../types/food'
import { FOOD_BY_ID } from '../../config/food'
import { eventDispatcher } from '../events/eventDispatcher'
import { customerSystem } from './customerSystem'
import { kitchenRenderer } from '../renderer/kitchenRenderer'
import { gameLoop } from '../gameLoop'
import { useGameStore } from '../../store/gameStore'
import { useHudStore } from '../../store/hudStore'
import type { KitchenSelectionType } from '../../store/hudStore'
import { entertainerSystem } from './entertainerSystem'
import { FINANCES_CONFIG } from '../../config/finances'

// Maximum visible (actionable) orders in the queue panel
const QUEUE_VISIBLE_LIMIT = 3

class KitchenSystem {
  orderQueue: FoodOrder[] = []
  ovens: OvenState[] = []
  plates: PlateState[] = []

  private selection: KitchenSelectionType | null = null

  init(ovensOwned: number): void {
    this.orderQueue = []
    this.ovens = this.buildOvens(ovensOwned)
    this.plates = [
      { id: 'plate_1', status: 'empty', foodOrder: null },
      { id: 'plate_2', status: 'empty', foodOrder: null },
      { id: 'plate_3', status: 'empty', foodOrder: null },
    ]
    this.selection = null
    resetFoodOrderIdCounter()

    eventDispatcher.on('QUEUE_ORDER_CLICKED', this.handleQueueOrderClicked)
    eventDispatcher.on('OVEN_CLICKED', this.handleOvenClicked)
    eventDispatcher.on('PLATE_SLOT_CLICKED', this.handlePlateSlotClicked)
    eventDispatcher.on('CUSTOMER_CLICKED', this.handleCustomerClicked)
    eventDispatcher.on('CUSTOMER_LEFT', this.handleCustomerLeft)
  }

  destroy(): void {
    eventDispatcher.off('QUEUE_ORDER_CLICKED', this.handleQueueOrderClicked)
    eventDispatcher.off('OVEN_CLICKED', this.handleOvenClicked)
    eventDispatcher.off('PLATE_SLOT_CLICKED', this.handlePlateSlotClicked)
    eventDispatcher.off('CUSTOMER_CLICKED', this.handleCustomerClicked)
    eventDispatcher.off('CUSTOMER_LEFT', this.handleCustomerLeft)
    this.orderQueue = []
    this.ovens = []
    this.plates = []
    this.selection = null
  }

  private buildOvens(owned: number): OvenState[] {
    return [
      { id: 'oven_1', unlocked: true,       status: 'empty', foodOrder: null, cookTimer: 0, qualityTimer: 0 },
      { id: 'oven_2', unlocked: owned >= 2,  status: 'empty', foodOrder: null, cookTimer: 0, qualityTimer: 0 },
      { id: 'oven_3', unlocked: owned >= 3,  status: 'empty', foodOrder: null, cookTimer: 0, qualityTimer: 0 },
    ]
  }

  // Called when shop purchases Second/Third Oven upgrade
  unlockOven(totalOvens: number): void {
    for (let i = 1; i < Math.min(totalOvens, 3); i++) {
      if (this.ovens[i] && !this.ovens[i]!.unlocked) {
        this.ovens[i]!.unlocked = true
        kitchenRenderer.unlockOven(i)
      }
    }
  }

  // ─── Main tick ───────────────────────────────────────────────────────────────

  tick(dt: number): void {
    this.tickOvens(dt)
    this.tickQueuePatience(dt)
    this.pushHudState()
    kitchenRenderer.syncOvens(this.ovens, this.getSelectedOvenId(), performance.now())
    kitchenRenderer.syncPlates(this.plates, this.getSelectedPlateId())
  }

  private tickOvens(dt: number): void {
    for (const oven of this.ovens) {
      if (!oven.unlocked || oven.status === 'empty') continue

      if (oven.status === 'cooking') {
        oven.cookTimer -= dt
        if (oven.cookTimer <= 0) {
          const food = FOOD_BY_ID[oven.foodOrder?.foodId ?? '']
          oven.status = 'ready'
          oven.qualityTimer = food?.readyDuration ?? 5
          eventDispatcher.emit('FOOD_READY', { orderId: oven.foodOrder!.id, ovenId: oven.id })
          // Notify customer their food is getting close to being ready
          if (oven.foodOrder) {
            customerSystem.setFoodWaitingIndicator(oven.foodOrder.customerId, 'greyed')
          }
        }
      } else if (oven.status === 'ready') {
        oven.qualityTimer -= dt
        if (oven.qualityTimer <= 0) {
          const food = FOOD_BY_ID[oven.foodOrder?.foodId ?? '']
          oven.status = 'overdone'
          oven.qualityTimer = food?.overdoneDuration ?? 5
          eventDispatcher.emit('FOOD_OVERDONE', { orderId: oven.foodOrder!.id, ovenId: oven.id })
        }
      } else if (oven.status === 'overdone') {
        oven.qualityTimer -= dt
        if (oven.qualityTimer <= 0) {
          eventDispatcher.emit('FOOD_BURNT', { orderId: oven.foodOrder!.id, ovenId: oven.id })
          eventDispatcher.emit('FOOD_WASTED', { orderId: oven.foodOrder!.id, reason: 'burnt' })
          // Food is burnt — oven blocked until player discards
          oven.status = 'burnt'
          oven.qualityTimer = 0
        }
      }
      // 'burnt' stays until player taps to discard (handled in handleOvenClicked)
    }
  }

  private tickQueuePatience(dt: number): void {
    // Tick Window 2 for all orders in queue
    const expiredInQueue: FoodOrder[] = []
    for (const order of this.orderQueue) {
      order.patienceRemaining -= dt
      if (order.patienceRemaining <= 0) {
        expiredInQueue.push(order)
      }
    }

    // Tick Window 2 for orders on ovens
    for (const oven of this.ovens) {
      if (!oven.foodOrder) continue
      oven.foodOrder.patienceRemaining -= dt
      if (oven.foodOrder.patienceRemaining <= 0) {
        expiredInQueue.push(oven.foodOrder)
        oven.foodOrder = null
        oven.status = 'empty'
        oven.cookTimer = 0
        oven.qualityTimer = 0
      }
    }

    // Tick Window 2 for orders on plates
    for (const plate of this.plates) {
      if (!plate.foodOrder) continue
      plate.foodOrder.patienceRemaining -= dt
      if (plate.foodOrder.patienceRemaining <= 0) {
        expiredInQueue.push(plate.foodOrder)
        plate.foodOrder = null
        plate.status = 'empty'
      }
    }

    // Process all expired orders
    for (const order of expiredInQueue) {
      this.removeFromQueue(order.id)
      eventDispatcher.emit('FOOD_WASTED', { orderId: order.id, reason: 'patience_expired' })
      customerSystem.foodOrderExpired(order.customerId)
      // Clear selection if it pointed at this order
      if (this.selection?.type === 'queue_order' && this.selection.orderId === order.id) {
        this.setSelection(null)
      }
    }
  }

  // ─── Order queue management ───────────────────────────────────────────────────

  // Called by customerSystem when a food order is taken (player taps the customer's food emoji)
  addOrder(customerId: string, foodId: string): void {
    const { gameSave } = useGameStore.getState()
    const ingredients = gameSave.finances.supplies['ingredients']
    if (!ingredients || ingredients.remaining <= 0) {
      // No ingredients — show "Out of ingredients" via HUD, don't queue
      return
    }

    const food = FOOD_BY_ID[foodId]
    if (!food) return

    const orderId = nextFoodOrderId()
    const order: FoodOrder = {
      id: orderId,
      foodId,
      customerId,
      patienceRemaining: food.patienceWindow2,
      patienceMax: food.patienceWindow2,
      queuedAt: performance.now(),
      overdone: false,
    }

    // Consume one ingredient portion
    const remaining = useGameStore.getState().consumeIngredient()
    if (remaining === 0) {
      eventDispatcher.emit('INGREDIENT_DEPLETED', {})
    } else {
      const maxIngredients = FINANCES_CONFIG.DEFAULT_SUPPLY_CAPACITY
      useHudStore.setState({ ingredientsRemaining: remaining })
      void maxIngredients  // suppress lint
    }
    useHudStore.setState({ ingredientsRemaining: remaining })

    this.orderQueue.push(order)

    // Update customer to show greyed waiting indicator
    customerSystem.setFoodOrderInQueue(customerId, orderId)

    eventDispatcher.emit('FOOD_ORDER_TAKEN', { customerId, foodId, orderId })
  }

  private removeFromQueue(orderId: string): void {
    this.orderQueue = this.orderQueue.filter((o) => o.id !== orderId)
  }

  // ─── Player interaction handlers ──────────────────────────────────────────────

  private handleQueueOrderClicked = ({ orderId }: { orderId: string }): void => {
    const order = this.orderQueue.find((o) => o.id === orderId)
    if (!order) return

    // Can only tap orders in the top QUEUE_VISIBLE_LIMIT
    const idx = this.orderQueue.indexOf(order)
    if (idx >= QUEUE_VISIBLE_LIMIT) return

    if (this.selection?.type === 'queue_order' && this.selection.orderId === orderId) {
      this.setSelection(null)  // deselect
    } else {
      this.setSelection({ type: 'queue_order', orderId })
    }
  }

  private handleOvenClicked = ({ ovenId }: { ovenId: string }): void => {
    const oven = this.ovens.find((o) => o.id === ovenId)
    if (!oven || !oven.unlocked) return

    if (oven.status === 'burnt') {
      // Discard burnt food
      eventDispatcher.emit('FOOD_WASTED', { orderId: oven.foodOrder!.id, reason: 'burnt' })
      oven.foodOrder = null
      oven.status = 'empty'
      oven.cookTimer = 0
      oven.qualityTimer = 0
      if (this.selection?.type === 'oven_food' && this.selection.ovenId === ovenId) {
        this.setSelection(null)
      }
      return
    }

    // Queue order selected → move to this oven
    if (this.selection?.type === 'queue_order') {
      if (oven.status !== 'empty') return  // oven busy
      const orderId = this.selection.orderId
      const order = this.orderQueue.find((o) => o.id === orderId)
      if (!order) { this.setSelection(null); return }

      const food = FOOD_BY_ID[order.foodId]
      if (!food) return

      this.removeFromQueue(orderId)
      oven.status = 'cooking'
      oven.foodOrder = order
      oven.cookTimer = food.cookTime
      oven.qualityTimer = 0
      customerSystem.setFoodOrderStage(order.customerId, 'COOKING')
      eventDispatcher.emit('FOOD_COOKING_STARTED', { orderId, ovenId })
      this.setSelection(null)
      return
    }

    // Click ready/overdone oven food to select it for plating
    if (oven.status === 'ready' || oven.status === 'overdone') {
      if (this.selection?.type === 'oven_food' && this.selection.ovenId === ovenId) {
        this.setSelection(null)  // deselect
      } else {
        this.setSelection({ type: 'oven_food', ovenId })
      }
    }
  }

  private handlePlateSlotClicked = ({ plateId }: { plateId: string }): void => {
    const plate = this.plates.find((p) => p.id === plateId)
    if (!plate) return

    // Oven food selected → move to plate
    if (this.selection?.type === 'oven_food') {
      if (plate.status !== 'empty') return  // plate occupied
      const ovenId = this.selection.ovenId
      const oven = this.ovens.find((o) => o.id === ovenId)
      if (!oven || (oven.status !== 'ready' && oven.status !== 'overdone')) {
        this.setSelection(null)
        return
      }

      const isOverdone = oven.status === 'overdone'
      const order = { ...oven.foodOrder!, overdone: isOverdone }

      plate.status = 'plated'
      plate.foodOrder = order

      oven.foodOrder = null
      oven.status = 'empty'
      oven.cookTimer = 0
      oven.qualityTimer = 0

      // Update customer indicator to full-colour pulse
      customerSystem.setFoodWaitingIndicator(order.customerId, 'ready_pulse')
      customerSystem.setFoodOrderStage(order.customerId, 'PLATED')

      eventDispatcher.emit('FOOD_PLATED', { orderId: order.id, plateId })
      this.setSelection(null)
      return
    }

    // No oven selected — if plate has food, select it for delivery
    if (plate.status === 'plated') {
      if (this.selection?.type === 'plate' && this.selection.plateId === plateId) {
        this.setSelection(null)  // deselect
      } else {
        this.setSelection({ type: 'plate', plateId })
      }
    }
  }

  private handleCustomerClicked = ({ customerId }: { customerId: string }): void => {
    const customer = customerSystem.getCustomer(customerId)
    if (!customer) return

    // Plate selected → deliver to this customer
    if (this.selection?.type === 'plate') {
      const plateId = this.selection.plateId
      const plate = this.plates.find((p) => p.id === plateId)
      if (!plate || plate.status !== 'plated' || !plate.foodOrder) {
        this.setSelection(null)
        return
      }

      if (plate.foodOrder.customerId !== customerId) {
        // Wrong customer — food goes back (no penalty, just deselect)
        this.setSelection(null)
        return
      }

      this.deliverFood(plate, customerId)
      return
    }

    // Customer has a food order in ORDERING stage → take the order
    if (customer.currentOrderType === 'food' && customer.foodOrderStage === 'ORDERING') {
      const foodId = customer.foodOrderFoodId
      if (foodId) {
        customerSystem.acknowledgeFoodOrder(customerId)
        this.addOrder(customerId, foodId)
      }
    }
  }

  private handleCustomerLeft = ({ customerId }: { customerId: string }): void => {
    // Clean up any orders for this customer
    const orderId = this.findOrderForCustomer(customerId)
    if (!orderId) return

    // Remove from queue
    this.removeFromQueue(orderId)

    // Remove from ovens
    for (const oven of this.ovens) {
      if (oven.foodOrder?.customerId === customerId) {
        eventDispatcher.emit('FOOD_WASTED', { orderId: oven.foodOrder.id, reason: 'customer_left' })
        oven.foodOrder = null
        oven.status = 'empty'
        oven.cookTimer = 0
        oven.qualityTimer = 0
      }
    }

    // Remove from plates
    for (const plate of this.plates) {
      if (plate.foodOrder?.customerId === customerId) {
        eventDispatcher.emit('FOOD_WASTED', { orderId: plate.foodOrder.id, reason: 'customer_left' })
        plate.foodOrder = null
        plate.status = 'empty'
      }
    }

    // Clear selection if it was for this customer's order
    if (this.selection) {
      const selOrderId = this.getSelectedOrderId()
      if (selOrderId === orderId) this.setSelection(null)
    }
  }

  // ─── Food delivery ────────────────────────────────────────────────────────────

  private deliverFood(plate: PlateState, customerId: string): void {
    const order = plate.foodOrder!
    const food = FOOD_BY_ID[order.foodId]
    if (!food) return

    const quality = order.overdone ? 'overdone' : 'ready'
    const basePrice = Math.round(food.sellPrice * (order.overdone ? food.overdoneMultiplier : 1.0))
    const coins = Math.round(basePrice * gameLoop.dayCoinMultiplier * entertainerSystem.getCoinBoostMult())

    gameLoop.addCoins(coins)
    gameLoop.recordCustomerServed()
    useGameStore.getState().addWeeklyRevenue(coins)

    plate.foodOrder = null
    plate.status = 'empty'

    customerSystem.startEating(customerId, food.eatDuration)

    eventDispatcher.emit('FOOD_DELIVERED', { orderId: order.id, customerId, quality, coinsEarned: coins })
    eventDispatcher.emit('CUSTOMER_EATING', { customerId, foodId: order.foodId })

    this.setSelection(null)
  }

  // ─── Chef automation ──────────────────────────────────────────────────────────

  // Called by chefSystem — move the best queued order to the first available oven
  chefMoveQueueToOven(prioritiseUrgent: boolean): boolean {
    if (this.orderQueue.length === 0) return false
    const emptyOven = this.ovens.find((o) => o.unlocked && o.status === 'empty')
    if (!emptyOven) return false

    let order: FoodOrder
    if (prioritiseUrgent) {
      const sorted = [...this.orderQueue].sort((a, b) => a.patienceRemaining - b.patienceRemaining)
      order = sorted[0]!
    } else {
      order = this.orderQueue[0]!
    }

    const food = FOOD_BY_ID[order.foodId]
    if (!food) return false

    this.removeFromQueue(order.id)
    emptyOven.status = 'cooking'
    emptyOven.foodOrder = order
    emptyOven.cookTimer = food.cookTime
    emptyOven.qualityTimer = 0
    customerSystem.setFoodOrderStage(order.customerId, 'COOKING')
    eventDispatcher.emit('FOOD_COOKING_STARTED', { orderId: order.id, ovenId: emptyOven.id })
    return true
  }

  // Called by chefSystem L3 — move cooked food from oven to empty plate
  chefMoveOvenToPlate(): boolean {
    const readyOven = this.ovens.find((o) => o.unlocked && (o.status === 'ready' || o.status === 'overdone') && o.foodOrder)
    if (!readyOven) return false

    const emptyPlate = this.plates.find((p) => p.status === 'empty')
    if (!emptyPlate) return false

    const isOverdone = readyOven.status === 'overdone'
    const order = { ...readyOven.foodOrder!, overdone: isOverdone }

    emptyPlate.status = 'plated'
    emptyPlate.foodOrder = order
    readyOven.foodOrder = null
    readyOven.status = 'empty'
    readyOven.cookTimer = 0
    readyOven.qualityTimer = 0

    customerSystem.setFoodWaitingIndicator(order.customerId, 'ready_pulse')
    customerSystem.setFoodOrderStage(order.customerId, 'PLATED')
    eventDispatcher.emit('FOOD_PLATED', { orderId: order.id, plateId: emptyPlate.id })
    return true
  }

  // ─── Waiter automation ────────────────────────────────────────────────────────

  // Called by waiterSystem — find a plated order ready for delivery
  getPlatedOrder(): { plate: PlateState; customerId: string } | null {
    const plate = this.plates.find((p) => p.status === 'plated' && p.foodOrder)
    if (!plate || !plate.foodOrder) return null
    return { plate, customerId: plate.foodOrder.customerId }
  }

  // Called by waiterSystem — deliver the food from a plate to a customer
  waiterDeliver(plate: PlateState, customerId: string): void {
    const customer = customerSystem.getCustomer(customerId)
    if (!customer || !plate.foodOrder) return
    this.deliverFood(plate, customerId)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private findOrderForCustomer(customerId: string): string | null {
    const inQueue = this.orderQueue.find((o) => o.customerId === customerId)
    if (inQueue) return inQueue.id
    const inOven = this.ovens.find((o) => o.foodOrder?.customerId === customerId)
    if (inOven?.foodOrder) return inOven.foodOrder.id
    const inPlate = this.plates.find((p) => p.foodOrder?.customerId === customerId)
    if (inPlate?.foodOrder) return inPlate.foodOrder.id
    return null
  }

  private setSelection(sel: KitchenSelectionType | null): void {
    this.selection = sel
    useHudStore.setState({ kitchenSelection: sel })
  }

  private getSelectedOvenId(): string | null {
    return this.selection?.type === 'oven_food' ? this.selection.ovenId : null
  }

  private getSelectedPlateId(): string | null {
    return this.selection?.type === 'plate' ? this.selection.plateId : null
  }

  private getSelectedOrderId(): string | null {
    if (this.selection?.type === 'queue_order') return this.selection.orderId
    if (this.selection?.type === 'oven_food') {
      const oven = this.ovens.find((o) => o.id === this.selection!.ovenId)
      return oven?.foodOrder?.id ?? null
    }
    if (this.selection?.type === 'plate') {
      const plate = this.plates.find((p) => p.id === this.selection!.plateId)
      return plate?.foodOrder?.id ?? null
    }
    return null
  }

  private pushHudState(): void {
    const visible = this.orderQueue.slice(0, QUEUE_VISIBLE_LIMIT)
    const overflow = Math.max(0, this.orderQueue.length - QUEUE_VISIBLE_LIMIT)
    useHudStore.setState({
      kitchenQueue: visible.map((o) => ({
        orderId: o.id,
        foodId: o.foodId,
        patienceRemaining: o.patienceRemaining,
        patienceMax: o.patienceMax,
      })),
      kitchenQueueOverflow: overflow,
      ingredientsRemaining: useGameStore.getState().gameSave.finances.supplies['ingredients']?.remaining ?? 0,
    })
  }

  get currentSelection(): KitchenSelectionType | null {
    return this.selection
  }

  get hasQueueItems(): boolean {
    return this.orderQueue.length > 0
  }
}

export const kitchenSystem = new KitchenSystem()
