// Powerup definitions — effects, costs, and display config
import type { PowerupType } from '../types/achievements'

export interface PowerupConfig {
  type: PowerupType
  label: string
  emoji: string
  category: 'pre_day' | 'in_game'
  buyPrice: number      // coins to buy 1 unit from shop
  description: string
}

export const POWERUP_CONFIGS: PowerupConfig[] = [
  {
    type: 'RATINGS_BOOST',
    label: 'Ratings Boost',
    emoji: '⭐',
    category: 'pre_day',
    buyPrice: 50,
    description: 'Increases your displayed rating by 1.0 before the day begins.',
  },
  {
    type: 'DOUBLE_MONEY',
    label: 'Double Money',
    emoji: '💰',
    category: 'pre_day',
    buyPrice: 100,
    description: 'All drinks earn double coins for the entire day.',
  },
  {
    type: 'BOUNCER_RUSH',
    label: 'Bouncer Rush',
    emoji: '👊',
    category: 'in_game',
    buyPrice: 75,
    description: 'Instantly ejects all active brawlers. One use per day.',
  },
  {
    type: 'TIME_FREEZE',
    label: 'Time Freeze',
    emoji: '⏸️',
    category: 'in_game',
    buyPrice: 80,
    description: 'Pauses the day timer for 10 seconds. One use per day.',
  },
  {
    type: 'SERVE_ALL',
    label: 'Serve All',
    emoji: '🍺',
    category: 'in_game',
    buyPrice: 150,
    description: 'Instantly serves every waiting customer their drink. One use per day.',
  },
]

export const POWERUP_CONFIGS_BY_TYPE: Record<PowerupType, PowerupConfig> = Object.fromEntries(
  POWERUP_CONFIGS.map((p) => [p.type, p]),
) as Record<PowerupType, PowerupConfig>

export const IN_GAME_POWERUPS = POWERUP_CONFIGS.filter((p) => p.category === 'in_game').map((p) => p.type)
export const PRE_DAY_POWERUPS = POWERUP_CONFIGS.filter((p) => p.category === 'pre_day').map((p) => p.type)
