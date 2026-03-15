// MBW-3: Zustand store with localStorage persistence
// MBW-6: Top-level state machine managed here
// MBW-40: purchaseUpgrade action
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type GameScreen, type GameSave, initialGameSave, SAVE_VERSION } from '../types/game'
import type { EventType } from '../types/day'
import { UPGRADES_BY_ID } from '../config/upgrades'

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
    }),
    {
      name: 'minibar-save',
      // Only persist gameSave, not the screen (always resume at main menu)
      partialize: (state) => ({ gameSave: state.gameSave }),
      // Handle save version migrations
      version: SAVE_VERSION,
      migrate: (persistedState, version) => {
        if (version < 2) {
          // MBW-122: Add level/xp to existing entertainer save data
          const ps = persistedState as { gameSave: GameSave }
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
          return ps
        }
        return persistedState as { gameSave: GameSave }
      },
    },
  ),
)
