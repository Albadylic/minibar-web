// All drink definitions — V1.0 has 6 drinks (Tier 1 + Tier 2)
// MBW-102: Brandy and Champagne (Tier 3) added in V2.5

export interface DrinkConfig {
  id: string
  name: string
  tier: 1 | 2 | 3
  unlockDay: number // day number when this drink becomes available
  coinReward: number
  placeholderColor: number // hex color for placeholder circle
  customerAffinities: {
    normal: number       // weight for NORMAL customers
    hooligan?: number    // MBW-86: weight for HOOLIGAN customers (undefined = use normal weight)
    rich?: number        // MBW-91: weight for RICH customers
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
    customerAffinities: { normal: 1.0, hooligan: 1.5 },
  },
  {
    id: 'ale',
    name: 'Ale',
    tier: 1,
    unlockDay: 1,
    coinReward: 5,
    placeholderColor: 0xc47a2b,
    customerAffinities: { normal: 1.0, hooligan: 1.2 },
  },
  {
    id: 'stout',
    name: 'Stout',
    tier: 2,
    unlockDay: 4,
    coinReward: 8,
    placeholderColor: 0x3b1e08,
    customerAffinities: { normal: 0.8, hooligan: 1.1 },
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
    customerAffinities: { normal: 0.6, rich: 1.0 },
  },
  // MBW-85/102: Tier 3 drinks — high value; hooligans love whisky, rich favour brandy/champagne
  {
    id: 'whisky',
    name: 'Whisky',
    tier: 3,
    unlockDay: 15,
    coinReward: 12,
    placeholderColor: 0xd4902a,
    customerAffinities: { normal: 0.5, hooligan: 1.4, rich: 0.8 },
  },
  {
    id: 'brandy',
    name: 'Brandy',
    tier: 3,
    unlockDay: 18,
    coinReward: 12,
    placeholderColor: 0x8b3a0a,
    customerAffinities: { normal: 0.4, rich: 1.2 },
  },
  {
    id: 'champagne',
    name: 'Champagne',
    tier: 3,
    unlockDay: 21,
    coinReward: 15,
    placeholderColor: 0xf0e68c,
    customerAffinities: { normal: 0.3, rich: 1.5 },
  },
]

export const DRINKS_BY_ID = Object.fromEntries(DRINKS.map((d) => [d.id, d]))

// Returns drinks unlocked by a given day number
export function getUnlockedDrinks(dayNumber: number): DrinkConfig[] {
  return DRINKS.filter((d) => d.unlockDay <= dayNumber)
}
