// Food & Kitchen data types used across systems and renderers

export type OvenStatus = 'empty' | 'cooking' | 'ready' | 'overdone' | 'burnt'

// Tracks a single food order from placement through delivery
export interface FoodOrder {
  id: string
  foodId: string        // 'bread' | 'stew' | 'roast'
  customerId: string
  // Patience Window 2 — counts down from first tick after order is queued.
  // Expiry means the customer leaves angry and the food is wasted.
  patienceRemaining: number
  patienceMax: number
  queuedAt: number      // performance.now() timestamp for ordering
  overdone: boolean     // set when moved to plate in Overdone state
}

export interface OvenState {
  id: string            // 'oven_1' | 'oven_2' | 'oven_3'
  unlocked: boolean     // false for slots 2 and 3 until purchased
  status: OvenStatus
  foodOrder: FoodOrder | null
  cookTimer: number     // counts down during 'cooking' state
  qualityTimer: number  // counts down during 'ready' and 'overdone' states
}

export interface PlateState {
  id: string            // 'plate_1' | 'plate_2' | 'plate_3'
  status: 'empty' | 'plated'
  foodOrder: FoodOrder | null
}

let _nextId = 0
export function nextFoodOrderId(): string {
  return `fo-${++_nextId}`
}
export function resetFoodOrderIdCounter(): void {
  _nextId = 0
}
