// MBW-6: Top-level game states
export type GameScreen = 'MAIN_MENU' | 'DAY_IN_PROGRESS' | 'BETWEEN_DAY_SHOP' | 'GAME_OVER'

// MBW-3: GameSave — persisted to localStorage via Zustand
export interface GameSave {
  // Core progression
  dayNumber: number
  starRating: number
  coins: number

  // Upgrades owned
  upgrades: Record<string, { tier: number; purchasedOnDay: number }>

  // Derived but cached
  barCapacity: number
  unlockedDrinks: string[]

  // Event state
  daysSinceLastGameDay: number

  // Lifetime stats
  stats: {
    totalCustomersServed: number
    totalBrawls: number
    totalCoinsEarned: number
    totalDaysPlayed: number
    totalWrongDrinks: number
  }

  // Meta
  lastSavedAt: number
  version: number
}

export const SAVE_VERSION = 1

export const initialGameSave: GameSave = {
  dayNumber: 1,
  starRating: 3.0,
  coins: 0,
  upgrades: {},
  barCapacity: 13,
  unlockedDrinks: ['lager', 'ale'],
  daysSinceLastGameDay: 0,
  stats: {
    totalCustomersServed: 0,
    totalBrawls: 0,
    totalCoinsEarned: 0,
    totalDaysPlayed: 0,
    totalWrongDrinks: 0,
  },
  lastSavedAt: 0,
  version: SAVE_VERSION,
}
