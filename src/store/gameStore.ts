// MBW-3: Zustand store with localStorage persistence
// MBW-6: Top-level state machine managed here
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type GameScreen, type GameSave, initialGameSave, SAVE_VERSION } from '../types/game'

interface GameState {
  // UI navigation state (not persisted — resets to MAIN_MENU on load)
  screen: GameScreen

  // Persisted game save
  gameSave: GameSave

  // State machine transitions
  goToScreen: (screen: GameScreen) => void

  // Save mutations
  updateSave: (updates: Partial<GameSave>) => void
  resetSave: () => void
}

// Runtime screen state is NOT persisted — always starts at MAIN_MENU
// GameSave IS persisted to localStorage under key 'minibar-save'
export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      screen: 'MAIN_MENU',
      gameSave: initialGameSave,

      goToScreen: (screen) => set({ screen }),

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
    }),
    {
      name: 'minibar-save',
      // Only persist gameSave, not the screen (always resume at main menu)
      partialize: (state) => ({ gameSave: state.gameSave }),
      // Handle save version migrations
      version: SAVE_VERSION,
      migrate: (persistedState, version) => {
        if (version < SAVE_VERSION) {
          // Future migration logic goes here
          return { gameSave: initialGameSave }
        }
        return persistedState as { gameSave: GameSave }
      },
    },
  ),
)
