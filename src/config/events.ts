// MBW-83: Game Day event — selection logic and config
import type { EventType } from '../types/day'
import type { GameSave } from '../types/game'

export const GAME_DAY_CONFIG = {
  baseProbability: 0.15,     // 15% base chance per day
  pityBonusPerDay: 0.10,     // +10% per day since last Game Day
  maxProbability: 0.80,      // never exceeds 80%
  // Customer weight overrides during Game Day
  customerWeights: {
    normal: 0.55,
    hooligan: 0.45,
  },
} as const

// Returns which event (if any) will run on the next day, given the current save state.
// Call this when the player presses "Start Day" in the shop.
// MBW-83: Uses pity timer (daysSinceLastGameDay) to gradually increase probability.
export function rollNextDayEvent(save: GameSave): EventType | null {
  const probability = Math.min(
    GAME_DAY_CONFIG.baseProbability +
      save.daysSinceLastGameDay * GAME_DAY_CONFIG.pityBonusPerDay,
    GAME_DAY_CONFIG.maxProbability,
  )

  if (Math.random() < probability) {
    return 'GAME_DAY'
  }
  return null
}
