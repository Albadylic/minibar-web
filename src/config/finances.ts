// MBW-NEW: Bar Finances system constants — supply costs, wages, rent, insurance
export const FINANCES_CONFIG = {
  // Rent scales with Extra Seating tier owned (tier 0 = base 13 seats)
  RENT_BY_EXTRA_SEAT_TIER: [50, 65, 80] as const,

  // Insurance: 5% of total insurable upgrade investment per week
  INSURANCE_RATE: 0.05,
  INSURABLE_UPGRADE_IDS: [
    'candles', 'fireplace', 'tapestries', 'fine_tables', 'chandelier', 'tip_jar',
  ] as const,
  BURGLARY_CHANCE_NO_INSURANCE: 0.04,  // ~4% per night without insurance
  BURGLARY_CHANCE_INSURED: 0.01,       // ~1% per night with insurance

  // Supply bulk purchase tiers
  BULK_TIERS: {
    small:  { quantity: 5,  discount: 0 },
    medium: { quantity: 15, discount: 0.15 },
    large:  { quantity: 30, discount: 0.30 },
  } as const,

  // Supply unit costs per drink (base price before bulk discount)
  SUPPLY_COSTS: {
    lager:     1,
    ale:       1,
    stout:     2,
    cider:     2,
    mead:      3,
    wine:      4,
    whisky:    5,
    brandy:    6,
    champagne: 8,
  } as const,

  // Staff weekly wages (upgradeId → tier number → coins/week)
  STAFF_WAGES: {
    bouncer: { 1: 40, 2: 65, 3: 90  },
    cleaner: { 1: 30, 2: 50, 3: 75  },
    doorman: { 1: 35, 2: 55, 3: 80  },
    chef:    { 1: 55, 2: 80, 3: 110 },
    waiter:  { 1: 45, 2: 70, 3: 100 },
  } as const,

  SELL_REFUND_RATE: 0.50,
  EARLY_PAYMENT_DISCOUNT: 0.05,
  LOAN_INTEREST_RATE: 0.10,
  DEBT_THRESHOLD: 500,
  DEBT_WARNING_THRESHOLD: 350,
  DEFAULT_SUPPLY_CAPACITY: 20,
} as const

export type InsurableUpgradeId = typeof FINANCES_CONFIG.INSURABLE_UPGRADE_IDS[number]
export type BulkTierKey = keyof typeof FINANCES_CONFIG.BULK_TIERS
export type SupplyCostDrinkId = keyof typeof FINANCES_CONFIG.SUPPLY_COSTS
export type WageUpgradeId = keyof typeof FINANCES_CONFIG.STAFF_WAGES

/** Compute weekly rent based on Extra Seating tier owned (0 = base). */
export function computeWeeklyRent(extraSeatTier: number): number {
  const tier = Math.min(extraSeatTier, 2) as 0 | 1 | 2
  return FINANCES_CONFIG.RENT_BY_EXTRA_SEAT_TIER[tier]
}

/** Compute weekly insurance premium from owned insurable upgrades. */
export function computeWeeklyInsurance(
  ownedUpgrades: Record<string, { tier: number }>,
  upgradeTierCosts: Record<string, number[]>,
): number {
  let total = 0
  for (const id of FINANCES_CONFIG.INSURABLE_UPGRADE_IDS) {
    const owned = ownedUpgrades[id]
    if (!owned) continue
    const costs = upgradeTierCosts[id] ?? []
    // Sum all tier costs up to owned tier to get total invested
    let invested = 0
    for (let t = 0; t < owned.tier; t++) {
      invested += costs[t] ?? 0
    }
    total += invested
  }
  return Math.round(total * FINANCES_CONFIG.INSURANCE_RATE)
}

/** Compute total weekly wages from currently hired staff. */
export function computeWeeklyWages(ownedUpgrades: Record<string, { tier: number }>): number {
  let total = 0
  for (const [id, wages] of Object.entries(FINANCES_CONFIG.STAFF_WAGES)) {
    const owned = ownedUpgrades[id]
    if (!owned) continue
    const tierWage = (wages as Record<number, number>)[owned.tier] ?? 0
    total += tierWage
  }
  return total
}

/** Compute bulk tier cost for a drink: qty × unitCost × (1 - discount), rounded. */
export function computeBulkCost(unitCost: number, tier: BulkTierKey): number {
  const { quantity, discount } = FINANCES_CONFIG.BULK_TIERS[tier]
  return Math.round(quantity * unitCost * (1 - discount))
}
