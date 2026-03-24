// MBW-3: Zustand store with localStorage persistence
// MBW-6: Top-level state machine managed here
// MBW-40: purchaseUpgrade action
// MBW-NEW: endWeek action — finalises weekly rating and resets review accumulator
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type GameScreen, type GameSave, initialGameSave, SAVE_VERSION } from '../types/game'
import type { EventType } from '../types/day'
import { UPGRADES_BY_ID } from '../config/upgrades'
import { computeDisplayedRating } from '../config/reviewConfig'
import type { WeeklyHistoryEntry } from '../types/review'

interface GameState {
  // UI navigation state (not persisted — resets to MAIN_MENU on load)
  screen: GameScreen

  // MBW-84: Event determined in ShopScreen, consumed by DayScreen via generateDayConfig
  // Not persisted — only lives for the duration of one day transition
  pendingEvent: EventType | null

  // Persisted game save
  gameSave: GameSave

  // State machine transitions
  goToScreen: (screen: GameScreen) => void

  // MBW-83/84: Set the pending event for the next day (called from ShopScreen)
  setPendingEvent: (event: EventType | null) => void

  // Save mutations
  updateSave: (updates: Partial<GameSave>) => void
  resetSave: () => void

  // MBW-40: Purchase an upgrade — returns true if successful
  purchaseUpgrade: (upgradeId: string) => boolean

  // MBW-NEW: Finalise the current week — compute rating, push history, clear reviews
  endWeek: () => void
}

// Runtime screen state is NOT persisted — always starts at MAIN_MENU
// GameSave IS persisted to localStorage under key 'minibar-save'
export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      screen: 'MAIN_MENU',
      pendingEvent: null,
      gameSave: initialGameSave,

      goToScreen: (screen) => set({ screen }),

      setPendingEvent: (event) => set({ pendingEvent: event }),

      updateSave: (updates) =>
        set((state) => ({
          gameSave: {
            ...state.gameSave,
            ...updates,
            lastSavedAt: Date.now(),
          },
        })),

      resetSave: () =>
        set({
          screen: 'MAIN_MENU',
          gameSave: { ...initialGameSave, lastSavedAt: Date.now() },
        }),

      // MBW-40: Purchase upgrade — validates coins, deducts, records in save
      purchaseUpgrade: (upgradeId: string) => {
        const config = UPGRADES_BY_ID[upgradeId]
        if (!config) return false

        let result = false
        set((state) => {
          const owned = state.gameSave.upgrades[upgradeId]
          const currentTier = owned?.tier ?? 0
          const nextTier = currentTier + 1
          if (nextTier > config.maxTier) return state // already max tier

          const tierConfig = config.tiers[currentTier] // 0-indexed
          if (!tierConfig) return state

          if (state.gameSave.coins < tierConfig.cost) return state // can't afford

          // Apply extra_capacity immediately to barCapacity
          let barCapacity = state.gameSave.barCapacity
          for (const effect of tierConfig.effects) {
            if (effect.type === 'extra_capacity') {
              barCapacity += effect.value
            }
          }

          result = true
          return {
            gameSave: {
              ...state.gameSave,
              coins: state.gameSave.coins - tierConfig.cost,
              barCapacity,
              upgrades: {
                ...state.gameSave.upgrades,
                [upgradeId]: { tier: nextTier, purchasedOnDay: state.gameSave.dayNumber - 1 },
              },
              lastSavedAt: Date.now(),
            },
          }
        })
        return result
      },

      // MBW-NEW: Finalise the week — calculate average, update rolling rating, clear reviews
      endWeek: () =>
        set((state) => {
          const { gameSave } = state
          const reviews = gameSave.currentWeekReviews
          // Completed week number derived from current dayNumber (already incremented after last day)
          const completedWeek = Math.ceil((gameSave.dayNumber - 1) / 7)

          if (reviews.length === 0) {
            // Week 1 — no reviews generated yet, just clear (shouldn't have any anyway)
            return {
              gameSave: {
                ...gameSave,
                currentWeekReviews: [],
                lastSavedAt: Date.now(),
              },
            }
          }

          const weeklyAverage =
            reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length

          const reviewsByStars: [number, number, number, number, number] = [0, 0, 0, 0, 0]
          for (const r of reviews) {
            if (r.stars >= 1 && r.stars <= 5) reviewsByStars[r.stars - 1]!++
          }

          const newEntry: WeeklyHistoryEntry = {
            weekNumber: completedWeek,
            averageRating: weeklyAverage,
            totalReviews: reviews.length,
            reviewsByStars,
          }

          const newHistory = [...gameSave.weeklyHistory, newEntry].slice(-4)

          // Compute new displayed rating from all weekly averages in history
          const allAverages = newHistory.map((h) => h.averageRating)
          const displayedRating = computeDisplayedRating(allAverages)

          return {
            gameSave: {
              ...gameSave,
              displayedRating,
              weeklyHistory: newHistory,
              currentWeekReviews: [],
              lastSavedAt: Date.now(),
            },
          }
        }),
    }),
    {
      name: 'minibar-save',
      // Only persist gameSave, not the screen (always resume at main menu)
      partialize: (state) => ({ gameSave: state.gameSave }),
      // Handle save version migrations
      version: SAVE_VERSION,
      migrate: (persistedState, version) => {
        const ps = persistedState as { gameSave: GameSave }

        if (version < 2) {
          // MBW-122: Add level/xp to existing entertainer save data
          const ents = ps.gameSave?.entertainers
          if (ents) {
            for (const key of ['jinx', 'roland', 'melody'] as const) {
              const e = ents[key]
              if (e) {
                ents[key] = {
                  ...e,
                  level: (e as { level?: number }).level ?? 1,
                  xp: (e as { xp?: number }).xp ?? 0,
                }
              }
            }
          }
        }

        if (version < 3) {
          // MBW-NEW: Migrate from real-time starRating to weekly review system
          const save = ps.gameSave as GameSave & { starRating?: number }
          delete save.starRating
          save.displayedRating = 0
          save.weeklyHistory = []
          save.currentWeekReviews = []
        }

        return ps
      },
    },
  ),
)
