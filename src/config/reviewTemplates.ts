// MBW-NEW: Review text templates — Yelp-style snippets for featured reviews.
// {drink} is replaced with the customer's actual drink order.

import type { ReviewTrigger } from '../types/review'

// Templates for anonymous customers keyed by trigger
export const ANON_REVIEW_TEMPLATES: Record<ReviewTrigger, string[]> = {
  SERVED_FAST: [
    "Fastest {drink} I've ever had. Barely sat down!",
    "The barkeep had my {drink} ready before I finished asking.",
    "In and out with a fine {drink}. Excellent service.",
    "Did not expect to be served so promptly. Pleasantly surprised.",
  ],
  SERVED_NORMAL: [
    "Good {drink}, reasonable wait. Can't complain.",
    "Solid evening. The {drink} arrived in good time.",
    "Nothing remarkable but perfectly satisfactory. Four stars.",
    "The {drink} was worth the short wait.",
  ],
  SERVED_SLOW: [
    "The {drink} was fine in the end, but I nearly gave up waiting.",
    "It was fine, eventually. Three stars.",
    "Decent enough {drink} but the wait tested my patience.",
  ],
  UNSERVED: [
    "Waited ages. Nobody even looked at me.",
    "Sat there until I gave up. The place was chaos.",
    "Walked out. Couldn't get anyone's attention.",
    "I came for a {drink} and left with nothing.",
    "Arrived thirsty, left thirstier. One star.",
  ],
  WRONG_DRINK: [
    "I ordered a {drink}. That is not what arrived.",
    "The drink that arrived was not the drink I ordered.",
    "Wrong order, no apology. Two stars.",
    "Got someone else's drink. They at least apologised.",
  ],
  BRAWL_VICTIM: [
    "There was a brawl. My {drink} ended up on the floor.",
    "Some hooligan knocked over my table. Never again.",
    "I came for a quiet {drink} and left with a bruised shoulder.",
    "The fight was settled eventually but the damage was done.",
  ],
}

// Named NPC pool — random names given to ~10% of anon reviews for flavour
export const NAMED_NPC_POOL = [
  'Aldric the Wanderer',
  'Cedric of the South Road',
  'Helewise the Dyer',
  'Thorvald Ironhand',
  'Mabel of Ashford',
  'Godwin the Wheelwright',
  'Prudence the Herbalist',
  'Ulf Greymane',
  'Sybil the Laundress',
  'Leofwin the Carter',
  'Beatrix of the Mill',
  'Osric Longbeard',
  'Avice the Travelling Merchant',
  'Reinald the Cooper',
]

// Regular-specific templates keyed by regularId
export const REGULAR_REVIEW_TEMPLATES: Record<
  string,
  { positive: string[]; negative: string[] }
> = {
  bjorn_blacksmith: {
    positive: [
      "Another fine evening at the tavern. My usual {drink} was perfect.",
      "Good service as always. I'll keep coming back.",
      "The {drink} was exactly right. This is my local and it shows.",
    ],
    negative: [
      "Disappointed tonight. I expect better from my local.",
      "The place was a mess and the service slow. I've seen worse, but not here.",
      "My {drink} took far too long. Sort it out.",
    ],
  },
  greta_farmer: {
    positive: [
      "Nothing beats a cold {drink} after a day in the fields!",
      "Lovely atmosphere tonight. The {drink} was just what I needed.",
      "Quick service, good pour. Back on my feet for the morning shift.",
    ],
    negative: [
      "Waited too long for a simple {drink}. I've got crops to tend!",
      "There was a fight and nobody did anything about it. Shocking.",
      "Place was dirty and service was slow. Not up to scratch.",
    ],
  },
  aldric_priest: {
    positive: [
      "A peaceful evening and a fine {drink}. Blessings upon this establishment.",
      "The tavern was clean and the service swift. Well done.",
      "I rarely visit establishments such as this, but tonight's {drink} was commendable.",
    ],
    negative: [
      "I pray for patience, but even mine has limits. A dreadful wait.",
      "Violence in a place of gathering? I shall not return soon.",
      "The {drink} arrived eventually but the chaos beforehand was unbecoming.",
    ],
  },
  oswin_merchant: {
    positive: [
      "Efficient service. I respect a well-run establishment.",
      "The {drink} was excellent. Worth every coin.",
      "In and out promptly. This is how a business should be run.",
    ],
    negative: [
      "I don't pay good coin for substandard service.",
      "Filthy tables, wrong order. I expected far better at these prices.",
      "The wait was unreasonable. I shall be reviewing my patronage.",
    ],
  },
}

// Pick a random template for a given regular and sentiment
export function getRegularReviewText(
  regularId: string,
  positive: boolean,
  drinkId: string,
): string {
  const templates = REGULAR_REVIEW_TEMPLATES[regularId]
  if (!templates) return ''
  const pool = positive ? templates.positive : templates.negative
  const template = pool[Math.floor(Math.random() * pool.length)] ?? ''
  return template.replace('{drink}', drinkId)
}

// Pick a random template for an anonymous customer
export function getAnonReviewText(trigger: ReviewTrigger, drinkId: string): string {
  const pool = ANON_REVIEW_TEMPLATES[trigger]
  const template = pool[Math.floor(Math.random() * pool.length)] ?? ''
  return template.replace('{drink}', drinkId)
}
