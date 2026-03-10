// MBW-39: Upgrade configs for 5 MVP upgrades

export interface UpgradeEffect {
  type: 'patience_multiplier' | 'extra_capacity' | 'tip_jar'
  value: number
}

export interface UpgradeTier {
  cost: number
  effects: UpgradeEffect[]
  description: string
}

export interface UpgradeConfig {
  id: string
  name: string
  category: 'seating' | 'ambience' | 'service'
  maxTier: number
  tiers: UpgradeTier[]
  // Visual placement in bar canvas (for MBW-42)
  visualPlacement: { x: number; y: number }
  placeholderColor: number
}

// MBW-39: 5 MVP upgrades
export const UPGRADES: UpgradeConfig[] = [
  {
    id: 'better_seating',
    name: 'Better Seating',
    category: 'seating',
    maxTier: 1,
    tiers: [
      {
        cost: 30,
        effects: [{ type: 'patience_multiplier', value: 1.25 }],
        description: 'Comfortable chairs keep customers waiting 25% longer.',
      },
    ],
    visualPlacement: { x: 95, y: 300 },
    placeholderColor: 0x8b6331,
  },
  {
    id: 'extra_seating',
    name: 'Extra Seating',
    category: 'seating',
    maxTier: 1,
    tiers: [
      {
        cost: 50,
        effects: [{ type: 'extra_capacity', value: 2 }],
        description: 'Add 2 more seats to serve more customers at once.',
      },
    ],
    visualPlacement: { x: 280, y: 475 },
    placeholderColor: 0x6b4f2a,
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    category: 'ambience',
    maxTier: 1,
    tiers: [
      {
        cost: 40,
        effects: [{ type: 'patience_multiplier', value: 1.15 }],
        description: 'A warm hearth keeps spirits high. Customers wait 15% longer.',
      },
    ],
    visualPlacement: { x: 340, y: 400 },
    placeholderColor: 0xcc4400,
  },
  {
    id: 'candles',
    name: 'Décor — Candles',
    category: 'ambience',
    maxTier: 1,
    tiers: [
      {
        cost: 20,
        effects: [{ type: 'patience_multiplier', value: 1.1 }],
        description: 'Candlelit atmosphere soothes patrons. Customers wait 10% longer.',
      },
    ],
    visualPlacement: { x: 187, y: 350 },
    placeholderColor: 0xffd700,
  },
  {
    id: 'tip_jar',
    name: 'Tip Jar',
    category: 'service',
    maxTier: 1,
    tiers: [
      {
        cost: 25,
        effects: [{ type: 'tip_jar', value: 2 }],
        description: 'Fast serves earn +2 bonus coins as a tip.',
      },
    ],
    visualPlacement: { x: 187, y: 90 },
    placeholderColor: 0xc0c0c0,
  },
]

export const UPGRADES_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]))
