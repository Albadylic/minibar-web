// Food & Kitchen system — all 3 foods unlock on Day 15
// Spec: food.notion / Food & Kitchen — Implementation Spec

export interface FoodConfig {
  id: string
  name: string
  emoji: string
  unlockDay: number
  cookTime: number          // seconds on the oven
  readyDuration: number     // seconds food stays Ready before going Overdone
  overdoneDuration: number  // seconds food stays Overdone before burning
  sellPrice: number         // coins at full (Ready) quality
  overdoneMultiplier: number // fraction of sellPrice when Overdone
  eatDuration: number       // seconds customer takes to finish eating
  customerAffinities: Record<string, number>  // weight per CustomerType string
  patienceWindow1: number   // seconds player has to acknowledge order (or customer leaves)
  patienceWindow2: number   // seconds from order taken until food must be delivered
  supplyUnitCost: number    // ingredient cost per portion (same for all foods: 3)
}

export const FOOD_CONFIGS: FoodConfig[] = [
  {
    id: 'bread',
    name: 'Bread',
    emoji: '🍞',
    unlockDay: 15,
    cookTime: 3,
    readyDuration: 5,
    overdoneDuration: 5,
    sellPrice: 10,
    overdoneMultiplier: 0.6,
    eatDuration: 5,
    customerAffinities: { NORMAL: 1.0, HOOLIGAN: 2.0, RICH: 0.3 },
    patienceWindow1: 10,
    patienceWindow2: 8,
    supplyUnitCost: 3,
  },
  {
    id: 'stew',
    name: 'Stew',
    emoji: '🍲',
    unlockDay: 15,
    cookTime: 6,
    readyDuration: 5,
    overdoneDuration: 5,
    sellPrice: 18,
    overdoneMultiplier: 0.6,
    eatDuration: 8,
    customerAffinities: { NORMAL: 1.5, HOOLIGAN: 1.0, RICH: 0.8 },
    patienceWindow1: 12,
    patienceWindow2: 14,
    supplyUnitCost: 3,
  },
  {
    id: 'roast',
    name: 'Roast',
    emoji: '🍖',
    unlockDay: 15,
    cookTime: 9,
    readyDuration: 5,
    overdoneDuration: 5,
    sellPrice: 28,
    overdoneMultiplier: 0.6,
    eatDuration: 12,
    customerAffinities: { NORMAL: 0.8, HOOLIGAN: 0.2, RICH: 2.5 },
    patienceWindow1: 15,
    patienceWindow2: 20,
    supplyUnitCost: 3,
  },
]

export const FOOD_BY_ID: Record<string, FoodConfig> = Object.fromEntries(
  FOOD_CONFIGS.map((f) => [f.id, f]),
)

export const FOOD_UNLOCK_DAY = 15
// ~20% of table-seated customers will order food when food is unlocked
export const FOOD_ORDER_PROBABILITY = 0.20
// All food types share one ingredient pool; 3 coins per portion base cost
export const INGREDIENT_UNIT_COST = 3
