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
import type { PowerupType, CompletedAchievement } from '../types/achievements'
import { ACHIEVEMENTS_BY_ID } from '../config/achievements'
import { POWERUP_CONFIGS_BY_TYPE } from '../config/powerups'

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

  // MBW-NEW: Achievements & Powerups actions
  completeAchievement: (id: string) => CompletedAchievement | null
  grantPowerup: (type: PowerupType, quantity: number) => void
  unlockPowerup: (type: PowerupType) => void
  spendPowerup: (type: PowerupType) => boolean
  purchasePowerup: (type: PowerupType) => boolean
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
      // MBW-NEW: Mark an achievement as completed, grant its reward, return the completed record
      completeAchievement: (id: string) => {
        const config = ACHIEVEMENTS_BY_ID[id]
        if (!config) return null

        let result: CompletedAchievement | null = null
        set((state) => {
          if (state.gameSave.achievements.completed[id]) return state // already done

          const completed: CompletedAchievement = {
            id: config.id,
            name: config.name,
            tier: config.tier,
            reward: config.reward,
          }
          result = completed

          const newAchievements = {
            ...state.gameSave.achievements,
            completed: {
              ...state.gameSave.achievements.completed,
              [id]: { completedOnDay: state.gameSave.dayNumber },
            },
          }

          // Apply coin reward
          const coinDelta = config.reward.coins ?? 0

          // Apply powerup unlock
          const newPowerups = { ...state.gameSave.powerups }
          if (config.reward.powerupUnlock) {
            if (!newPowerups.unlockedTypes.includes(config.reward.powerupUnlock)) {
              newPowerups.unlockedTypes = [...newPowerups.unlockedTypes, config.reward.powerupUnlock]
            }
          }
          // Apply powerup grant
          if (config.reward.powerupGrant) {
            const { type, quantity } = config.reward.powerupGrant
            newPowerups.inventory = {
              ...newPowerups.inventory,
              [type]: Math.min(99, (newPowerups.inventory[type] ?? 0) + quantity),
            }
          }

          // Apply decoration unlock
          const newDecorations = config.reward.decoration
            ? [...new Set([...state.gameSave.decorations, config.reward.decoration])]
            : state.gameSave.decorations

          return {
            gameSave: {
              ...state.gameSave,
              coins: state.gameSave.coins + coinDelta,
              achievements: newAchievements,
              powerups: newPowerups,
              decorations: newDecorations,
              lastSavedAt: Date.now(),
            },
          }
        })
        return result
      },

      // MBW-NEW: Add powerup stock to inventory (from achievement grant or purchase)
      grantPowerup: (type: PowerupType, quantity: number) =>
        set((state) => ({
          gameSave: {
            ...state.gameSave,
            powerups: {
              ...state.gameSave.powerups,
              inventory: {
                ...state.gameSave.powerups.inventory,
                [type]: Math.min(99, (state.gameSave.powerups.inventory[type] ?? 0) + quantity),
              },
            },
            lastSavedAt: Date.now(),
          },
        })),

      // MBW-NEW: Unlock a powerup type without granting stock
      unlockPowerup: (type: PowerupType) =>
        set((state) => {
          if (state.gameSave.powerups.unlockedTypes.includes(type)) return state
          return {
            gameSave: {
              ...state.gameSave,
              powerups: {
                ...state.gameSave.powerups,
                unlockedTypes: [...state.gameSave.powerups.unlockedTypes, type],
              },
              lastSavedAt: Date.now(),
            },
          }
        }),

      // MBW-NEW: Consume 1 unit of a powerup; returns true if successful
      spendPowerup: (type: PowerupType) => {
        let result = false
        set((state) => {
          const current = state.gameSave.powerups.inventory[type] ?? 0
          if (current <= 0) return state
          result = true
          return {
            gameSave: {
              ...state.gameSave,
              powerups: {
                ...state.gameSave.powerups,
                inventory: {
                  ...state.gameSave.powerups.inventory,
                  [type]: current - 1,
                },
              },
              lastSavedAt: Date.now(),
            },
          }
        })
        return result
      },

      // MBW-NEW: Buy 1 unit of a powerup from the shop
      purchasePowerup: (type: PowerupType) => {
        const config = POWERUP_CONFIGS_BY_TYPE[type]
        if (!config) return false

        let result = false
        set((state) => {
          if (state.gameSave.coins < config.buyPrice) return state
          result = true
          return {
            gameSave: {
              ...state.gameSave,
              coins: state.gameSave.coins - config.buyPrice,
              powerups: {
                ...state.gameSave.powerups,
                inventory: {
                  ...state.gameSave.powerups.inventory,
                  [type]: Math.min(99, (state.gameSave.powerups.inventory[type] ?? 0) + 1),
                },
              },
              lastSavedAt: Date.now(),
            },
          }
        })
        return result
      },
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

        if (version < 4) {
          // MBW-NEW: Add achievements, powerups, new stats fields
          const save = ps.gameSave as GameSave
          save.stats = {
            ...save.stats,
            totalDrinksServed: save.stats.totalDrinksServed ?? 0,
            totalMessesCleaned: save.stats.totalMessesCleaned ?? 0,
            totalDrunksEscorted: save.stats.totalDrunksEscorted ?? 0,
            totalEntertainersHosted: save.stats.totalEntertainersHosted ?? 0,
            totalGenerousTips: save.stats.totalGenerousTips ?? 0,
            totalRichServed: save.stats.totalRichServed ?? 0,
            seenEntertainers: (save.stats as { seenEntertainers?: string[] }).seenEntertainers ?? [],
          }
          save.achievements = save.achievements ?? {
            completed: {},
            consecutivePerfectWeeks: 0,
            ratingEverBelow2_5: false,
          }
          save.powerups = save.powerups ?? {
            unlockedTypes: [],
            inventory: {},
          }
          save.decorations = save.decorations ?? []
        }

        return ps
      },
    },
  ),
)
