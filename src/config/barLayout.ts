// MBW-14: Seat layout data for the bar
// MBW-158: Enlarged tables (70×44)
// MBW-159: Centre table reserved for Extra Seating tier 2
// MBW-160: All 4 chair positions per table defined; upgradeRequired gates availability
// MBW-161: Stage area at bottom-left of floor
// All coordinates are in PixiJS canvas space (375×667 logical resolution)

export const CANVAS_WIDTH = 375
export const CANVAS_HEIGHT = 667

// Bar zones (y boundaries)
export const BAR_COUNTER_TOP = 60
export const BAR_COUNTER_BOTTOM = 148
export const FLOOR_TOP = BAR_COUNTER_BOTTOM
export const FLOOR_BOTTOM = 630

// Fixed tap positions along bar counter (supports up to 8 drinks)
export const TAP_Y = 100
export const TAP_POSITIONS_X = [25, 71, 118, 164, 210, 257, 303, 350] as const

// Doorway at centre-bottom of floor
export const DOORWAY = { x: CANVAS_WIDTH / 2, y: FLOOR_BOTTOM } as const

export type SeatType = 'bar_stool' | 'table_chair'

export interface SeatConfig {
  id: string
  type: SeatType
  position: { x: number; y: number }
  tableId: string | null           // null for bar stools
  upgradeRequired: number | null   // MBW-160: null=base, 1/2=Extra Seating tier required
}

export interface TableConfig {
  id: string
  position: { x: number; y: number }
  width: number
  height: number
  upgradeRequired: number | null   // MBW-159: null=always visible, 2=Extra Seating tier 2
}

// 4 base tables + 1 centre table (Extra Seating tier 2)
// MBW-158: Enlarged to 70×44 (was 50×30)
export const TABLES: TableConfig[] = [
  { id: 'table-1', position: { x: 95, y: 300 },  width: 70, height: 44, upgradeRequired: null },
  { id: 'table-2', position: { x: 280, y: 300 }, width: 70, height: 44, upgradeRequired: null },
  { id: 'table-3', position: { x: 95, y: 475 },  width: 70, height: 44, upgradeRequired: null },
  { id: 'table-4', position: { x: 280, y: 475 }, width: 70, height: 44, upgradeRequired: null },
  // MBW-159: Centre table — visible only when Extra Seating tier 2 is purchased
  { id: 'table-5', position: { x: 187, y: 387 }, width: 70, height: 44, upgradeRequired: 2 },
]

// Chair offset constants (from table centre)
// Base chairs (top/bottom): half table height (22) + 12px gap = 34
// Upgrade chairs (left/right): half table width (35) + 12px gap = 47
const TOP_BOT_OFFSET = 34
const LFT_RGT_OFFSET = 47

// 5 bar stools + 4×2 base chairs = 13 base seats
// + 4×2 tier-1 chairs = 8 additional (total 21)
// + 1×4 centre-table chairs = 4 additional (total 25)
export const SEATS: SeatConfig[] = [
  // Bar stools (5) — along the bar counter
  { id: 'stool-1', type: 'bar_stool', position: { x: 47,  y: 165 }, tableId: null, upgradeRequired: null },
  { id: 'stool-2', type: 'bar_stool', position: { x: 110, y: 165 }, tableId: null, upgradeRequired: null },
  { id: 'stool-3', type: 'bar_stool', position: { x: 187, y: 165 }, tableId: null, upgradeRequired: null },
  { id: 'stool-4', type: 'bar_stool', position: { x: 264, y: 165 }, tableId: null, upgradeRequired: null },
  { id: 'stool-5', type: 'bar_stool', position: { x: 328, y: 165 }, tableId: null, upgradeRequired: null },

  // Table 1 — upper-left (x:95, y:300)
  { id: 'table-1-chair-a', type: 'table_chair', position: { x: 95, y: 300 - TOP_BOT_OFFSET }, tableId: 'table-1', upgradeRequired: null },
  { id: 'table-1-chair-b', type: 'table_chair', position: { x: 95, y: 300 + TOP_BOT_OFFSET }, tableId: 'table-1', upgradeRequired: null },
  { id: 'table-1-chair-c', type: 'table_chair', position: { x: 95 - LFT_RGT_OFFSET, y: 300 }, tableId: 'table-1', upgradeRequired: 1 },
  { id: 'table-1-chair-d', type: 'table_chair', position: { x: 95 + LFT_RGT_OFFSET, y: 300 }, tableId: 'table-1', upgradeRequired: 1 },

  // Table 2 — upper-right (x:280, y:300)
  { id: 'table-2-chair-a', type: 'table_chair', position: { x: 280, y: 300 - TOP_BOT_OFFSET }, tableId: 'table-2', upgradeRequired: null },
  { id: 'table-2-chair-b', type: 'table_chair', position: { x: 280, y: 300 + TOP_BOT_OFFSET }, tableId: 'table-2', upgradeRequired: null },
  { id: 'table-2-chair-c', type: 'table_chair', position: { x: 280 - LFT_RGT_OFFSET, y: 300 }, tableId: 'table-2', upgradeRequired: 1 },
  { id: 'table-2-chair-d', type: 'table_chair', position: { x: 280 + LFT_RGT_OFFSET, y: 300 }, tableId: 'table-2', upgradeRequired: 1 },

  // Table 3 — lower-left (x:95, y:475)
  { id: 'table-3-chair-a', type: 'table_chair', position: { x: 95, y: 475 - TOP_BOT_OFFSET }, tableId: 'table-3', upgradeRequired: null },
  { id: 'table-3-chair-b', type: 'table_chair', position: { x: 95, y: 475 + TOP_BOT_OFFSET }, tableId: 'table-3', upgradeRequired: null },
  { id: 'table-3-chair-c', type: 'table_chair', position: { x: 95 - LFT_RGT_OFFSET, y: 475 }, tableId: 'table-3', upgradeRequired: 1 },
  { id: 'table-3-chair-d', type: 'table_chair', position: { x: 95 + LFT_RGT_OFFSET, y: 475 }, tableId: 'table-3', upgradeRequired: 1 },

  // Table 4 — lower-right (x:280, y:475)
  { id: 'table-4-chair-a', type: 'table_chair', position: { x: 280, y: 475 - TOP_BOT_OFFSET }, tableId: 'table-4', upgradeRequired: null },
  { id: 'table-4-chair-b', type: 'table_chair', position: { x: 280, y: 475 + TOP_BOT_OFFSET }, tableId: 'table-4', upgradeRequired: null },
  { id: 'table-4-chair-c', type: 'table_chair', position: { x: 280 - LFT_RGT_OFFSET, y: 475 }, tableId: 'table-4', upgradeRequired: 1 },
  { id: 'table-4-chair-d', type: 'table_chair', position: { x: 280 + LFT_RGT_OFFSET, y: 475 }, tableId: 'table-4', upgradeRequired: 1 },

  // MBW-159/160: Centre table (table-5) — only when Extra Seating tier 2
  { id: 'table-5-chair-a', type: 'table_chair', position: { x: 187, y: 387 - TOP_BOT_OFFSET }, tableId: 'table-5', upgradeRequired: 2 },
  { id: 'table-5-chair-b', type: 'table_chair', position: { x: 187, y: 387 + TOP_BOT_OFFSET }, tableId: 'table-5', upgradeRequired: 2 },
  { id: 'table-5-chair-c', type: 'table_chair', position: { x: 187 - LFT_RGT_OFFSET, y: 387 }, tableId: 'table-5', upgradeRequired: 2 },
  { id: 'table-5-chair-d', type: 'table_chair', position: { x: 187 + LFT_RGT_OFFSET, y: 387 }, tableId: 'table-5', upgradeRequired: 2 },
]

export const SEATS_BY_ID = Object.fromEntries(SEATS.map((s) => [s.id, s]))

// MBW-160: Entertainer tip position on bar counter
export const BAR_TIP_POSITION = { x: 187, y: 160 }

// MBW-161: Stage — bottom-left of floor, clear of table-3 and the doorway
export const STAGE_POSITION = { x: 65, y: 565 } as const
export const STAGE_AREA = { width: 80, height: 30 } as const
