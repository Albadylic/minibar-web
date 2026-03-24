// MBW-6: Top-level game states
// MBW-NEW: WEEKLY_REPORT screen added for end-of-week rating reveal
export type GameScreen = 'MAIN_MENU' | 'DAY_IN_PROGRESS' | 'BETWEEN_DAY_SHOP' | 'GAME_OVER' | 'EVENT_NOTICE' | 'WEEKLY_REPORT'

// MBW-3: GameSave — persisted to localStorage via Zustand
import type { Review, WeeklyHistoryEntry } from './review'

export interface GameSave {
  // Core progression
  dayNumber: number
  coins: number

  // MBW-NEW: Weekly review system — replaces real-time starRating
  displayedRating: number           // Rolling weighted average (0 until first rated week)
  weeklyHistory: WeeklyHistoryEntry[]  // Last 4 completed weeks
  currentWeekReviews: Review[]         // Reviews accumulated this week (cleared at week end)

  // Upgrades owned
  upgrades: Record<string, { tier: number; purchasedOnDay: number }>

  // Derived but cached
  barCapacity: number
  unlockedDrinks: string[]

  // Event state
  daysSinceLastGameDay: number

  // MBW-121/122: Entertainer return likelihoods, hidden levels, and XP.
  entertainers: {
    jinx: { returnLikelihood: number; level: number; xp: number }
    roland: { returnLikelihood: number; level: number; xp: number }
    melody: { returnLikelihood: number; level: number; xp: number }
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

export const SAVE_VERSION = 3

export const initialGameSave: GameSave = {
  dayNumber: 1,
  coins: 0,
  displayedRating: 0,
  weeklyHistory: [],
  currentWeekReviews: [],
  upgrades: {},
  barCapacity: 13,
  unlockedDrinks: ['lager', 'ale'],
  daysSinceLastGameDay: 0,
  entertainers: {
    jinx: { returnLikelihood: 0.7, level: 1, xp: 0 },
    roland: { returnLikelihood: 0.7, level: 1, xp: 0 },
    melody: { returnLikelihood: 0.7, level: 1, xp: 0 },
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
