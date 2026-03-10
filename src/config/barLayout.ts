// MBW-14: Seat layout data for the 13-seat bar
// All coordinates are in PixiJS canvas space (375×667 logical resolution)

export const CANVAS_WIDTH = 375
export const CANVAS_HEIGHT = 667

// Bar zones (y boundaries)
export const BAR_COUNTER_TOP = 60
export const BAR_COUNTER_BOTTOM = 148
export const FLOOR_TOP = BAR_COUNTER_BOTTOM
export const FLOOR_BOTTOM = 630

// Fixed tap positions along bar counter (supports up to 6 drinks)
export const TAP_Y = 100
export const TAP_POSITIONS_X = [43, 102, 161, 220, 279, 332] as const

// Doorway at centre-bottom of floor
export const DOORWAY = { x: CANVAS_WIDTH / 2, y: FLOOR_BOTTOM } as const

export type SeatType = 'bar_stool' | 'table_chair'

export interface SeatConfig {
  id: string
  type: SeatType
  position: { x: number; y: number }
  tableId: string | null // null for bar stools
}

export interface TableConfig {
  id: string
  position: { x: number; y: number }
  width: number
  height: number
}

// 4 tables
export const TABLES: TableConfig[] = [
  { id: 'table-1', position: { x: 95, y: 300 }, width: 50, height: 30 },
  { id: 'table-2', position: { x: 280, y: 300 }, width: 50, height: 30 },
  { id: 'table-3', position: { x: 95, y: 475 }, width: 50, height: 30 },
  { id: 'table-4', position: { x: 280, y: 475 }, width: 50, height: 30 },
]

// 5 bar stools + 4 tables × 2 chairs = 13 seats
export const SEATS: SeatConfig[] = [
  // Bar stools (5) — along the bar counter
  { id: 'stool-1', type: 'bar_stool', position: { x: 47, y: 165 }, tableId: null },
  { id: 'stool-2', type: 'bar_stool', position: { x: 110, y: 165 }, tableId: null },
  { id: 'stool-3', type: 'bar_stool', position: { x: 187, y: 165 }, tableId: null },
  { id: 'stool-4', type: 'bar_stool', position: { x: 264, y: 165 }, tableId: null },
  { id: 'stool-5', type: 'bar_stool', position: { x: 328, y: 165 }, tableId: null },

  // Table 1 chairs (upper-left)
  { id: 'table-1-chair-a', type: 'table_chair', position: { x: 95, y: 273 }, tableId: 'table-1' },
  { id: 'table-1-chair-b', type: 'table_chair', position: { x: 95, y: 327 }, tableId: 'table-1' },

  // Table 2 chairs (upper-right)
  { id: 'table-2-chair-a', type: 'table_chair', position: { x: 280, y: 273 }, tableId: 'table-2' },
  { id: 'table-2-chair-b', type: 'table_chair', position: { x: 280, y: 327 }, tableId: 'table-2' },

  // Table 3 chairs (lower-left)
  { id: 'table-3-chair-a', type: 'table_chair', position: { x: 95, y: 448 }, tableId: 'table-3' },
  { id: 'table-3-chair-b', type: 'table_chair', position: { x: 95, y: 502 }, tableId: 'table-3' },

  // Table 4 chairs (lower-right)
  { id: 'table-4-chair-a', type: 'table_chair', position: { x: 280, y: 448 }, tableId: 'table-4' },
  { id: 'table-4-chair-b', type: 'table_chair', position: { x: 280, y: 502 }, tableId: 'table-4' },
]

export const SEATS_BY_ID = Object.fromEntries(SEATS.map((s) => [s.id, s]))
