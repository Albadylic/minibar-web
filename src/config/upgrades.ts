// MBW-39: Upgrade configs for 5 MVP upgrades

export interface UpgradeEffect {
  type:
    | 'patience_multiplier'
    | 'extra_capacity'
    | 'tip_jar'
    | 'bouncer'              // MBW-88: auto-resolves brawls (value = response time seconds)
    | 'prestige'             // MBW-104: attracts rich clientele (value = prestige points)
    | 'reduce_hooligan_spawn'// MBW-103: multiplies hooligan weight on Game Days (value = multiplier)
    | 'cleaner'              // MBW-101: autonomous mess cleaner NPC (value = cleaner speed px/s)
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
  category: 'seating' | 'ambience' | 'service' | 'staff' | 'environment'
  maxTier: number
  tiers: UpgradeTier[]
  // Visual placement in bar canvas (for MBW-42)
  visualPlacement: { x: number; y: number }
  placeholderColor: number
}

// MBW-39/135: 5 MVP upgrades, each with 2–3 tiers
export const UPGRADES: UpgradeConfig[] = [
  {
    id: 'better_seating',
    name: 'Better Seating',
    category: 'seating',
    maxTier: 3,
    tiers: [
      {
        cost: 150,
        effects: [{ type: 'patience_multiplier', value: 1.25 }],
        description: 'Comfortable chairs. Customers wait 25% longer.',
      },
      {
        cost: 300,
        effects: [{ type: 'patience_multiplier', value: 1.35 }],
        description: 'Cushioned seats. Customers wait an additional 35% longer.',
      },
      {
        cost: 550,
        effects: [{ type: 'patience_multiplier', value: 1.5 }],
        description: 'Plush banquettes. Customers linger 50% longer — the finest in town.',
      },
    ],
    visualPlacement: { x: 95, y: 300 },
    placeholderColor: 0x8b6331,
  },
  {
    id: 'extra_seating',
    name: 'Extra Seating',
    category: 'seating',
    maxTier: 2,
    tiers: [
      {
        cost: 200,
        effects: [{ type: 'extra_capacity', value: 2 }],
        description: 'Add 2 more seats to serve more customers at once.',
      },
      {
        cost: 400,
        effects: [{ type: 'extra_capacity', value: 4 }],
        description: 'Add 4 more seats — a significant capacity boost.',
      },
    ],
    visualPlacement: { x: 280, y: 475 },
    placeholderColor: 0x6b4f2a,
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    category: 'ambience',
    maxTier: 2,
    tiers: [
      {
        cost: 120,
        effects: [{ type: 'patience_multiplier', value: 1.15 }],
        description: 'A warm hearth keeps spirits high. Customers wait 15% longer.',
      },
      {
        cost: 250,
        effects: [{ type: 'patience_multiplier', value: 1.25 }],
        description: 'A roaring fire. Customers are thoroughly comfortable — 25% longer.',
      },
    ],
    visualPlacement: { x: 340, y: 400 },
    placeholderColor: 0xcc4400,
  },
  {
    id: 'candles',
    name: 'Décor — Candles',
    category: 'ambience',
    maxTier: 2,
    tiers: [
      {
        cost: 80,
        effects: [{ type: 'patience_multiplier', value: 1.1 }],
        description: 'Candlelit atmosphere. Customers wait 10% longer.',
      },
      {
        cost: 180,
        effects: [{ type: 'patience_multiplier', value: 1.2 }],
        description: 'Ornate candelabras. The ambience draws people in — 20% longer.',
      },
    ],
    visualPlacement: { x: 187, y: 350 },
    placeholderColor: 0xffd700,
  },
  {
    id: 'tip_jar',
    name: 'Tip Jar',
    category: 'service',
    maxTier: 2,
    tiers: [
      {
        cost: 100,
        effects: [{ type: 'tip_jar', value: 2 }],
        description: 'Fast serves earn +2 bonus coins as a tip.',
      },
      {
        cost: 220,
        effects: [{ type: 'tip_jar', value: 4 }],
        description: 'A polished silver jar. Fast serves earn +4 bonus coins.',
      },
    ],
    visualPlacement: { x: 187, y: 90 },
    placeholderColor: 0xc0c0c0,
  },
]

// MBW-88/89: Bouncer upgrade — auto-responds to brawls
// Tier 1: single brawl, 7s response. Tier 2: multiple brawls, 4s response.
const BOUNCER_UPGRADE: UpgradeConfig = {
  id: 'bouncer',
  name: 'Bouncer',
  category: 'staff',
  maxTier: 2,
  tiers: [
    {
      cost: 250,
      effects: [{ type: 'bouncer', value: 7 }], // value = response time seconds
      description: 'A bouncer handles one brawl at a time. Response: 7s.',
    },
    {
      cost: 500,
      effects: [{ type: 'bouncer', value: 4 }], // faster, multiple brawls
      description: 'Security team handles multiple brawls simultaneously. Response: 4s.',
    },
  ],
  visualPlacement: { x: 30, y: 630 },
  placeholderColor: 0x334455,
}

// MBW-101: Cleaner upgrade — autonomous mess-clearing NPC
const CLEANER_UPGRADE: UpgradeConfig = {
  id: 'cleaner',
  name: 'Cleaner',
  category: 'staff',
  maxTier: 1,
  tiers: [
    {
      cost: 180,
      effects: [{ type: 'cleaner', value: 80 }], // value = speed px/s
      description: 'A cleaner roams the bar and wipes up messes automatically.',
    },
  ],
  visualPlacement: { x: 345, y: 630 },
  placeholderColor: 0x446655,
}

// MBW-103: No Team Colours — reduces hooligan spawns on Game Days
const NO_TEAM_COLOURS_UPGRADE: UpgradeConfig = {
  id: 'no_team_colours',
  name: "No Team Colours",
  category: 'environment',
  maxTier: 1,
  tiers: [
    {
      cost: 180,
      effects: [{ type: 'reduce_hooligan_spawn', value: 0.5 }],
      description: 'A firmly-worded sign. Halves hooligan spawns on Game Days.',
    },
  ],
  visualPlacement: { x: 50, y: 220 },
  placeholderColor: 0x334422,
}

// MBW-104: Décor upgrades — attract rich clientele (prestige points)
const TAPESTRIES_UPGRADE: UpgradeConfig = {
  id: 'tapestries',
  name: 'Tapestries',
  category: 'environment',
  maxTier: 1,
  tiers: [
    {
      cost: 150,
      effects: [{ type: 'prestige', value: 1 }],
      description: 'Fine wall hangings add prestige. Attracts wealthier patrons.',
    },
  ],
  visualPlacement: { x: 187, y: 220 },
  placeholderColor: 0x6633aa,
}

const CHANDELIER_UPGRADE: UpgradeConfig = {
  id: 'chandelier',
  name: 'Chandelier',
  category: 'environment',
  maxTier: 1,
  tiers: [
    {
      cost: 250,
      effects: [{ type: 'prestige', value: 2 }],
      description: 'A grand chandelier. Significantly boosts rich customer appeal.',
    },
  ],
  visualPlacement: { x: 187, y: 280 },
  placeholderColor: 0xddcc44,
}

const FINE_TABLES_UPGRADE: UpgradeConfig = {
  id: 'fine_tables',
  name: 'Fine Tables',
  category: 'environment',
  maxTier: 1,
  tiers: [
    {
      cost: 350,
      effects: [{ type: 'prestige', value: 3 }],
      description: 'Oak tables with linen. Wealthy guests seek you out.',
    },
  ],
  visualPlacement: { x: 325, y: 220 },
  placeholderColor: 0x7a5c2a,
}

UPGRADES.push(
  BOUNCER_UPGRADE,
  CLEANER_UPGRADE,
  NO_TEAM_COLOURS_UPGRADE,
  TAPESTRIES_UPGRADE,
  CHANDELIER_UPGRADE,
  FINE_TABLES_UPGRADE,
)

export const UPGRADES_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]))
