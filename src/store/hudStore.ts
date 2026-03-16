// Lightweight store for real-time HUD values — written by the game loop each tick
// React HUD components subscribe here; values are NOT persisted
import { create } from 'zustand'
import type { DayPhase } from '../types/day'

// MBW-120: Tip prompt shown when entertainer reaches bar at Last Orders
export interface TipPrompt {
  entertainerId: string
  entertainerName: string
  pronoun: string
  options: [number, number, number, number]  // Generous, Adequate, Poor, Refuse amounts
}

interface HudState {
  timeRemaining: number
  phase: DayPhase
  coins: number
  starRating: number
  selectedDrinkId: string | null
  performingEntertainer: string | null  // MBW-116: null = no performer
  tipPrompt: TipPrompt | null           // MBW-120: non-null = show tip prompt overlay
}

export const useHudStore = create<HudState>()(() => ({
  timeRemaining: 120,
  phase: 'MORNING',
  coins: 0,
  starRating: 3.0,
  selectedDrinkId: null,
  performingEntertainer: null,
  tipPrompt: null,
}))
