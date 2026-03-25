// Achievements & Powerups — shared type definitions

export type PowerupType =
  | 'RATINGS_BOOST'
  | 'DOUBLE_MONEY'
  | 'BOUNCER_RUSH'
  | 'TIME_FREEZE'
  | 'SERVE_ALL'

export type AchievementTier = 'bronze' | 'silver' | 'gold'

export type AchievementCategory =
  | 'serving'
  | 'customers'
  | 'economy'
  | 'brawls'
  | 'survival'
  | 'staff'
  | 'entertainment'
  | 'cleaning'
  | 'misc'

export interface AchievementReward {
  coins?: number
  powerupUnlock?: PowerupType
  powerupGrant?: { type: PowerupType; quantity: number }
  decoration?: string
}

export type StatKey =
  | 'totalDrinksServed'
  | 'totalCustomersServed'
  | 'totalCoinsEarned'
  | 'totalBrawls'
  | 'totalMessesCleaned'
  | 'totalDrunksEscorted'
  | 'totalEntertainersHosted'
  | 'totalGenerousTips'
  | 'totalRichServed'
  | 'totalDaysPlayed'

export type StateCheck =
  | 'firstUpgradeBought'
  | 'firstStaffHired'
  | 'allStaffHired'
  | 'allStaffMaxed'
  | 'anyUpgradeMaxed'
  | 'allUpgradesMaxed'
  | 'allEntertainersSeen'
  | 'fullHouse'
  | 'brawl1Resolved'
  | 'brawlNoCasualties'
  | 'perfectDay'
  | 'drinkVariety'
  | 'bigDay'
  | 'cleanDay'
  | 'cleaner20'
  | 'gameDayNoBrawls'
  | 'kingsTrayFilled'
  | 'hooliganPosterBought'
  | 'ratingRecovery'
  | 'consecutivePerfectWeeks2'
  | 'consecutivePerfectWeeks3'

export type AchievementCondition =
  | { type: 'cumulative'; stat: StatKey; target: number }
  | { type: 'day_milestone'; target: number }
  | { type: 'state'; check: StateCheck }

export interface AchievementConfig {
  id: string
  name: string
  description: string
  category: AchievementCategory
  tier: AchievementTier
  condition: AchievementCondition
  reward: AchievementReward
  hidden: boolean
}

export interface CompletedAchievement {
  id: string
  name: string
  tier: AchievementTier
  reward: AchievementReward
}
