// All drink definitions — V1.0 has 6 drinks (Tier 1 + Tier 2)
// Tier 3 drinks (Whisky, Brandy, Champagne) added in V2.0+

export interface DrinkConfig {
  id: string
  name: string
  tier: 1 | 2 | 3
  unlockDay: number // day number when this drink becomes available
  coinReward: number
  placeholderColor: number // hex color for placeholder circle
  customerAffinities: {
    normal: number // 0–1 weight
    // hooligan, rich, drunk added in later versions
  }
}

export const DRINKS: DrinkConfig[] = [
  {
    id: 'lager',
    name: 'Lager',
    tier: 1,
    unlockDay: 1,
    coinReward: 5,
    placeholderColor: 0xf5c842,
    customerAffinities: { normal: 1.0 },
  },
  {
    id: 'ale',
    name: 'Ale',
    tier: 1,
    unlockDay: 1,
    coinReward: 5,
    placeholderColor: 0xc47a2b,
    customerAffinities: { normal: 1.0 },
  },
  {
    id: 'stout',
    name: 'Stout',
    tier: 2,
    unlockDay: 4,
    coinReward: 8,
    placeholderColor: 0x3b1e08,
    customerAffinities: { normal: 0.8 },
  },
  {
    id: 'cider',
    name: 'Cider',
    tier: 2,
    unlockDay: 7,
    coinReward: 8,
    placeholderColor: 0xa8d44e,
    customerAffinities: { normal: 0.8 },
  },
  {
    id: 'mead',
    name: 'Mead',
    tier: 2,
    unlockDay: 10,
    coinReward: 8,
    placeholderColor: 0xe8b84b,
    customerAffinities: { normal: 0.7 },
  },
  {
    id: 'wine',
    name: 'Wine',
    tier: 2,
    unlockDay: 13,
    coinReward: 8,
    placeholderColor: 0x8b1a3a,
    customerAffinities: { normal: 0.6 },
  },
]

export const DRINKS_BY_ID = Object.fromEntries(DRINKS.map((d) => [d.id, d]))

// Returns drinks unlocked by a given day number
export function getUnlockedDrinks(dayNumber: number): DrinkConfig[] {
  return DRINKS.filter((d) => d.unlockDay <= dayNumber)
}
