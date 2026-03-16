// MBW-17: CustomerEntity model
// MBW-72: HOOLIGAN type added for V2.0 Game Day mechanic
// MBW-91/95: RICH and DRUNK types added for V2.5
export type CustomerType = 'NORMAL' | 'HOOLIGAN' | 'RICH' | 'DRUNK'

export type CustomerSkin = 'priest' | 'farmer' | 'blacksmith' | 'merchant'

export type CustomerStatus =
  | 'APPROACHING'     // walking doorway → seat
  | 'WAITING'         // seated, patience ticking
  | 'SERVED_LINGERING'// served, sitting idle
  | 'REORDERING'      // linger expired, ordering again → WAITING
  | 'BRAWLING'        // MBW-78: hooligan patience expired — triggers brawl mechanic
  | 'LEAVING'         // walking seat → doorway, then removed

export interface CustomerEntity {
  id: string
  type: CustomerType
  skin: CustomerSkin
  status: CustomerStatus
  seatId: string
  position: { x: number; y: number }
  targetPosition: { x: number; y: number }
  waypoints: Array<{ x: number; y: number }>  // intermediate path points to avoid tables
  drinkOrder: string  // drinkId
  patienceTimer: number   // seconds remaining
  patienceMax: number     // for computing percentage
  lingerTimer: number     // seconds remaining while SERVED_LINGERING
  drinksServed: number    // how many times served this visit
  willReorder: boolean    // pre-rolled on serve — determines behaviour after linger
  canBrawl: boolean       // MBW-72: copied from CustomerTypeConfig at spawn
  canBeServed: boolean    // MBW-95: false for DRUNK — can't be given a drink
  coinMultiplier: number  // MBW-91: multiplier on drink coin reward (1.8× for RICH)
}

let _nextId = 0
export function nextCustomerId(): string {
  return `c-${++_nextId}`
}

export function resetCustomerIdCounter(): void {
  _nextId = 0
}
