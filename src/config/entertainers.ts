// MBW-117/118/119/121: Entertainer configs
import type { EntertainerId } from '../entities/entertainer'
import type { CustomerType } from '../entities/customer'

export interface EntertainerConfig {
  id: EntertainerId
  name: string
  description: string       // shown in ShopScreen when they appear
  placeholderColor: number  // circle color until sprite art is ready
  // Per-customer-type patience decay multiplier during performance (<1 = patients wait longer)
  patienceDecayMult: Record<CustomerType, number>
  coinBoostMult: number  // multiplied into coin rewards during performance
  tipCost: number        // coins the player pays as tip (0 = jukebox, automatic)
}

// MBW-117: Jinx — Jester. Best on Game Days; calms hooligans significantly.
// MBW-118: Roland — Bard. Best with rich clientele; boosts patience and coin rewards.
// MBW-119: Melody — Musician. Balanced crowd-pleaser; reliable moderate boost for all.
export const ENTERTAINER_CONFIGS: Record<EntertainerId, EntertainerConfig> = {
  jinx: {
    id: 'jinx',
    name: 'Jinx',
    description: 'Jester. Hooligans laugh instead of brawling.',
    placeholderColor: 0xffcc00,
    patienceDecayMult: { NORMAL: 0.85, HOOLIGAN: 0.60, RICH: 0.95, DRUNK: 1.0 },
    coinBoostMult: 1.0,
    tipCost: 8,
  },
  roland: {
    id: 'roland',
    name: 'Roland',
    description: 'Bard. Rich clientele are more patient and generous.',
    placeholderColor: 0x8844cc,
    patienceDecayMult: { NORMAL: 0.90, HOOLIGAN: 0.95, RICH: 0.70, DRUNK: 1.0 },
    coinBoostMult: 1.1,
    tipCost: 10,
  },
  melody: {
    id: 'melody',
    name: 'Melody',
    description: 'Musician. A steady boost for everyone.',
    placeholderColor: 0x44aacc,
    patienceDecayMult: { NORMAL: 0.80, HOOLIGAN: 0.82, RICH: 0.85, DRUNK: 1.0 },
    coinBoostMult: 1.05,
    tipCost: 9,
  },
  // Fallback when no named entertainer passes their return likelihood roll
  jukebox: {
    id: 'jukebox',
    name: 'Jukebox',
    description: 'Automated music. A small, reliable boost — no tip needed.',
    placeholderColor: 0x555566,
    patienceDecayMult: { NORMAL: 0.92, HOOLIGAN: 0.95, RICH: 0.90, DRUNK: 1.0 },
    coinBoostMult: 1.0,
    tipCost: 0,
  },
}

export const ENTERTAINER_IDS: Exclude<EntertainerId, 'jukebox'>[] = ['jinx', 'roland', 'melody']

// Default return likelihood for new saves (0–1)
export const DEFAULT_RETURN_LIKELIHOOD = 0.7

// Return likelihood adjustments after each appearance
export const TIP_BONUS = 0.08       // tipped → more likely to return
export const NO_TIP_PENALTY = 0.15  // ignored → less likely to return
export const MIN_LIKELIHOOD = 0.10
export const MAX_LIKELIHOOD = 0.95

// Stage position — left-center of floor, away from tables and doorway
export const STAGE_POSITION = { x: 187, y: 500 } as const
