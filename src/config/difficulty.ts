// All balance values live here — never hardcode in logic files

// MBW-8: Base customer arrival rates (customers per second) per phase — day 1 baseline
export const BASE_ARRIVAL_RATES = {
  morning: 0.25, // ~1 customer every 4s
  afternoon: 0.4, // ~1 customer every 2.5s
  evening: 0.6, // ~1 customer every 1.7s
  night: 0.8, // ~1 customer every 1.25s
} as const

// MBW-51: Arrival rate scaling per day (linear ramp, capped at day 20)
// Days 1–5: gentle, 10+: challenging. Multiplier applied to all phase rates.
export function getArrivalRateMultiplier(dayNumber: number): number {
  // +5% per day, max 2× at day 20
  return Math.min(1 + (dayNumber - 1) * 0.05, 2.0)
}

// MBW-51: Patience scaling per day — patience shrinks as days progress
// Days 1–5: full patience, day 20+: 70% of base
export function getPatienceMultiplierForDay(dayNumber: number): number {
  return Math.max(1 - (dayNumber - 1) * 0.015, 0.7)
}

// Customer patience duration (seconds) — randomised within range per customer
export const PATIENCE = {
  normal: { min: 25, max: 35 },
  linger: { min: 10, max: 15 }, // time spent sitting after being served before leaving
} as const

// Star rating balance
export const STAR_RATING = {
  initial: 3.0,
  max: 5.0,
  gameOverThreshold: 1.0,
  gainPerCorrectServe: 0.05,
  skillBonusGain: 0.02, // extra gain when serve is fast (patience > 50% remaining)
  lossPerBadReview: 0.15, // unserved customer leaves
  lossPerWrongDrink: 0.1,
} as const

// Coin rewards per drink tier
export const COIN_REWARDS = {
  tier1: 5, // Lager, Ale
  tier2: 8, // Stout, Cider, Mead, Wine
  tier3: 12, // Whisky, Brandy, Champagne (V2.0+)
} as const

// Bar layout
export const BAR = {
  initialCapacity: 13,
  barStoolCount: 5,
  tableCount: 4,
  chairsPerTable: 2,
} as const
