// MBW-113/116/120/122: Entertainer entity model
export type EntertainerId = 'jinx' | 'roland' | 'melody' | 'jukebox'

export type EntertainerStatus =
  | 'ARRIVING'       // walking from doorway to stage
  | 'PERFORMING'     // on stage, boosts active
  | 'WAITING_TIP'    // Last Orders — walking to bar, then awaiting tip choice
  | 'LEAVING'        // walking back to doorway

// MBW-120: 0=Generous, 1=Adequate, 2=Poor, 3=Refuse
export type TipChoice = 0 | 1 | 2 | 3

export interface EntertainerEntity {
  id: EntertainerId
  status: EntertainerStatus
  position: { x: number; y: number }
  targetPosition: { x: number; y: number }
  level: number         // MBW-122: current hidden level (read from save at spawn time)
  tipPaid: boolean
  tipAmount: number
  tipChoice: TipChoice | null  // MBW-120: which option the player chose (null until resolved)
  atBar: boolean               // MBW-120: true once the entertainer has reached BAR_TIP_POSITION
}
