// MBW-83: Day event system — selection and per-event config
import type { EventType } from '../types/day'
import type { GameSave } from '../types/game'

// Display and DayConfig modifier config for each event type
export interface EventConfig {
  name: string
  emoji: string
  flavour: string
  tips: string[]
  arrivalMult: number   // multiplied into arrival rates for all phases
  coinMult: number      // sets DayConfig.modifiers.coinMultiplier
  patienceMult: number  // multiplied into patienceMultiplier
  richBoost: number     // added to prestige-derived rich customer weight
}

export const EVENT_CONFIGS: Record<EventType, EventConfig> = {
  GAME_DAY: {
    name: 'Game Day',
    emoji: '⚽',
    flavour: "The local team is playing today. Rowdy fans will fill the bar all day — serve them fast or they'll cause trouble. Even your 'No Team Colours' posters won't keep them out on a match day.",
    tips: [
      'Hooligans arrive early and stay all day',
      "Ignore them and they'll start a brawl — tap them to eject",
      'Watch out for brawls in crowded corners',
      'Security helps — hire a bouncer if you can',
    ],
    arrivalMult: 1.0,
    coinMult: 1.0,
    patienceMult: 1.0,
    richBoost: 0,
  },

  MARKET_DAY: {
    name: 'Market Day',
    emoji: '🛒',
    flavour: 'The town market has drawn traders and travellers from across the region. A busy, profitable day.',
    tips: [
      'More customers than usual — the bar fills up fast',
      'All drinks earn 10% more today',
      'Rich customers appear even without fine décor',
    ],
    arrivalMult: 1.35,
    coinMult: 1.1,
    patienceMult: 1.0,
    richBoost: 0.2,
  },

  NOBLES_VISIT: {
    name: "Noble's Visit",
    emoji: '👑',
    flavour: 'Word has spread — a nobleman is passing through. The wealthy are out in force and expectations are high.',
    tips: [
      'Rich customers dominate — they pay very well',
      'They have short patience and harsh opinions',
      'Wrong drinks cost you dearly — be precise',
      'Tier 3 drinks are in high demand',
    ],
    arrivalMult: 0.85,
    coinMult: 1.5,
    patienceMult: 1.0,
    richBoost: 0.5,
  },

  HARVEST_FESTIVAL: {
    name: 'Harvest Festival',
    emoji: '🌾',
    flavour: "The harvest is in and the whole village is celebrating. Spirits are high — so is the thirst.",
    tips: [
      'Customers are in a good mood — they wait longer',
      'High foot traffic all day long',
      'A great day to maximise earnings',
    ],
    arrivalMult: 1.25,
    coinMult: 1.0,
    patienceMult: 1.25,
    richBoost: 0,
  },

  BARD_NIGHT: {
    name: 'Bard Night',
    emoji: '🎵',
    flavour: 'A travelling bard has set up in the square. The music draws a cheerful, generous crowd.',
    tips: [
      'A steady flow of good-humoured customers',
      'Patience is slightly above normal',
      'Evening and Night are especially lively',
    ],
    arrivalMult: 1.2,
    coinMult: 1.05,
    patienceMult: 1.1,
    richBoost: 0,
  },
}

// Game Day still needs its hooligan weight override — all other events use standard weights
export const GAME_DAY_CONFIG = {
  customerWeights: { normal: 0.55, hooligan: 0.45 },
} as const

// Per-event probability config
// MBW-172: minDay values aligned with gradual complexity unlock schedule
const EVENT_PROBABILITIES: Record<EventType, {
  baseProbability: number
  pityBonusPerDay: number
  minDay: number  // earliest day this event can appear
}> = {
  GAME_DAY:         { baseProbability: 0.15, pityBonusPerDay: 0.10, minDay: 4 }, // forced on Day 3; random from Day 4
  MARKET_DAY:       { baseProbability: 0.12, pityBonusPerDay: 0.08, minDay: 8 },
  NOBLES_VISIT:     { baseProbability: 0.08, pityBonusPerDay: 0.06, minDay: 15 },
  HARVEST_FESTIVAL: { baseProbability: 0.12, pityBonusPerDay: 0.09, minDay: 10 },
  BARD_NIGHT:       { baseProbability: 0.12, pityBonusPerDay: 0.08, minDay: 5 },
}

// MBW-83: Roll which event (if any) fires on the next day.
// Multiple events can pass their individual rolls; one is chosen at random.
// daysSinceLastGameDay acts as a shared pity timer across all event types.
export function rollNextDayEvent(save: GameSave): EventType | null {
  // MBW-172: Day 3 is always a Game Day — introduces brawl mechanic to the player
  if (save.dayNumber === 3) return 'GAME_DAY'

  const eventTypes = Object.keys(EVENT_PROBABILITIES) as EventType[]

  const fired: EventType[] = []
  for (const eventType of eventTypes) {
    const probs = EVENT_PROBABILITIES[eventType]
    if (save.dayNumber < probs.minDay) continue

    const probability = Math.min(
      probs.baseProbability + save.daysSinceLastGameDay * probs.pityBonusPerDay,
      0.80,
    )
    if (Math.random() < probability) {
      fired.push(eventType)
    }
  }

  if (fired.length === 0) return null
  return fired[Math.floor(Math.random() * fired.length)]!
}
