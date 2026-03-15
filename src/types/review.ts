// MBW-59/60: Types for the end-of-day review system
// MBW-112: Event-specific tags added

export type ReviewTag =
  | 'fast_service'      // many serves, no wrong drinks
  | 'slow_service'      // very few customers served
  | 'wrong_drinks'      // at least one wrong drink served
  | 'busy_day'          // high customer volume
  | 'quiet_day'         // low customer volume
  | 'improving'         // star rating went up
  | 'declining'         // star rating fell significantly
  | 'generic'           // always eligible — used as fallback
  | 'game_day'          // MBW-112: Game Day event
  | 'market_day'        // MBW-112: Market Day event
  | 'kings_visit'       // MBW-112: Noble's Visit event
  | 'harvest_festival'  // MBW-112: Harvest Festival event
  | 'bard_night'        // MBW-112: Bard Night event

export interface ReviewEntry {
  name: string
  reviewStars: number
  tags: ReviewTag[]
  ratingRange: { min: number; max: number }
  messages: string[]
}

// Snapshot of a completed day — passed to the review system and stored between screens
export interface DayResult {
  dayNumber: number
  customersServed: number
  wrongDrinks: number
  coinsEarned: number
  starRatingDelta: number
  finalRating: number
  eventType: import('../types/day').EventType | null  // MBW-112: event that ran this day
}
