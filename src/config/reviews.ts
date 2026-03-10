// MBW-59: End-of-day review message bank — medieval Yelp-style customer reviews.
// Each entry has tags that match day performance and a ratingRange for the current
// game star rating. At least 2 message variants per entry for variety.

import type { ReviewEntry } from '../types/review'

export const REVIEWS: ReviewEntry[] = [
  // ── Fast service, busy day, high rating ───────────────────────────────────
  {
    name: 'Aldric the Merchant',
    reviewStars: 5,
    tags: ['fast_service', 'busy_day'],
    ratingRange: { min: 3.5, max: 5.0 },
    messages: [
      "Fastest service I've seen this side of the river. My tankard was full before I'd even taken my cloak off. Five stars, no question.",
      "Every market week I pass through this town and every time this place earns my coin. Quick hands, full cups, cheerful enough. What more do you want?",
    ],
  },
  {
    name: 'Eadgyth of Ashford',
    reviewStars: 5,
    tags: ['fast_service'],
    ratingRange: { min: 4.0, max: 5.0 },
    messages: [
      "I barely touched my stool before a drink appeared. My husband says I exaggerate but I do not. Remarkable.",
      "This is how a tavern ought to be run. Alert, efficient, no fuss. They even got my order right on the first attempt — a minor miracle in this trade.",
    ],
  },
  {
    name: 'Beatrix the Weaver',
    reviewStars: 5,
    tags: ['fast_service', 'improving'],
    ratingRange: { min: 3.5, max: 5.0 },
    messages: [
      "The barkeep seemed to know what I wanted before I'd opened my mouth. Some folk are born for this work.",
      "Came in tired and left refreshed. The service was so swift I nearly forgot I had a journey ahead. Well done.",
    ],
  },

  // ── Busy day, managed well ─────────────────────────────────────────────────
  {
    name: 'Thaddeus the Smith',
    reviewStars: 4,
    tags: ['busy_day'],
    ratingRange: { min: 3.0, max: 5.0 },
    messages: [
      "Absolutely heaving in there on a market night. Couldn't find a stool. And yet somehow they kept up. Respect for that.",
      "Half the guild came in after the forge shut. Bar was rammed. Still got my ale in good time. That's no small feat.",
    ],
  },
  {
    name: 'Mildred of the Mill',
    reviewStars: 4,
    tags: ['busy_day'],
    ratingRange: { min: 2.5, max: 5.0 },
    messages: [
      "Half the town in for a drink tonight and they mostly kept up. A few waits here and there but nothing unreasonable.",
      "Busy, noisy, warm — all the signs of a decent tavern. You'll wait a moment but the pour is generous when it comes.",
    ],
  },

  // ── Wrong drinks ───────────────────────────────────────────────────────────
  {
    name: 'Godfrey the Guard',
    reviewStars: 2,
    tags: ['wrong_drinks'],
    ratingRange: { min: 1.0, max: 4.0 },
    messages: [
      "I asked for an ale and received something that tasted of stout and regret. The barkeep apologised and I left anyway. Two stars.",
      "The drink that arrived was not the drink I ordered. I've come to accept this as a feature, not a failure.",
    ],
  },
  {
    name: 'Percival the Pilgrim',
    reviewStars: 1,
    tags: ['wrong_drinks', 'declining'],
    ratingRange: { min: 1.0, max: 3.0 },
    messages: [
      "Perhaps the barkeep is new. Perhaps they need spectacles. Either way I received the wrong drink twice and left sober by choice.",
      "I have walked forty miles through rain and mud. I ordered a mead. I received what I believe was dishwater. One star.",
    ],
  },
  {
    name: 'Margery the Midwife',
    reviewStars: 2,
    tags: ['wrong_drinks'],
    ratingRange: { min: 1.5, max: 3.5 },
    messages: [
      "I don't ask for much — just the drink I ordered. This establishment struggles with that basic premise.",
      "Wrong drink, no apology, and I had to wait fifteen minutes for the privilege. I've delivered twins in better conditions.",
    ],
  },

  // ── Slow / quiet day ───────────────────────────────────────────────────────
  {
    name: 'Edwina the Tanner',
    reviewStars: 2,
    tags: ['slow_service', 'quiet_day'],
    ratingRange: { min: 1.0, max: 3.5 },
    messages: [
      "The place was near empty, so you'd think service would be swift. You would be wrong. I watched a candle melt.",
      "Three other customers. One barkeep. I still waited long enough to compose a short ballad in my head.",
    ],
  },
  {
    name: 'Cuthbert the Miller',
    reviewStars: 2,
    tags: ['slow_service'],
    ratingRange: { min: 1.0, max: 3.0 },
    messages: [
      "I sat. I waited. I sat some more. The barkeep was busy with something, though I couldn't tell you what.",
      "My patience is a virtue I have in limited supply. This tavern tested it thoroughly. I left without finishing my drink.",
    ],
  },

  // ── Improving ─────────────────────────────────────────────────────────────
  {
    name: 'Ingrid the Herbalist',
    reviewStars: 4,
    tags: ['improving'],
    ratingRange: { min: 2.5, max: 5.0 },
    messages: [
      "Last time I visited things were quite rough. This visit was markedly improved. I'll be back.",
      "I had low expectations given past visits. The barkeep surprised me. Practice makes perfect, I suppose.",
    ],
  },
  {
    name: 'Oswald the Farmer',
    reviewStars: 5,
    tags: ['improving', 'fast_service'],
    ratingRange: { min: 3.5, max: 5.0 },
    messages: [
      "Whatever they changed, keep doing it. Best service I've had from this place in months.",
      "Told my neighbours to avoid this spot. Now I owe them an apology — it's turned right around. Excellent.",
    ],
  },

  // ── Declining ─────────────────────────────────────────────────────────────
  {
    name: 'Ranulf the Blacksmith',
    reviewStars: 2,
    tags: ['declining'],
    ratingRange: { min: 1.0, max: 3.0 },
    messages: [
      "I've been coming here for years. I don't know what's happened but something has. It's gone downhill and then some.",
      "Used to be a favourite. Now I'm not sure I'll return. Sad to see a good tavern lose its way.",
    ],
  },
  {
    name: 'Elspeth the Seamstress',
    reviewStars: 1,
    tags: ['declining', 'wrong_drinks'],
    ratingRange: { min: 1.0, max: 2.5 },
    messages: [
      "My patience wore thin faster than cheap linen. Wrong drink, long wait, and a look of indifference from behind the bar.",
      "I left a larger tip the last time I was here. I will not be repeating that mistake.",
    ],
  },

  // ── Generic — low rating ───────────────────────────────────────────────────
  {
    name: 'Isolde the Innkeeper',
    reviewStars: 1,
    tags: ['generic'],
    ratingRange: { min: 1.0, max: 2.0 },
    messages: [
      "As someone who runs an establishment myself, I can say with professional certainty: this one is struggling.",
      "I've seen better service at a market stall in a rainstorm. One star, and that's being generous.",
    ],
  },
  {
    name: 'Sigrid the Traveller',
    reviewStars: 2,
    tags: ['generic'],
    ratingRange: { min: 1.0, max: 2.5 },
    messages: [
      "I have visited taverns from the coast to the highlands. This one sits firmly near the bottom of that list.",
      "The roof doesn't leak, I'll grant them that. Service is another matter entirely.",
    ],
  },
  {
    name: 'Leofric the Carpenter',
    reviewStars: 2,
    tags: ['generic'],
    ratingRange: { min: 1.5, max: 3.0 },
    messages: [
      "I've had better service at a roadside puddle. And the puddle didn't charge me for the privilege.",
      "They're trying, I can see that. Trying and succeeding are different things, but I appreciate the effort.",
    ],
  },

  // ── Generic — mid rating ───────────────────────────────────────────────────
  {
    name: 'Agnes of the Market',
    reviewStars: 3,
    tags: ['generic'],
    ratingRange: { min: 2.0, max: 4.0 },
    messages: [
      "An adequate establishment. The ale was wet, the fire was warm, and nobody stabbed anyone. Three stars.",
      "Does what it says. No more, no less. A tavern, serving drinks, in a town that needs them. Fair enough.",
    ],
  },
  {
    name: 'Rowena the Merchant',
    reviewStars: 3,
    tags: ['generic'],
    ratingRange: { min: 2.5, max: 4.0 },
    messages: [
      "Could be great. Sometimes it is. Sometimes it isn't. Worth a visit if you manage your expectations.",
      "Inconsistent but mostly fine. Like most things in life.",
    ],
  },
  {
    name: 'Wulfric the Guard',
    reviewStars: 3,
    tags: ['generic'],
    ratingRange: { min: 2.0, max: 3.5 },
    messages: [
      "Stood here on patrol for years. When my shift ends I come in for a drink. It's fine. It does the job.",
      "Ask me again after I've slept. Probably still three stars.",
    ],
  },
  {
    name: 'Bartholomew the Cobbler',
    reviewStars: 3,
    tags: ['generic'],
    ratingRange: { min: 2.5, max: 4.5 },
    messages: [
      "A reasonable tavern for a reasonable price. The drink was reasonable. I am a reasonable man.",
      "Solid. Not spectacular. The lager had that particular quality of tasting better after the first sip.",
    ],
  },

  // ── Generic — high rating ──────────────────────────────────────────────────
  {
    name: 'Dunstan the Monk',
    reviewStars: 5,
    tags: ['generic'],
    ratingRange: { min: 3.5, max: 5.0 },
    messages: [
      "I visit only for the mead, which is fine enough, and the company of strangers, which is finer still. A good house.",
      "Temperance is a virtue I endorse in all things but this. Excellent tavern. Bless them.",
    ],
  },
  {
    name: 'Matilda the Baker',
    reviewStars: 4,
    tags: ['generic'],
    ratingRange: { min: 3.0, max: 5.0 },
    messages: [
      "Warm atmosphere, quick hands at the bar. I was served before I'd finished complaining about the weather.",
      "Good tavern. I come in after the ovens cool and leave feeling restored. Four stars.",
    ],
  },
  {
    name: 'Fulk the Dyer',
    reviewStars: 4,
    tags: ['generic'],
    ratingRange: { min: 3.0, max: 5.0 },
    messages: [
      "My hands are blue and my spirits are high after a visit here. Recommended.",
      "A good honest tavern. The sort of place that reminds you why towns are better than forests.",
    ],
  },
  {
    name: 'Godwin the Tanner',
    reviewStars: 4,
    tags: ['generic'],
    ratingRange: { min: 3.0, max: 5.0 },
    messages: [
      "Solid tavern, no complaints, good pour. The barkeep has the look of someone who knows what they're doing.",
      "My trade is unpleasant and my thirst is large. This place handles both problems adequately. High praise from me.",
    ],
  },
]
