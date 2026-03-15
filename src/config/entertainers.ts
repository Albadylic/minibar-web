// MBW-113/117/118/119/121/122/168: Entertainer configs and levelling
import type { EntertainerId } from '../entities/entertainer'
import type { CustomerType } from '../entities/customer'

export interface EntertainerConfig {
  id: EntertainerId
  name: string
  description: string       // shown in ShopScreen when they appear
  placeholderColor: number  // circle color until sprite art is ready
  // Per-customer-type patience decay multiplier during performance at level 1 (<1 = patients wait longer)
  patienceDecayMult: Record<CustomerType, number>
  coinBoostMult: number  // multiplied into coin rewards during performance
  baseFee: number        // tip cost at level 1 (0 = jukebox, no tip needed)
  feePerLevel: number    // additional coins per level above 1
  boostPerLevel: number  // per-level improvement to patienceDecayMult (subtracted from base values)
  xpPerPerformance: number // XP earned for performing on a given day
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
    baseFee: 8,
    feePerLevel: 3,
    boostPerLevel: 0.02,
    xpPerPerformance: 10,
  },
  roland: {
    id: 'roland',
    name: 'Roland',
    description: 'Bard. Rich clientele are more patient and generous.',
    placeholderColor: 0x8844cc,
    patienceDecayMult: { NORMAL: 0.90, HOOLIGAN: 0.95, RICH: 0.70, DRUNK: 1.0 },
    coinBoostMult: 1.1,
    baseFee: 10,
    feePerLevel: 3,
    boostPerLevel: 0.02,
    xpPerPerformance: 10,
  },
  melody: {
    id: 'melody',
    name: 'Melody',
    description: 'Musician. A steady boost for everyone.',
    placeholderColor: 0x44aacc,
    patienceDecayMult: { NORMAL: 0.80, HOOLIGAN: 0.82, RICH: 0.85, DRUNK: 1.0 },
    coinBoostMult: 1.05,
    baseFee: 9,
    feePerLevel: 3,
    boostPerLevel: 0.02,
    xpPerPerformance: 10,
  },
  // Fallback when no named entertainer passes their return likelihood roll
  jukebox: {
    id: 'jukebox',
    name: 'Jukebox',
    description: 'Automated music. A small, reliable boost — no tip needed.',
    placeholderColor: 0x555566,
    patienceDecayMult: { NORMAL: 0.92, HOOLIGAN: 0.95, RICH: 0.90, DRUNK: 1.0 },
    coinBoostMult: 1.0,
    baseFee: 0,
    feePerLevel: 0,
    boostPerLevel: 0,
    xpPerPerformance: 0,
  },
}

export const ENTERTAINER_IDS: Exclude<EntertainerId, 'jukebox'>[] = ['jinx', 'roland', 'melody']

// Default return likelihood for new saves (0–1)
export const DEFAULT_RETURN_LIKELIHOOD = 0.7

// MBW-122/168: Return likelihood adjustments per tip choice
export const GENEROUS_TIP_LIKELIHOOD_BONUS = 0.08  // generous → noticeably more likely to return
export const ADEQUATE_TIP_LIKELIHOOD_BONUS = 0.02  // adequate → small boost
export const NO_TIP_PENALTY = 0.10                 // poor/refuse → less likely to return
export const MIN_LIKELIHOOD = 0.10
export const MAX_LIKELIHOOD = 0.95
// Keep TIP_BONUS alias for existing computeUpdatedLikelihood usage
export const TIP_BONUS = GENEROUS_TIP_LIKELIHOOD_BONUS

// MBW-122/168: Hidden levelling XP constants
// Generous = +15 XP, Adequate = +5 XP, Poor/Refuse = +0 XP (on top of base xpPerPerformance)
export const XP_GENEROUS_BONUS = 15
export const XP_ADEQUATE_BONUS = 5
// XP required to reach each level (index = level - 1). Level 1 is default.
export const XP_THRESHOLDS = [0, 20, 50, 100, 180] as const  // levels 1–5

// MBW-122: Compute level from accumulated XP
export function computeNewLevel(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]!) return i + 1
  }
  return 1
}

// MBW-122: Compute current tip fee factoring in level
export function computeEntertainerFee(cfg: EntertainerConfig, level: number): number {
  return cfg.baseFee + (level - 1) * cfg.feePerLevel
}

// MBW-122: Compute level-adjusted patience decay mult for a customer type
export function computeDecayMult(cfg: EntertainerConfig, level: number, customerType: string): number {
  const base = cfg.patienceDecayMult[customerType as keyof typeof cfg.patienceDecayMult] ?? 1.0
  const improvement = (level - 1) * cfg.boostPerLevel
  return Math.max(0.5, base - improvement)
}

// Stage position — left-center of floor, away from tables and doorway
export const STAGE_POSITION = { x: 187, y: 500 } as const
// MBW-120: Where entertainer walks to collect their tip
export const BAR_TIP_POSITION = { x: 187, y: 160 } as const
