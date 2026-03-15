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

  // MBW-112: Game Day event reviews ────────────────────────────────────────
  {
    name: 'Cormac the Supporter',
    reviewStars: 5,
    tags: ['game_day', 'busy_day'],
    ratingRange: { min: 3.0, max: 5.0 },
    messages: [
      "Game Day and they kept every tankard full. The hooligans were rowdy but the ale flowed and I got mine. Outstanding.",
      "Half the stands came here after the match. Rowdiest night of the year and the barkeep didn't flinch. Five stars.",
    ],
  },
  {
    name: 'Hilda of the North Stand',
    reviewStars: 4,
    tags: ['game_day'],
    ratingRange: { min: 2.5, max: 5.0 },
    messages: [
      "Game Day is always chaos but they handled the crowd better than most. Got my lager, got my seat, can't complain.",
      "The hooligans were in fine voice and the ale was cold. That's all I ask on a match day.",
    ],
  },
  {
    name: 'Bertrand the Fixture Fan',
    reviewStars: 2,
    tags: ['game_day', 'slow_service'],
    ratingRange: { min: 1.0, max: 3.5 },
    messages: [
      "Game Day. Everyone in town wanted a drink. The barkeep looked overwhelmed and, honestly, was. I left thirsty.",
      "The match was on and the bar was a disaster. Long waits, wrong drinks, too much brawling inside. Sort it out.",
    ],
  },
  {
    name: 'Ulf Ironbelly',
    reviewStars: 3,
    tags: ['game_day', 'wrong_drinks'],
    ratingRange: { min: 1.5, max: 4.0 },
    messages: [
      "They tried. Game Day always brings the worst of us in here, hooligans included. Wrong drink but the spirit was willing.",
      "Chaos from the moment the teams took the field. Got someone else's order twice. But the atmosphere was grand.",
    ],
  },

  // MBW-112: Market Day event reviews ───────────────────────────────────────
  {
    name: 'Aldric the Cloth Merchant',
    reviewStars: 5,
    tags: ['market_day', 'busy_day'],
    ratingRange: { min: 3.0, max: 5.0 },
    messages: [
      "Market Day brings half the county through this town and this bar handled it like a well-oiled press. Impressive.",
      "Every trader in the region stopping in for a drink and not a single one left waiting long. That's market-day service.",
    ],
  },
  {
    name: 'Prunella the Spice Seller',
    reviewStars: 4,
    tags: ['market_day'],
    ratingRange: { min: 2.5, max: 5.0 },
    messages: [
      "Market Day rush and they kept pace admirably. My feet ached from the stalls — this place was a proper rest.",
      "I've been doing the market circuit for twenty years. This tavern is one of the better stops on the route.",
    ],
  },
  {
    name: 'Oswin the Travelling Trader',
    reviewStars: 2,
    tags: ['market_day', 'slow_service'],
    ratingRange: { min: 1.0, max: 3.5 },
    messages: [
      "Market Day doubles the town's population for a day. This bar did not double its speed. Very slow indeed.",
      "I come here every Market Day hoping it's improved. It hadn't. Long waits, short patience, and my stout was warm.",
    ],
  },

  // MBW-112: Noble's Visit (King's Visit) event reviews ─────────────────────
  {
    name: 'Edmund the Steward',
    reviewStars: 5,
    tags: ['kings_visit'],
    ratingRange: { min: 3.0, max: 5.0 },
    messages: [
      "The King himself graced this establishment tonight. The barkeep did not panic. A lesser soul would have. Five stars.",
      "Noble company demands noble service. The tavern rose to the occasion magnificently. His Majesty seemed pleased, which is saying something.",
    ],
  },
  {
    name: 'Lady Cecily of Ashbrook',
    reviewStars: 4,
    tags: ['kings_visit'],
    ratingRange: { min: 2.5, max: 5.0 },
    messages: [
      "I was present for the Royal Visit. The barkeep served the King's tray without incident. That alone earns four stars.",
      "A royal occasion calls for composure. The bar managed the evening with more dignity than I expected. Well done.",
    ],
  },
  {
    name: 'Sir Reginald of the Guard',
    reviewStars: 2,
    tags: ['kings_visit', 'wrong_drinks'],
    ratingRange: { min: 1.0, max: 3.5 },
    messages: [
      "The King visited and the barkeep served him the wrong drink. I cannot overstate how poor a showing that was.",
      "A royal visit is not a night for fumbling orders. The tray was wrong and the court noticed. Most unfortunate.",
    ],
  },
  {
    name: 'Maud the Court Scribe',
    reviewStars: 3,
    tags: ['kings_visit'],
    ratingRange: { min: 2.0, max: 4.5 },
    messages: [
      "The King came and went without incident. The barkeep was flustered but managed. History will not record this visit fondly or poorly.",
      "I have witnessed grander royal occasions. The tavern did its best and that will have to do.",
    ],
  },

  // MBW-112: Harvest Festival event reviews ─────────────────────────────────
  {
    name: 'Gwen the Farmer',
    reviewStars: 5,
    tags: ['harvest_festival', 'busy_day'],
    ratingRange: { min: 3.0, max: 5.0 },
    messages: [
      "Harvest Festival is the one night a year we all let loose. The barkeep kept up with every single one of us. Magnificent.",
      "Finest harvest in years and the finest service to match. The whole village came in and everyone went home satisfied.",
    ],
  },
  {
    name: 'Cnut the Reaper',
    reviewStars: 4,
    tags: ['harvest_festival'],
    ratingRange: { min: 2.5, max: 5.0 },
    messages: [
      "We've brought the harvest in. A good drink is the least we deserve. This tavern delivered it well.",
      "Harvest Festival means every hand in the fields deserves a tankard. The bar obliged without too much fuss.",
    ],
  },
  {
    name: 'Avice the Miller',
    reviewStars: 3,
    tags: ['harvest_festival', 'slow_service'],
    ratingRange: { min: 1.5, max: 4.0 },
    messages: [
      "We worked hard for the harvest. The least I asked was a timely drink. I waited longer than my patience allowed.",
      "The festival deserves better service than this. The queue stretched to the door and moved at a crawl.",
    ],
  },

  // MBW-112: Bard Night event reviews ───────────────────────────────────────
  {
    name: 'Finnian the Luteplayer',
    reviewStars: 5,
    tags: ['bard_night'],
    ratingRange: { min: 3.0, max: 5.0 },
    messages: [
      "The music was grand and the service matched it. A bard cannot perform to their full capacity on an empty cup. Mine was never empty.",
      "Bard Night well done — drinks arriving in rhythm with the songs, nearly. The barkeep has a gift for timing.",
    ],
  },
  {
    name: 'Rosalind the Music-Lover',
    reviewStars: 4,
    tags: ['bard_night'],
    ratingRange: { min: 2.5, max: 5.0 },
    messages: [
      "A wonderful evening. The entertainment was fine and the drinks kept coming. I've barely stopped humming since.",
      "Bard Night brought a good crowd and the bar handled it well. An evening to remember.",
    ],
  },
  {
    name: 'Torben the Critic',
    reviewStars: 2,
    tags: ['bard_night', 'slow_service'],
    ratingRange: { min: 1.0, max: 3.5 },
    messages: [
      "The bard was excellent. The service was not. I spent more time thirsty than singing along, and that is unforgivable on Bard Night.",
      "The music earned five stars. The bar earned two. A disappointing evening overall despite the entertainment.",
    ],
  },
  {
    name: 'Wren the Wandering Minstrel',
    reviewStars: 4,
    tags: ['bard_night', 'fast_service'],
    ratingRange: { min: 3.0, max: 5.0 },
    messages: [
      "Quick service and good ale — exactly what a performer needs before taking the stage. This place knows its trade.",
      "I've played in worse taverns. The barkeep kept the crowd lubricated and that keeps the tips flowing to me too.",
    ],
  },
]
