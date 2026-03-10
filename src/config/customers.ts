import type { CustomerSkin, CustomerType } from '../entities/customer'
import type { DayPhase } from '../types/day'

export interface CustomerTypeConfig {
  patience: { min: number; max: number }    // seconds
  linger: { min: number; max: number }      // seconds after being served
  reorderChance: number   // 0–1 probability of ordering again after linger
  walkSpeed: number       // px/second for approach and leave animations
  placeholderColors: Record<CustomerSkin, number> // hex per skin — all identical for single-look types
  // MBW-72: V2.0 fields
  canBrawl: boolean
  brawlRadius: number     // canvas units (0 if canBrawl = false)
  preferredPhases: DayPhase[]  // phases when this type may spawn
  drinkAffinities: string[]    // drinkIds this type orders more often (empty = uniform)
}

export const CUSTOMER_CONFIGS: Record<CustomerType, CustomerTypeConfig> = {
  NORMAL: {
    patience: { min: 25, max: 35 },
    linger: { min: 5, max: 8 },
    reorderChance: 0.3,
    walkSpeed: 140,
    placeholderColors: {
      priest: 0x9966aa,
      farmer: 0x7a8b3a,
      blacksmith: 0x556066,
      merchant: 0x3a6ba0,
    },
    canBrawl: false,
    brawlRadius: 0,
    preferredPhases: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'],
    drinkAffinities: [],
  },

  // MBW-72: Hooligan — rowdy Game Day fan, short patience, triggers brawls when ignored
  HOOLIGAN: {
    patience: { min: 12, max: 18 },
    linger: { min: 3, max: 6 },
    reorderChance: 0.5,
    walkSpeed: 170,
    // All skins map to same hooligan red — single visual style (sprite art in V1.5)
    placeholderColors: {
      priest: 0xcc3300,
      farmer: 0xcc3300,
      blacksmith: 0xcc3300,
      merchant: 0xcc3300,
    },
    canBrawl: true,
    brawlRadius: 60,
    preferredPhases: ['MORNING', 'EVENING', 'NIGHT'],
    drinkAffinities: ['lager', 'ale', 'stout'],
  },
}

export const CUSTOMER_SKINS: CustomerSkin[] = ['priest', 'farmer', 'blacksmith', 'merchant']

export function randomSkin(): CustomerSkin {
  return CUSTOMER_SKINS[Math.floor(Math.random() * CUSTOMER_SKINS.length)]!
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}
