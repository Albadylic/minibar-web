// MBW-NEW: Weekly review cycle — replaces old real-time star rating system.
// Reviews are generated per-customer-event and accumulate into weekly reports.

import type { CustomerType } from '../entities/customer'
import type { EventType } from '../types/day'

export type ReviewTrigger =
  | 'SERVED_FAST'       // Patience > 50% remaining
  | 'SERVED_NORMAL'     // Patience 25–50% remaining
  | 'SERVED_SLOW'       // Patience < 25% remaining
  | 'UNSERVED'          // Patience expired, customer left
  | 'WRONG_DRINK'       // Wrong drink served
  | 'BRAWL_VICTIM'      // Caught in a brawl

export interface Review {
  id: string
  day: number             // Day number (absolute, e.g. 8, 9...)
  weekNumber: number      // Which week this belongs to (1, 2, 3...)
  stars: number           // 1–5
  customerType: CustomerType
  customerName?: string   // Set for regulars and named NPCs
  isRegular: boolean
  regularId?: string      // e.g. 'bjorn_blacksmith'
  trigger: ReviewTrigger
  text?: string           // Yelp-style snippet for featured reviews
}

// Snapshot of a completed day — passed to ShopScreen
export interface DayResult {
  dayNumber: number
  customersServed: number
  wrongDrinks: number
  coinsEarned: number
  eventType: EventType | null
  featuredReview: Review | null   // Priority: regular > named NPC > most extreme anon
  reviewCount: number             // Total reviews generated today
}

// Weekly summary entry — stored in weeklyHistory
export interface WeeklyHistoryEntry {
  weekNumber: number
  averageRating: number
  totalReviews: number
  reviewsByStars: [number, number, number, number, number]  // counts for 1★–5★
}
