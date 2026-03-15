// MBW-99: MessEntity — a spilt drink or empty glass on the bar floor
export interface MessEntity {
  id: string
  position: { x: number; y: number }
  seatId: string | null  // MBW-167: seat blocked by this mess (null = floor mess with no seat association)
}

let _nextMessId = 0
export function nextMessId(): string {
  return `mess-${++_nextMessId}`
}

export function resetMessIdCounter(): void {
  _nextMessId = 0
}
