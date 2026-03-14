// MBW-9: Typed event dispatcher
// Systems subscribe to events without modifying core. New events added per version.
import type { DayPhase } from '../../types/day'

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
  BRAWL_RESOLVED: { brawlId: string; byPlayer: boolean }

  // MBW-97: Drunk escort
  DRUNK_ESCORTED: { customerId: string; byPlayer: boolean }

  // MBW-99/100: Mess events
  MESS_SPAWNED: { messId: string; position: { x: number; y: number } }
  MESS_CLEANED: { messId: string }

  // MBW-116/121: Entertainer events
  ENTERTAINER_ARRIVED: { entertainerId: string }
  ENTERTAINER_TIPPED: { entertainerId: string; amount: number }
  ENTERTAINER_LEFT: { entertainerId: string }
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
