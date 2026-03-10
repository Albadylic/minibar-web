// MBW-99: MessEntity — a spilt drink or empty glass on the bar floor
export interface MessEntity {
  id: string
  position: { x: number; y: number }
}

let _nextMessId = 0
export function nextMessId(): string {
  return `mess-${++_nextMessId}`
}

export function resetMessIdCounter(): void {
  _nextMessId = 0
}
