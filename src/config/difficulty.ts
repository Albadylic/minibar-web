// All balance values live here — never hardcode in logic files

// MBW-55: Base customer arrival rates (customers per second) per phase — day 1 baseline
// Reduced from original values (0.25/0.4/0.6/0.8) — Day 1 was overwhelming for new players.
// +5%/day scaling means Day 5 reaches roughly the old Day-1 morning rate.
export const BASE_ARRIVAL_RATES = {
  morning: 0.15, // ~1 every 7s — gentle learning pace
  afternoon: 0.25, // ~1 every 4s  — warming up
  evening: 0.4, // ~1 every 2.5s — busy
  night: 0.55, // ~1 every 1.8s — hectic but manageable
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

// MBW-81: Brawl escalation config — radius and tap requirements scale with day number
export const BRAWL = {
  autoResolveFallback: 12,  // seconds before brawl resolves on its own (bad outcome)
  tapsRequiredBase: 5,      // taps to eject on day 1
  tapsRequiredMax: 9,       // capped at this value
  starLossPerCasualty: 0.12, // star rating hit per affected customer
} as const

export function getBrawlTapsRequired(dayNumber: number): number {
  // +1 tap every 3 days, capped at max
  return Math.min(
    BRAWL.tapsRequiredBase + Math.floor((dayNumber - 1) / 3),
    BRAWL.tapsRequiredMax,
  )
}

export function getBrawlRadius(dayNumber: number): number {
  // Base radius from customer config; grows +5px every 2 days, capped at 110
  return Math.min(60 + Math.floor((dayNumber - 1) / 2) * 5, 110)
}

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
