// Lightweight store for real-time HUD values — written by the game loop each tick
// React HUD components subscribe here; values are NOT persisted
import { create } from 'zustand'
import type { DayPhase } from '../types/day'

interface HudState {
  timeRemaining: number
  phase: DayPhase
  coins: number
  starRating: number
  selectedDrinkId: string | null
  performingEntertainer: string | null  // MBW-116: null = no performer
}

export const useHudStore = create<HudState>()(() => ({
  timeRemaining: 120,
  phase: 'MORNING',
  coins: 0,
  starRating: 3.0,
  selectedDrinkId: null,
  performingEntertainer: null,
}))
