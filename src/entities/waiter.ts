// Waiter NPC entity — food delivery from service counter to tables
// One worker per concurrency slot (1/2/3 based on tier)
export type WaiterStatus = 'IDLE' | 'GOING_TO_SERVICE_COUNTER' | 'GOING_TO_CUSTOMER' | 'RETURNING'

export interface WaiterWorker {
  id: number
  status: WaiterStatus
  position: { x: number; y: number }
  targetPosition: { x: number; y: number }
  assignedCustomerId: string | null
  assignedPlateId: string | null    // which plate slot they picked up from
}
