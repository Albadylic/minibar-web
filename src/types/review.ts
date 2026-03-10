// MBW-59/60: Types for the end-of-day review system

export type ReviewTag =
  | 'fast_service'  // many serves, no wrong drinks
  | 'slow_service'  // very few customers served
  | 'wrong_drinks'  // at least one wrong drink served
  | 'busy_day'      // high customer volume
  | 'quiet_day'     // low customer volume
  | 'improving'     // star rating went up
  | 'declining'     // star rating fell significantly
  | 'generic'       // always eligible — used as fallback

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
}
