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

// MBW-81/150: Brawl config — tap requirements scale with day number; roaming speed is fixed
export const BRAWL = {
  autoResolveFallback: 20,  // seconds before brawl resolves on its own (longer — gives player time to chase)
  tapsRequiredBase: 5,      // taps to eject on day 1
  tapsRequiredMax: 9,       // capped at this value
  starLossPerCasualty: 0.12, // star rating hit per disrupted customer
  walkSpeed: 70,            // MBW-150: brawler roam speed in px/s
  roamCooldown: 1.5,        // MBW-150: pause (seconds) after disrupting a seat before picking next target
} as const

export function getBrawlTapsRequired(dayNumber: number): number {
  // +1 tap every 3 days, capped at max
  return Math.min(
    BRAWL.tapsRequiredBase + Math.floor((dayNumber - 1) / 3),
    BRAWL.tapsRequiredMax,
  )
}

// Star rating balance
export const STAR_RATING = {
  initial: 3.0,
  max: 5.0,
  gameOverThreshold: 1.0,
  gainPerCorrectServe: 0.05,
  skillBonusGain: 0.02,      // extra gain when serve is fast (patience > 50% remaining)
  lossPerBadReview: 0.15,    // unserved customer leaves
  lossPerWrongDrink: 0.1,
  lossPerHarshReview: 0.28,  // MBW-94: rich customer leaves unhappy — significantly worse
} as const

// MBW-99: Mess spawning — glasses appear only when a customer leaves (not on serve)
export const MESS = {
  spawnChanceOnLeave: 1.0,    // every customer leaves a glass behind
  maxMesses: 20,              // cap raised to match potential seat count with upgrades
} as const

// Coin rewards per drink tier
export const COIN_REWARDS = {
  tier1: 5, // Lager, Ale
  tier2: 8, // Stout, Cider, Mead, Wine
  tier3: 12, // Whisky, Brandy, Champagne (V2.0+)
} as const

