// MBW-NEW: Review system probability constants — all balance values live here

export const REVIEW_CONFIG = {
  // Negative review base probabilities
  brawlVictimReviewChance: 1.0,
  unservedReviewChance: 0.8,
  wrongDrinkReviewChance: 0.6,

  // Positive review base probabilities by serve speed
  servedFastReviewChance: 0.15,    // patience > 50% remaining
  servedNormalReviewChance: 0.10,  // patience 25–50% remaining
  servedSlowReviewChance: 0.05,    // patience < 25% remaining

  // Modifiers (additive on review probability)
  richCustomerReviewMultiplier: 2.0,   // rich customers review more often (×2)
  cleanBarPositiveBonus: 0.05,         // no messes at time of serve
  dirtyBarNegativeBonus: 0.10,         // 3+ messes at time of serve
  entertainerPerformingBonus: 0.05,    // entertainer active when served
  prestigePerPoint5StarChance: 0.02,   // per prestige point: more likely 5★ vs 4★

  // Star ratings by trigger
  brawlVictimStars: 1,
  unservedStars: 1,
  wrongDrinkStarsMin: 1,
  wrongDrinkStarsMax: 2,
  servedSlowStars: 3,
  servedNormalStars: 4,
  servedFastStarsMin: 4,
  servedFastStarsMax: 5,

  // 10% of anon reviews get a random name (cosmetic)
  namedNpcReviewChance: 0.10,

  // Rolling weighted average: [thisWeek, lastWeek, twoWeeksAgo, threeWeeksAgo]
  // Partial sets used when fewer than 4 weeks of history exist (see getDisplayedRating)
  rollingWeightSets: [
    [1.0],
    [0.6, 0.4],
    [0.45, 0.35, 0.20],
    [0.40, 0.30, 0.20, 0.10],
  ] as number[][],

  // Week 2: negative review probabilities are halved (grace period — new bar)
  week2NegativeReviewMultiplier: 0.5,

  // Arrival rate multiplier lookup by rating band
  arrivalMultipliers: [
    { maxRating: 1.9, multiplier: 0.6 },
    { maxRating: 2.9, multiplier: 0.8 },
    { maxRating: 3.4, multiplier: 1.0 },
    { maxRating: 3.9, multiplier: 1.15 },
    { maxRating: 4.4, multiplier: 1.3 },
    { maxRating: 4.9, multiplier: 1.5 },
    { maxRating: 5.0, multiplier: 1.7 },
  ],

  // Negative review probability modifier by rating band (higher rating = harsher expectations)
  expectationsModifiers: [
    { maxRating: 1.9, modifier: 0.5 },
    { maxRating: 2.9, modifier: 0.75 },
    { maxRating: 3.4, modifier: 1.0 },
    { maxRating: 3.9, modifier: 1.1 },
    { maxRating: 4.4, modifier: 1.25 },
    { maxRating: 5.0, modifier: 1.5 },
  ],
} as const

// Look up the arrival rate multiplier for a given displayed rating
export function getArrivalRatingMultiplier(displayedRating: number): number {
  if (displayedRating === 0) return 1.0  // no rating yet — baseline
  for (const band of REVIEW_CONFIG.arrivalMultipliers) {
    if (displayedRating <= band.maxRating) return band.multiplier
  }
  return 1.7  // 5.0★
}

// Look up the expectations modifier for negative review probability
export function getExpectationsModifier(displayedRating: number): number {
  if (displayedRating === 0) return 1.0  // no rating yet — baseline
  for (const band of REVIEW_CONFIG.expectationsModifiers) {
    if (displayedRating <= band.maxRating) return band.modifier
  }
  return 1.5  // 5.0★
}

// Compute the rolling weighted average given an ordered history (most recent last)
export function computeDisplayedRating(weeklyAverages: number[]): number {
  if (weeklyAverages.length === 0) return 0
  const capped = weeklyAverages.slice(-4)  // at most last 4 weeks
  const setIndex = Math.min(capped.length, REVIEW_CONFIG.rollingWeightSets.length) - 1
  const weights = REVIEW_CONFIG.rollingWeightSets[setIndex]!
  // Apply weights: most recent week gets the highest weight (first entry in weights)
  const reversed = [...capped].reverse()
  let weightedSum = 0
  let weightSum = 0
  for (let i = 0; i < reversed.length && i < weights.length; i++) {
    weightedSum += reversed[i]! * weights[i]!
    weightSum += weights[i]!
  }
  return weightSum > 0 ? weightedSum / weightSum : 0
}
