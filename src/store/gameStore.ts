// MBW-3: Zustand store with localStorage persistence
// MBW-6: Top-level state machine managed here
// MBW-40: purchaseUpgrade action
// MBW-NEW: endWeek action — finalises weekly rating and resets review accumulator
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type GameScreen, type GameSave, type SupplyState, type WeeklyBillRecord, initialGameSave, SAVE_VERSION } from '../types/game'
import type { EventType } from '../types/day'
import { UPGRADES_BY_ID } from '../config/upgrades'
import { computeDisplayedRating } from '../config/reviewConfig'
import type { WeeklyHistoryEntry } from '../types/review'
import type { PowerupType, CompletedAchievement } from '../types/achievements'
import { ACHIEVEMENTS_BY_ID } from '../config/achievements'
import { POWERUP_CONFIGS_BY_TYPE } from '../config/powerups'
import { FINANCES_CONFIG } from '../config/finances'

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

  // MBW-NEW: Bar Finances actions
  consumeSupply: (drinkId: string) => number                                             // returns new remaining
  restockDrink: (drinkId: string, qty: number, totalCost: number) => boolean
  resetDailySupply: () => void                                                            // reset usedToday at day start
  addWeeklyRevenue: (amount: number) => void
  accrueWeeklyLoans: () => number                                                         // applies interest, returns total loan debt
  payWeeklyBill: (payable: number, record: WeeklyBillRecord) => void
  deferWeeklyBill: (payable: number, record: WeeklyBillRecord) => void
  takeLoan: (payable: number, record: WeeklyBillRecord) => void
  resetWeeklyFinances: () => void
  toggleInsurance: () => void
  sellUpgrade: (upgradeId: string) => boolean                                             // remove entirely, 50% T1 refund
  downgradeUpgrade: (upgradeId: string) => boolean                                       // revert 1 tier, 50% that tier refund
  fireStaff: (upgradeId: string) => void                                                  // remove staff, no refund
  checkBurglary: () => void                                                               // overnight random roll

  // MBW-NEW: Transient UI state (not persisted)
  burglaryNotification: { upgradeId: string; upgradeName: string; covered: boolean } | null
  clearBurglaryNotification: () => void
  burglaryCheckedForDay: number
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

      // MBW-NEW: Transient finance UI state
      burglaryNotification: null,
      clearBurglaryNotification: () => set({ burglaryNotification: null }),
      burglaryCheckedForDay: 0,

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
      // MBW-NEW: Bar Finances — supply tracking

      consumeSupply: (drinkId: string) => {
        let newRemaining = 0
        set((state) => {
          const current = state.gameSave.finances.supplies[drinkId]
          if (!current || current.remaining <= 0) return state
          newRemaining = current.remaining - 1
          return {
            gameSave: {
              ...state.gameSave,
              finances: {
                ...state.gameSave.finances,
                supplies: {
                  ...state.gameSave.finances.supplies,
                  [drinkId]: {
                    ...current,
                    remaining: newRemaining,
                    usedToday: current.usedToday + 1,
                    totalUsedThisWeek: current.totalUsedThisWeek + 1,
                  },
                },
              },
              lastSavedAt: Date.now(),
            },
          }
        })
        return newRemaining
      },

      restockDrink: (drinkId: string, qty: number, totalCost: number) => {
        let success = false
        set((state) => {
          if (state.gameSave.coins < totalCost) return state
          const current: SupplyState = state.gameSave.finances.supplies[drinkId] ?? {
            remaining: 0, usedToday: 0, totalUsedThisWeek: 0, totalSpentThisWeek: 0,
          }
          success = true
          return {
            gameSave: {
              ...state.gameSave,
              coins: state.gameSave.coins - totalCost,
              finances: {
                ...state.gameSave.finances,
                supplies: {
                  ...state.gameSave.finances.supplies,
                  [drinkId]: {
                    ...current,
                    remaining: current.remaining + qty,
                    totalSpentThisWeek: current.totalSpentThisWeek + totalCost,
                  },
                },
                suppliesSpentThisWeek: state.gameSave.finances.suppliesSpentThisWeek + totalCost,
              },
              lastSavedAt: Date.now(),
            },
          }
        })
        return success
      },

      resetDailySupply: () =>
        set((state) => {
          const resetSupplies: Record<string, SupplyState> = {}
          for (const [id, s] of Object.entries(state.gameSave.finances.supplies)) {
            resetSupplies[id] = { ...s, usedToday: 0 }
          }
          return {
            gameSave: {
              ...state.gameSave,
              finances: { ...state.gameSave.finances, supplies: resetSupplies },
              lastSavedAt: Date.now(),
            },
          }
        }),

      addWeeklyRevenue: (amount: number) =>
        set((state) => ({
          gameSave: {
            ...state.gameSave,
            finances: {
              ...state.gameSave.finances,
              weeklyRevenue: state.gameSave.finances.weeklyRevenue + amount,
            },
            lastSavedAt: Date.now(),
          },
        })),

      accrueWeeklyLoans: () => {
        let totalLoanDebt = 0
        set((state) => {
          if (state.gameSave.finances.loans.length === 0) return state
          const accruedLoans = state.gameSave.finances.loans.map((loan) => ({
            ...loan,
            principal: Math.round(loan.principal * (1 + loan.interestRate)),
          }))
          totalLoanDebt = accruedLoans.reduce((sum, l) => sum + l.principal, 0)
          return {
            gameSave: {
              ...state.gameSave,
              finances: { ...state.gameSave.finances, loans: accruedLoans },
              lastSavedAt: Date.now(),
            },
          }
        })
        return totalLoanDebt
      },

      payWeeklyBill: (payable: number, record: WeeklyBillRecord) =>
        set((state) => {
          const discounted = Math.round(payable * (1 - FINANCES_CONFIG.EARLY_PAYMENT_DISCOUNT))
          const newCoins = state.gameSave.coins - discounted
          return {
            gameSave: {
              ...state.gameSave,
              coins: Math.max(0, newCoins),
              finances: {
                ...state.gameSave.finances,
                loans: [],  // loans paid off with this bill
                outstandingDebt: newCoins < 0
                  ? state.gameSave.finances.outstandingDebt + Math.abs(newCoins)
                  : Math.max(0, state.gameSave.finances.outstandingDebt),
                weeklyBillHistory: [...state.gameSave.finances.weeklyBillHistory, { ...record, paymentMethod: 'immediate' as const }],
                suppliesSpentThisWeek: 0,
                weeklyRevenue: 0,
              },
              lastSavedAt: Date.now(),
            },
          }
        }),

      deferWeeklyBill: (payable: number, record: WeeklyBillRecord) =>
        set((state) => ({
          gameSave: {
            ...state.gameSave,
            finances: {
              ...state.gameSave.finances,
              loans: [],  // loans folded into deferred debt
              outstandingDebt: state.gameSave.finances.outstandingDebt + payable,
              weeklyBillHistory: [...state.gameSave.finances.weeklyBillHistory, { ...record, paymentMethod: 'deferred' as const }],
              suppliesSpentThisWeek: 0,
              weeklyRevenue: 0,
            },
            lastSavedAt: Date.now(),
          },
        })),

      takeLoan: (payable: number, record: WeeklyBillRecord) =>
        set((state) => {
          const weekNumber = Math.ceil((state.gameSave.dayNumber - 1) / 7)
          return {
            gameSave: {
              ...state.gameSave,
              finances: {
                ...state.gameSave.finances,
                loans: [
                  ...state.gameSave.finances.loans,
                  { principal: payable, interestRate: FINANCES_CONFIG.LOAN_INTEREST_RATE, weekTaken: weekNumber },
                ],
                weeklyBillHistory: [...state.gameSave.finances.weeklyBillHistory, { ...record, paymentMethod: 'loan' as const }],
                suppliesSpentThisWeek: 0,
                weeklyRevenue: 0,
              },
              lastSavedAt: Date.now(),
            },
          }
        }),

      resetWeeklyFinances: () =>
        set((state) => {
          const resetSupplies: Record<string, SupplyState> = {}
          for (const [id, s] of Object.entries(state.gameSave.finances.supplies)) {
            resetSupplies[id] = { ...s, totalUsedThisWeek: 0, totalSpentThisWeek: 0 }
          }
          return {
            gameSave: {
              ...state.gameSave,
              finances: {
                ...state.gameSave.finances,
                supplies: resetSupplies,
                suppliesSpentThisWeek: 0,
                weeklyRevenue: 0,
              },
              lastSavedAt: Date.now(),
            },
          }
        }),

      toggleInsurance: () =>
        set((state) => ({
          gameSave: {
            ...state.gameSave,
            finances: {
              ...state.gameSave.finances,
              insuranceOptedIn: !state.gameSave.finances.insuranceOptedIn,
            },
            lastSavedAt: Date.now(),
          },
        })),

      sellUpgrade: (upgradeId: string) => {
        let result = false
        set((state) => {
          const config = UPGRADES_BY_ID[upgradeId]
          const owned = state.gameSave.upgrades[upgradeId]
          if (!config || !owned) return state

          const tier1Cost = config.tiers[0]?.cost ?? 0
          const refund = Math.floor(tier1Cost * FINANCES_CONFIG.SELL_REFUND_RATE)

          // Reverse capacity effects from all owned tiers
          let barCapacity = state.gameSave.barCapacity
          for (let t = 0; t < owned.tier; t++) {
            for (const effect of config.tiers[t]?.effects ?? []) {
              if (effect.type === 'extra_capacity') barCapacity -= effect.value
            }
          }

          const newUpgrades = { ...state.gameSave.upgrades }
          delete newUpgrades[upgradeId]

          result = true
          return {
            gameSave: {
              ...state.gameSave,
              coins: state.gameSave.coins + refund,
              barCapacity,
              upgrades: newUpgrades,
              lastSavedAt: Date.now(),
            },
          }
        })
        return result
      },

      downgradeUpgrade: (upgradeId: string) => {
        let result = false
        set((state) => {
          const config = UPGRADES_BY_ID[upgradeId]
          const owned = state.gameSave.upgrades[upgradeId]
          if (!config || !owned || owned.tier < 2) return state

          const tierBeingRemoved = config.tiers[owned.tier - 1]
          if (!tierBeingRemoved) return state

          const refund = Math.floor(tierBeingRemoved.cost * FINANCES_CONFIG.SELL_REFUND_RATE)

          // Reverse capacity effects for the tier being removed
          let barCapacity = state.gameSave.barCapacity
          for (const effect of tierBeingRemoved.effects) {
            if (effect.type === 'extra_capacity') barCapacity -= effect.value
          }

          result = true
          return {
            gameSave: {
              ...state.gameSave,
              coins: state.gameSave.coins + refund,
              barCapacity,
              upgrades: {
                ...state.gameSave.upgrades,
                [upgradeId]: { ...owned, tier: owned.tier - 1 },
              },
              lastSavedAt: Date.now(),
            },
          }
        })
        return result
      },

      fireStaff: (upgradeId: string) =>
        set((state) => {
          if (!state.gameSave.upgrades[upgradeId]) return state
          const newUpgrades = { ...state.gameSave.upgrades }
          delete newUpgrades[upgradeId]
          return {
            gameSave: {
              ...state.gameSave,
              upgrades: newUpgrades,
              lastSavedAt: Date.now(),
            },
          }
        }),

      checkBurglary: () => {
        set((state) => {
          const { finances, upgrades } = state.gameSave
          const chance = finances.insuranceOptedIn
            ? FINANCES_CONFIG.BURGLARY_CHANCE_INSURED
            : FINANCES_CONFIG.BURGLARY_CHANCE_NO_INSURANCE

          if (Math.random() >= chance) return state

          // Pick a random owned insurable upgrade
          const owned = FINANCES_CONFIG.INSURABLE_UPGRADE_IDS.filter((id) => upgrades[id])
          if (owned.length === 0) return state

          const upgradeId = owned[Math.floor(Math.random() * owned.length)]!
          const config = UPGRADES_BY_ID[upgradeId]
          if (!config) return state

          const currentOwned = upgrades[upgradeId]
          if (!currentOwned) return state

          const tierCost = config.tiers[currentOwned.tier - 1]?.cost ?? 0
          const covered = finances.insuranceOptedIn
          const refund = covered ? tierCost : 0

          // Reverse capacity effects
          let barCapacity = state.gameSave.barCapacity
          const tierEffects = config.tiers[currentOwned.tier - 1]?.effects ?? []
          for (const effect of tierEffects) {
            if (effect.type === 'extra_capacity') barCapacity -= effect.value
          }

          const newUpgrades = { ...upgrades }
          if (currentOwned.tier <= 1) {
            delete newUpgrades[upgradeId]
          } else {
            newUpgrades[upgradeId] = { ...currentOwned, tier: currentOwned.tier - 1 }
          }

          return {
            gameSave: {
              ...state.gameSave,
              coins: state.gameSave.coins + refund,
              barCapacity,
              upgrades: newUpgrades,
              lastSavedAt: Date.now(),
            },
            burglaryNotification: { upgradeId, upgradeName: config.name, covered },
          }
        })
        // Mark as checked for this day
        set((state) => ({
          burglaryCheckedForDay: state.gameSave.dayNumber - 1,
        }))
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

        if (version < 5) {
          // MBW-NEW: Add Bar Finances — supply tracking, debt, loans, insurance
          const save = ps.gameSave as GameSave
          if (!save.finances) {
            const supplies: Record<string, SupplyState> = {}
            for (const drinkId of (save.unlockedDrinks ?? ['lager', 'ale'])) {
              supplies[drinkId] = {
                remaining: FINANCES_CONFIG.DEFAULT_SUPPLY_CAPACITY,
                usedToday: 0,
                totalUsedThisWeek: 0,
                totalSpentThisWeek: 0,
              }
            }
            save.finances = {
              supplies,
              outstandingDebt: 0,
              loans: [],
              insuranceOptedIn: false,
              weeklyBillHistory: [],
              suppliesSpentThisWeek: 0,
              weeklyRevenue: 0,
            }
          }
        }

        return ps
      },
    },
  ),
)
