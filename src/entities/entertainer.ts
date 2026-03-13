// MBW-116: Entertainer entity model
export type EntertainerId = 'jinx' | 'roland' | 'melody' | 'jukebox'

export type EntertainerStatus =
  | 'ARRIVING'       // walking from doorway to stage
  | 'PERFORMING'     // on stage, boosts active
  | 'WAITING_TIP'    // Last Orders — player can tap to tip
  | 'LEAVING'        // walking back to doorway

export interface EntertainerEntity {
  id: EntertainerId
  status: EntertainerStatus
  position: { x: number; y: number }
  targetPosition: { x: number; y: number }
  tipPaid: boolean
  tipAmount: number
}
