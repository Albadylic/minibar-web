// Full achievement catalogue
import type { AchievementConfig } from '../types/achievements'

export const ACHIEVEMENTS: AchievementConfig[] = [
  // ─── Serving ────────────────────────────────────────────────────────────────
  {
    id: 'SERVE_10', name: 'First Round', description: 'Serve 10 drinks',
    category: 'serving', tier: 'bronze', hidden: false,
    condition: { type: 'cumulative', stat: 'totalDrinksServed', target: 10 },
    reward: { coins: 50 },
  },
  {
    id: 'SERVE_25', name: 'Getting Busy', description: 'Serve 25 drinks',
    category: 'serving', tier: 'bronze', hidden: false,
    condition: { type: 'cumulative', stat: 'totalDrinksServed', target: 25 },
    reward: { coins: 75 },
  },
  {
    id: 'SERVE_50', name: 'Seasoned Barkeep', description: 'Serve 50 drinks',
    category: 'serving', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalDrinksServed', target: 50 },
    reward: { powerupGrant: { type: 'TIME_FREEZE', quantity: 3 } },
  },
  {
    id: 'SERVE_100', name: 'Centurion', description: 'Serve 100 drinks',
    category: 'serving', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalDrinksServed', target: 100 },
    reward: { powerupGrant: { type: 'SERVE_ALL', quantity: 3 } },
  },
  {
    id: 'SERVE_250', name: 'Master Barkeep', description: 'Serve 250 drinks',
    category: 'serving', tier: 'gold', hidden: false,
    condition: { type: 'cumulative', stat: 'totalDrinksServed', target: 250 },
    reward: { decoration: 'golden_tankard', powerupGrant: { type: 'SERVE_ALL', quantity: 5 } },
  },
  {
    id: 'SPEED_5', name: 'Quick Pour', description: 'Serve 5 drinks with >75% patience remaining in one day',
    category: 'serving', tier: 'bronze', hidden: false,
    condition: { type: 'state', check: 'drinkVariety' }, // overridden: handled as single-day dayFastServes >= 5
    reward: { coins: 75 },
  },
  {
    id: 'SPEED_10', name: 'Lightning Hands', description: 'Serve 10 drinks with >75% patience remaining in one day',
    category: 'serving', tier: 'silver', hidden: false,
    condition: { type: 'state', check: 'drinkVariety' }, // overridden: dayFastServes >= 10
    reward: { powerupGrant: { type: 'TIME_FREEZE', quantity: 3 } },
  },
  {
    id: 'PERFECT_DAY', name: 'Flawless Service', description: 'Complete a day with no wrong drinks and no unserved customers',
    category: 'serving', tier: 'silver', hidden: false,
    condition: { type: 'state', check: 'perfectDay' },
    reward: { powerupGrant: { type: 'DOUBLE_MONEY', quantity: 3 } },
  },
  {
    id: 'DRINK_VARIETY', name: 'Full Menu', description: 'Serve every unlocked drink at least once in a single day',
    category: 'serving', tier: 'bronze', hidden: false,
    condition: { type: 'state', check: 'drinkVariety' },
    reward: { coins: 50 },
  },

  // ─── Customers ──────────────────────────────────────────────────────────────
  {
    id: 'CUST_10', name: 'Open For Business', description: 'Serve 10 customers',
    category: 'customers', tier: 'bronze', hidden: false,
    condition: { type: 'cumulative', stat: 'totalCustomersServed', target: 10 },
    reward: { coins: 50 },
  },
  {
    id: 'CUST_50', name: 'Popular Spot', description: 'Serve 50 customers',
    category: 'customers', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalCustomersServed', target: 50 },
    reward: { powerupGrant: { type: 'DOUBLE_MONEY', quantity: 3 } },
  },
  {
    id: 'CUST_100', name: 'Local Favourite', description: 'Serve 100 customers',
    category: 'customers', tier: 'gold', hidden: false,
    condition: { type: 'cumulative', stat: 'totalCustomersServed', target: 100 },
    reward: { decoration: 'framed_review', powerupUnlock: 'SERVE_ALL', powerupGrant: { type: 'SERVE_ALL', quantity: 3 } },
  },
  {
    id: 'RICH_5', name: 'Distinguished Guests', description: 'Serve 5 rich clientele',
    category: 'customers', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalRichServed', target: 5 },
    reward: { powerupGrant: { type: 'RATINGS_BOOST', quantity: 3 } },
  },
  {
    id: 'RICH_20', name: 'High Society', description: 'Serve 20 rich clientele',
    category: 'customers', tier: 'gold', hidden: false,
    condition: { type: 'cumulative', stat: 'totalRichServed', target: 20 },
    reward: { decoration: 'chandelier_trophy', powerupGrant: { type: 'RATINGS_BOOST', quantity: 5 } },
  },
  {
    id: 'FULL_HOUSE', name: 'Standing Room Only', description: 'Have all available seats occupied simultaneously',
    category: 'customers', tier: 'bronze', hidden: false,
    condition: { type: 'state', check: 'fullHouse' },
    reward: { coins: 100 },
  },

  // ─── Economy ────────────────────────────────────────────────────────────────
  {
    id: 'COINS_100', name: 'First Savings', description: 'Earn 100 coins total',
    category: 'economy', tier: 'bronze', hidden: false,
    condition: { type: 'cumulative', stat: 'totalCoinsEarned', target: 100 },
    reward: { powerupUnlock: 'DOUBLE_MONEY', powerupGrant: { type: 'DOUBLE_MONEY', quantity: 1 } },
  },
  {
    id: 'COINS_500', name: 'War Chest', description: 'Earn 500 coins total',
    category: 'economy', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalCoinsEarned', target: 500 },
    reward: { powerupGrant: { type: 'DOUBLE_MONEY', quantity: 3 } },
  },
  {
    id: 'COINS_1000', name: 'Moneybags', description: 'Earn 1000 coins total',
    category: 'economy', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalCoinsEarned', target: 1000 },
    reward: { powerupGrant: { type: 'DOUBLE_MONEY', quantity: 5 } },
  },
  {
    id: 'COINS_5000', name: 'Tavern Tycoon', description: 'Earn 5000 coins total',
    category: 'economy', tier: 'gold', hidden: false,
    condition: { type: 'cumulative', stat: 'totalCoinsEarned', target: 5000 },
    reward: { decoration: 'gold_coin_stack', coins: 200 },
  },
  {
    id: 'BIG_DAY', name: 'Payday', description: 'Earn 200+ coins in a single day',
    category: 'economy', tier: 'silver', hidden: false,
    condition: { type: 'state', check: 'bigDay' },
    reward: { powerupGrant: { type: 'TIME_FREEZE', quantity: 3 } },
  },

  // ─── Brawls ─────────────────────────────────────────────────────────────────
  {
    id: 'BRAWL_1', name: 'Bouncer', description: 'Resolve your first brawl',
    category: 'brawls', tier: 'bronze', hidden: false,
    condition: { type: 'state', check: 'brawl1Resolved' },
    reward: { powerupUnlock: 'BOUNCER_RUSH', powerupGrant: { type: 'BOUNCER_RUSH', quantity: 1 } },
  },
  {
    id: 'BRAWL_5', name: 'Peacekeeper', description: 'Resolve 5 brawls',
    category: 'brawls', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalBrawls', target: 5 },
    reward: { powerupGrant: { type: 'BOUNCER_RUSH', quantity: 3 } },
  },
  {
    id: 'BRAWL_10', name: 'Ironfist', description: 'Resolve 10 brawls',
    category: 'brawls', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalBrawls', target: 10 },
    reward: { powerupGrant: { type: 'BOUNCER_RUSH', quantity: 5 } },
  },
  {
    id: 'BRAWL_25', name: 'Legend of Order', description: 'Resolve 25 brawls',
    category: 'brawls', tier: 'gold', hidden: false,
    condition: { type: 'cumulative', stat: 'totalBrawls', target: 25 },
    reward: { decoration: 'shield_plaque', powerupGrant: { type: 'BOUNCER_RUSH', quantity: 5 } },
  },
  {
    id: 'BRAWL_CLEAN', name: 'No Casualties', description: 'Eject a brawler before they reach another seat',
    category: 'brawls', tier: 'gold', hidden: true,
    condition: { type: 'state', check: 'brawlNoCasualties' },
    reward: { coins: 150, powerupGrant: { type: 'BOUNCER_RUSH', quantity: 3 } },
  },
  {
    id: 'GAMEDAY_CLEAN', name: 'Peaceful Match Day', description: 'Survive a Game Day with zero brawls',
    category: 'brawls', tier: 'gold', hidden: true,
    condition: { type: 'state', check: 'gameDayNoBrawls' },
    reward: { coins: 200 },
  },

  // ─── Survival ───────────────────────────────────────────────────────────────
  {
    id: 'DAY_5', name: 'First Week', description: 'Reach Day 5',
    category: 'survival', tier: 'bronze', hidden: false,
    condition: { type: 'day_milestone', target: 5 },
    reward: { powerupUnlock: 'RATINGS_BOOST', powerupGrant: { type: 'RATINGS_BOOST', quantity: 1 } },
  },
  {
    id: 'DAY_10', name: 'Established', description: 'Reach Day 10',
    category: 'survival', tier: 'silver', hidden: false,
    condition: { type: 'day_milestone', target: 10 },
    reward: { powerupUnlock: 'TIME_FREEZE', powerupGrant: { type: 'TIME_FREEZE', quantity: 1 } },
  },
  {
    id: 'DAY_15', name: 'Veteran', description: 'Reach Day 15',
    category: 'survival', tier: 'silver', hidden: false,
    condition: { type: 'day_milestone', target: 15 },
    reward: { powerupGrant: { type: 'TIME_FREEZE', quantity: 3 } },
  },
  {
    id: 'DAY_25', name: 'Old Hand', description: 'Reach Day 25',
    category: 'survival', tier: 'gold', hidden: false,
    condition: { type: 'day_milestone', target: 25 },
    reward: { decoration: 'tavern_flag', powerupGrant: { type: 'TIME_FREEZE', quantity: 5 } },
  },
  {
    id: 'DAY_40', name: 'Institution', description: 'Reach Day 40',
    category: 'survival', tier: 'gold', hidden: false,
    condition: { type: 'day_milestone', target: 40 },
    reward: { decoration: 'royal_warrant', coins: 500 },
  },
  {
    id: 'RATING_5_WEEKS_2', name: 'Consistent Excellence', description: 'Achieve 4.5+ weekly rating for 2 consecutive weeks',
    category: 'survival', tier: 'silver', hidden: false,
    condition: { type: 'state', check: 'consecutivePerfectWeeks2' },
    reward: { powerupGrant: { type: 'RATINGS_BOOST', quantity: 3 } },
  },
  {
    id: 'RATING_5_WEEKS_3', name: 'Perfectionist', description: 'Achieve 4.5+ weekly rating for 3 consecutive weeks',
    category: 'survival', tier: 'gold', hidden: false,
    condition: { type: 'state', check: 'consecutivePerfectWeeks3' },
    reward: { decoration: 'star_trophy', powerupGrant: { type: 'RATINGS_BOOST', quantity: 5 } },
  },
  {
    id: 'RATING_RECOVERY', name: 'Comeback King', description: 'Recover from below 2.5 stars to above 4.0',
    category: 'survival', tier: 'silver', hidden: true,
    condition: { type: 'state', check: 'ratingRecovery' },
    reward: { powerupGrant: { type: 'RATINGS_BOOST', quantity: 3 } },
  },

  // ─── Staff & Upgrades ───────────────────────────────────────────────────────
  {
    id: 'FIRST_UPGRADE', name: 'Home Improvement', description: 'Buy your first upgrade',
    category: 'staff', tier: 'bronze', hidden: false,
    condition: { type: 'state', check: 'firstUpgradeBought' },
    reward: { coins: 50 },
  },
  {
    id: 'FIRST_HIRE', name: 'Help Wanted', description: 'Hire your first staff member',
    category: 'staff', tier: 'bronze', hidden: false,
    condition: { type: 'state', check: 'firstStaffHired' },
    reward: { coins: 75 },
  },
  {
    id: 'MAX_UPGRADE', name: 'Master Craftsman', description: 'Max out any upgrade to Tier 3',
    category: 'staff', tier: 'silver', hidden: false,
    condition: { type: 'state', check: 'anyUpgradeMaxed' },
    reward: { powerupGrant: { type: 'DOUBLE_MONEY', quantity: 3 } },
  },
  {
    id: 'ALL_STAFF', name: 'Full Team', description: 'Hire all 4 staff members',
    category: 'staff', tier: 'silver', hidden: false,
    condition: { type: 'state', check: 'allStaffHired' },
    reward: { powerupGrant: { type: 'TIME_FREEZE', quantity: 5 } },
  },
  {
    id: 'MAX_STAFF', name: 'Elite Squad', description: 'Max out all staff to Level 3',
    category: 'staff', tier: 'gold', hidden: false,
    condition: { type: 'state', check: 'allStaffMaxed' },
    reward: { decoration: 'staff_portrait', coins: 300 },
  },
  {
    id: 'ALL_UPGRADES', name: 'Fully Furnished', description: 'Own every upgrade at max tier',
    category: 'staff', tier: 'gold', hidden: false,
    condition: { type: 'state', check: 'allUpgradesMaxed' },
    reward: { decoration: 'master_key', coins: 500 },
  },

  // ─── Entertainment ──────────────────────────────────────────────────────────
  {
    id: 'ENTERTAIN_1', name: 'Opening Night', description: 'Host your first entertainer',
    category: 'entertainment', tier: 'bronze', hidden: false,
    condition: { type: 'cumulative', stat: 'totalEntertainersHosted', target: 1 },
    reward: { coins: 50 },
  },
  {
    id: 'ENTERTAIN_5', name: 'Regular Entertainment', description: 'Host 5 entertainers',
    category: 'entertainment', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalEntertainersHosted', target: 5 },
    reward: { powerupGrant: { type: 'DOUBLE_MONEY', quantity: 3 } },
  },
  {
    id: 'ENTERTAIN_25', name: 'Showtime', description: 'Host 25 entertainers',
    category: 'entertainment', tier: 'gold', hidden: false,
    condition: { type: 'cumulative', stat: 'totalEntertainersHosted', target: 25 },
    reward: { decoration: 'stage_spotlight', powerupGrant: { type: 'DOUBLE_MONEY', quantity: 5 } },
  },
  {
    id: 'ALL_ENTERTAINERS', name: 'Triple Threat', description: 'See all 3 entertainers perform',
    category: 'entertainment', tier: 'silver', hidden: false,
    condition: { type: 'state', check: 'allEntertainersSeen' },
    reward: { coins: 100 },
  },
  {
    id: 'TIP_GENEROUS_3', name: 'Generous Patron', description: 'Tip an entertainer generously 3 times',
    category: 'entertainment', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalGenerousTips', target: 3 },
    reward: { powerupGrant: { type: 'RATINGS_BOOST', quantity: 3 } },
  },
  {
    id: 'TIP_GENEROUS_10', name: 'Arts Patron', description: 'Tip an entertainer generously 10 times',
    category: 'entertainment', tier: 'gold', hidden: false,
    condition: { type: 'cumulative', stat: 'totalGenerousTips', target: 10 },
    reward: { decoration: 'entertainer_poster', coins: 200 },
  },

  // ─── Cleaning ───────────────────────────────────────────────────────────────
  {
    id: 'CLEAN_25', name: 'Tidy Up', description: 'Clean 25 messes',
    category: 'cleaning', tier: 'bronze', hidden: false,
    condition: { type: 'cumulative', stat: 'totalMessesCleaned', target: 25 },
    reward: { coins: 50 },
  },
  {
    id: 'CLEAN_100', name: 'Spotless Record', description: 'Clean 100 messes',
    category: 'cleaning', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalMessesCleaned', target: 100 },
    reward: { powerupGrant: { type: 'TIME_FREEZE', quantity: 3 } },
  },
  {
    id: 'CLEAN_DAY', name: 'Closing Clean', description: 'End a day with zero messes remaining',
    category: 'cleaning', tier: 'bronze', hidden: false,
    condition: { type: 'state', check: 'cleanDay' },
    reward: { coins: 75 },
  },
  {
    id: 'CLEANER_20', name: 'Delegation', description: 'Have the Cleaner NPC clean 20 messes in a single day',
    category: 'cleaning', tier: 'silver', hidden: false,
    condition: { type: 'state', check: 'cleaner20' },
    reward: { powerupGrant: { type: 'SERVE_ALL', quantity: 3 } },
  },

  // ─── Misc ────────────────────────────────────────────────────────────────────
  {
    id: 'DRUNK_5', name: 'Designated Driver', description: 'Escort 5 drunks out',
    category: 'misc', tier: 'bronze', hidden: false,
    condition: { type: 'cumulative', stat: 'totalDrunksEscorted', target: 5 },
    reward: { coins: 50 },
  },
  {
    id: 'DRUNK_20', name: 'Last Call', description: 'Escort 20 drunks out',
    category: 'misc', tier: 'silver', hidden: false,
    condition: { type: 'cumulative', stat: 'totalDrunksEscorted', target: 20 },
    reward: { powerupGrant: { type: 'BOUNCER_RUSH', quantity: 3 } },
  },
  {
    id: 'KINGS_TRAY', name: 'Royal Approval', description: "Fill the King's Tray on time during a Noble's Visit",
    category: 'misc', tier: 'gold', hidden: true,
    condition: { type: 'state', check: 'kingsTrayFilled' },
    reward: { decoration: 'crown', coins: 200 },
  },
  {
    id: 'HOOLIGAN_POSTER', name: 'Peaceful Protest', description: 'Buy the No Team Colours poster',
    category: 'misc', tier: 'bronze', hidden: false,
    condition: { type: 'state', check: 'hooliganPosterBought' },
    reward: { coins: 75 },
  },
]

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementConfig> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
)

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length
