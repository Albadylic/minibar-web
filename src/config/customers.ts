import type { CustomerSkin, CustomerType } from '../entities/customer'

export interface CustomerTypeConfig {
  patience: { min: number; max: number } // seconds
  linger: { min: number; max: number } // seconds after being served
  reorderChance: number // 0–1 probability of ordering again after linger
  walkSpeed: number // px/second for approach and leave animations
  placeholderColors: Record<CustomerSkin, number> // hex per skin
}

export const CUSTOMER_CONFIGS: Record<CustomerType, CustomerTypeConfig> = {
  NORMAL: {
    patience: { min: 25, max: 35 },
    linger: { min: 10, max: 15 },
    reorderChance: 0.3,
    walkSpeed: 140,
    placeholderColors: {
      priest: 0x9966aa,
      farmer: 0x7a8b3a,
      blacksmith: 0x556066,
      merchant: 0x3a6ba0,
    },
  },
}

export const CUSTOMER_SKINS: CustomerSkin[] = ['priest', 'farmer', 'blacksmith', 'merchant']

export function randomSkin(): CustomerSkin {
  return CUSTOMER_SKINS[Math.floor(Math.random() * CUSTOMER_SKINS.length)]!
}

export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}
