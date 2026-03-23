// MBW-59/60: Non-persisted store for the most recently completed day's results.
// Populated by the review system at day end; read by ShopScreen for the featured review.
// MBW-NEW: DayResult updated — featuredReview and reviewCount replace old tag-based system
import { create } from 'zustand'
import type { DayResult } from '../types/review'

interface DayResultState {
  lastResult: DayResult | null
  setResult: (result: DayResult) => void
}

export const useDayResultStore = create<DayResultState>()((set) => ({
  lastResult: null,
  setResult: (result) => set({ lastResult: result }),
}))
