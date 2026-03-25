// MBW-6: Top-level game states
// MBW-NEW: WEEKLY_REPORT screen added for end-of-week rating reveal
// MBW-NEW: ACHIEVEMENTS screen added for dedicated achievements page
export type GameScreen = 'MAIN_MENU' | 'DAY_IN_PROGRESS' | 'BETWEEN_DAY_SHOP' | 'GAME_OVER' | 'EVENT_NOTICE' | 'WEEKLY_REPORT' | 'ACHIEVEMENTS'

// MBW-3: GameSave — persisted to localStorage via Zustand
import type { Review, WeeklyHistoryEntry } from './review'
import type { PowerupType } from './achievements'

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
    // MBW-NEW: Added for achievement tracking
    totalDrinksServed: number
    totalMessesCleaned: number
    totalDrunksEscorted: number
    totalEntertainersHosted: number
    totalGenerousTips: number
    totalRichServed: number
    seenEntertainers: string[]
  }

  // MBW-NEW: Achievements — completed records and streak tracking
  achievements: {
    completed: Record<string, { completedOnDay: number }>
    consecutivePerfectWeeks: number
    ratingEverBelow2_5: boolean
  }

  // MBW-NEW: Powerups — unlocked types and per-type inventory
  powerups: {
    unlockedTypes: PowerupType[]
    inventory: Record<string, number>
  }

  // MBW-NEW: Decorations earned from achievements
  decorations: string[]

  // MBW-173: Track which tutorial popups have been shown (so they don't repeat)
  shownTutorials: string[]

  // Meta
  lastSavedAt: number
  version: number
}

export const SAVE_VERSION = 4

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
    totalDrinksServed: 0,
    totalMessesCleaned: 0,
    totalDrunksEscorted: 0,
    totalEntertainersHosted: 0,
    totalGenerousTips: 0,
    totalRichServed: 0,
    seenEntertainers: [],
  },
  achievements: {
    completed: {},
    consecutivePerfectWeeks: 0,
    ratingEverBelow2_5: false,
  },
  powerups: {
    unlockedTypes: [],
    inventory: {},
  },
  decorations: [],
  shownTutorials: [],
  lastSavedAt: 0,
  version: SAVE_VERSION,
}
