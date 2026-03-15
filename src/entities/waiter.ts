// MBW-182: Waiter NPC entity — one worker per concurrency slot (1/2/3 based on tier)
export type WaiterStatus = 'IDLE' | 'GOING_TO_BAR' | 'GOING_TO_CUSTOMER' | 'RETURNING'

export interface WaiterWorker {
  id: number
  status: WaiterStatus
  position: { x: number; y: number }
  targetPosition: { x: number; y: number }
  assignedCustomerId: string | null
  drinkToServe: string | null
}
