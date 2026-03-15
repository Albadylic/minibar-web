// MBW-6: Top-level game states
export type GameScreen = 'MAIN_MENU' | 'DAY_IN_PROGRESS' | 'BETWEEN_DAY_SHOP' | 'GAME_OVER' | 'EVENT_NOTICE'

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

  // MBW-121: Entertainer return likelihoods (0–1). Missing key → use DEFAULT_RETURN_LIKELIHOOD.
  entertainers: {
    jinx: { returnLikelihood: number }
    roland: { returnLikelihood: number }
    melody: { returnLikelihood: number }
  }

  // Lifetime stats
  stats: {
    totalCustomersServed: number
    totalBrawls: number
    totalCoinsEarned: number
    totalDaysPlayed: number
    totalWrongDrinks: number
  }

  // MBW-173: Track which tutorial popups have been shown (so they don't repeat)
  shownTutorials: string[]

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
  entertainers: {
    jinx: { returnLikelihood: 0.7 },
    roland: { returnLikelihood: 0.7 },
    melody: { returnLikelihood: 0.7 },
  },
  stats: {
    totalCustomersServed: 0,
    totalBrawls: 0,
    totalCoinsEarned: 0,
    totalDaysPlayed: 0,
    totalWrongDrinks: 0,
  },
  shownTutorials: [],
  lastSavedAt: 0,
  version: SAVE_VERSION,
}
