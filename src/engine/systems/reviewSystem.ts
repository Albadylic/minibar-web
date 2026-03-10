// MBW-60: Tag-based review selection — derives performance tags from DayResult,
// filters the review bank, and picks one message at random.
import type { DayResult, ReviewTag, ReviewEntry } from '../../types/review'
import { REVIEWS } from '../../config/reviews'

function getTagsForResult(result: DayResult): ReviewTag[] {
  const tags: ReviewTag[] = ['generic']

  if (result.customersServed >= 10) tags.push('busy_day')
  if (result.customersServed < 5) tags.push('quiet_day')
  // Fast service: served a reasonable number with no wrong drink penalties
  if (result.wrongDrinks === 0 && result.customersServed >= 6) tags.push('fast_service')
  if (result.customersServed < 4) tags.push('slow_service')
  if (result.wrongDrinks > 0) tags.push('wrong_drinks')
  if (result.starRatingDelta > 0.1) tags.push('improving')
  if (result.starRatingDelta < -0.2) tags.push('declining')

  return tags
}

export function selectReview(result: DayResult): ReviewEntry {
  const tags = getTagsForResult(result)
  const { finalRating } = result

  // Reviews that match the current game star rating range and share at least one tag
  const eligible = REVIEWS.filter(
    (r) =>
      finalRating >= r.ratingRange.min &&
      finalRating <= r.ratingRange.max &&
      r.tags.some((t) => tags.includes(t)),
  )

  // Fallback to generic reviews if nothing specific matches
  const pool =
    eligible.length > 0
      ? eligible
      : REVIEWS.filter((r) => r.tags.includes('generic'))

  const entry = pool[Math.floor(Math.random() * pool.length)]!

  // Pick one message from the entry's pool
  const message = entry.messages[Math.floor(Math.random() * entry.messages.length)]!

  return { ...entry, messages: [message] }
}
