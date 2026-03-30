// MBW-9: Typed event dispatcher
// Systems subscribe to events without modifying core. New events added per version.
import type { DayPhase } from '../../types/day'
import type { AchievementReward } from '../../types/achievements'

// All game events and their payload types
export type GameEventMap = {
  // Day lifecycle
  PHASE_CHANGED: { phase: DayPhase }
  LAST_ORDERS: Record<string, never>
  DAY_ENDED: { coinsEarned: number; customersServed: number }

  // Customer events
  CUSTOMER_ARRIVED: { customerId: string; seatId: string }
  PATIENCE_EXPIRED: { customerId: string }
  CUSTOMER_LEFT: { customerId: string }

  // Input events
  DRINK_CLICKED: { drinkId: string }
  CUSTOMER_CLICKED: { customerId: string }

  // Serving events
  DRINK_SERVED: { customerId: string; drinkId: string; wasCorrect: boolean; coinsEarned: number }
  WRONG_DRINK: { customerId: string; drinkId: string }

  // MBW-77/78/80: Brawl events
  BRAWL_STARTED: { brawlId: string; instigatorId: string; affectedCount: number }
  BRAWLER_TAPPED: { brawlId: string; tapsReceived: number; tapsRequired: number }
  // MBW-NEW: disruptedCount added so ReviewSystem can generate the right number of reviews
  BRAWL_RESOLVED: { brawlId: string; byPlayer: boolean; disruptedCount: number }

  // MBW-97: Drunk escort
  DRUNK_ESCORTED: { customerId: string; byPlayer: boolean }

  // MBW-99/100: Mess events
  MESS_SPAWNED: { messId: string; position: { x: number; y: number } }
  MESS_CLEANED: { messId: string; byPlayer: boolean }

  // MBW-116/121: Entertainer events
  ENTERTAINER_ARRIVED: { entertainerId: string }
  ENTERTAINER_TIPPED: { entertainerId: string; amount: number; wasGenerous: boolean }
  ENTERTAINER_LEFT: { entertainerId: string }

  // MBW-109: Noble's Visit — king's tray mechanic
  KINGS_TRAY_SLOT_FILLED: { slotIndex: number; drinkId: string }
  KINGS_TRAY_RESOLVED: { complete: boolean; coinsEarned: number }

  // MBW-NEW: Achievements & Powerups
  ACHIEVEMENT_COMPLETED: { id: string; tier: 'bronze' | 'silver' | 'gold'; reward: AchievementReward }
  POWERUP_ACTIVATED: { type: string }

  // MBW-NEW: Bar Finances events
  SUPPLY_DEPLETED: { drinkId: string }
  UPGRADE_DAMAGED: { upgradeId: string; newTier: number; wasInsured: boolean }
  BURGLARY_OCCURRED: { upgradeId: string; covered: boolean }

  // Food & Kitchen events
  FOOD_ORDER_PLACED: { customerId: string; foodId: string }
  FOOD_ORDER_TAKEN: { customerId: string; foodId: string; orderId: string }
  FOOD_COOKING_STARTED: { orderId: string; ovenId: string }
  FOOD_READY: { orderId: string; ovenId: string }
  FOOD_OVERDONE: { orderId: string; ovenId: string }
  FOOD_BURNT: { orderId: string; ovenId: string }
  FOOD_PLATED: { orderId: string; plateId: string }
  FOOD_DELIVERED: { orderId: string; customerId: string; quality: 'ready' | 'overdone'; coinsEarned: number }
  FOOD_WASTED: { orderId: string; reason: 'burnt' | 'patience_expired' | 'customer_left' }
  CUSTOMER_EATING: { customerId: string; foodId: string }
  PLATE_EMPTY: { customerId: string }
  INGREDIENT_DEPLETED: Record<string, never>
  // Kitchen interaction inputs (emitted by React queue panel and PixiJS oven/plate clicks)
  QUEUE_ORDER_CLICKED: { orderId: string }
  OVEN_CLICKED: { ovenId: string }
  PLATE_SLOT_CLICKED: { plateId: string }
}

type EventHandler<T> = (payload: T) => void

class TypedEventDispatcher {
  private listeners = new Map<string, Set<EventHandler<unknown>>>()

  on<K extends keyof GameEventMap>(event: K, handler: EventHandler<GameEventMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as EventHandler<unknown>)
  }

  off<K extends keyof GameEventMap>(event: K, handler: EventHandler<GameEventMap[K]>): void {
    this.listeners.get(event)?.delete(handler as EventHandler<unknown>)
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    this.listeners.get(event)?.forEach((h) => h(payload))
  }

  // Remove all listeners — call between days to avoid leaks
  clear(): void {
    this.listeners.clear()
  }
}

export const eventDispatcher = new TypedEventDispatcher()
