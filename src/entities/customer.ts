// MBW-17: CustomerEntity model
export type CustomerType = 'NORMAL' // V2.0+ adds HOOLIGAN, RICH, DRUNK

export type CustomerSkin = 'priest' | 'farmer' | 'blacksmith' | 'merchant'

export type CustomerStatus =
  | 'APPROACHING' // walking doorway → seat
  | 'WAITING' // seated, patience ticking
  | 'SERVED_LINGERING' // served, sitting idle
  | 'REORDERING' // linger expired, ordering again → WAITING
  | 'LEAVING' // walking seat → doorway, then removed

export interface CustomerEntity {
  id: string
  type: CustomerType
  skin: CustomerSkin
  status: CustomerStatus
  seatId: string
  position: { x: number; y: number }
  targetPosition: { x: number; y: number }
  drinkOrder: string // drinkId
  patienceTimer: number // seconds remaining
  patienceMax: number // for computing percentage
  lingerTimer: number // seconds remaining while SERVED_LINGERING
  drinksServed: number // how many times served this visit
  willReorder: boolean // pre-rolled on serve — determines behaviour after linger
}

let _nextId = 0
export function nextCustomerId(): string {
  return `c-${++_nextId}`
}

export function resetCustomerIdCounter(): void {
  _nextId = 0
}
