// MBW-8: Day phases and timing constants
export type DayPhase = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'

// Future versions add event types (V2.0+)
export type EventType = 'GAME_DAY' | 'MARKET_DAY' | 'NOBLES_VISIT' | 'HARVEST_FESTIVAL' | 'BARD_NIGHT'

export const DAY_DURATION = 120 // seconds
export const LAST_ORDERS_ELAPSED = 100 // seconds into day when last orders fires
export const TICK_RATE = 1 / 60 // 60 simulation ticks per second

// Elapsed seconds at which each phase begins
export const PHASE_START_TIMES: Record<DayPhase, number> = {
  MORNING: 0,
  AFTERNOON: 30,
  EVENING: 60,
  NIGHT: 90,
}

// MBW-10: DayConfig — generated at day start, not persisted
export interface DayConfig {
  dayNumber: number
  event: EventType | null // V2.0+ — always null in V1.0
  duration: typeof DAY_DURATION
  arrivalRates: {
    morning: number // customers per second
    afternoon: number
    evening: number
    night: number
  }
  modifiers: {
    patienceMultiplier: number // 1.0 = default
    coinMultiplier: number // 1.0 = default
    tipJarBonus: number // coins added on fast serves (0 = no tip jar)
  }
}
