// MBW-173: Tutorial text boxes — shown once per mechanic introduction, gated by day
export interface TutorialConfig {
  id: string
  minDay: number        // show in shop before this day number
  requiresUpgrade?: string  // only show if player already owns this upgrade
  title: string
  body: string
}

export const TUTORIALS: TutorialConfig[] = [
  {
    id: 'HOOLIGANS',
    minDay: 3,
    title: 'Game Day!',
    body: "The local team is playing — expect hooligans. When a hooligan loses patience, they'll start a brawl. Tap them quickly to throw them out before it spreads!",
  },
  {
    id: 'DRUNKS',
    minDay: 5,
    title: 'Watch the Drunks',
    body: "Drunks stumble in and block seats without ordering anything. Tap them to escort them out. Hire Security to handle them for you.",
  },
  {
    id: 'MESSES',
    minDay: 5,
    title: 'Keep it Clean',
    body: "Customers leave glasses behind. Tap them to clean up — too many messes make for an unhappy bar. Hire a Cleaner to keep on top of it automatically.",
  },
  {
    id: 'ENTERTAINERS',
    minDay: 5,
    requiresUpgrade: 'stage',
    title: 'Entertainment',
    body: "An entertainer arrives at the Stage each Evening. While they perform, customers stay patient longer. Tip them at Last Orders and they'll be more likely to return.",
  },
  {
    id: 'RICH_CLIENTELE',
    minDay: 6,
    title: 'Rich Customers',
    body: "Wealthy customers have arrived. They pay very well — but their patience is short and they expect the right drink. Wrong orders cost you star rating.",
  },
]

// Returns tutorials that should be shown before upcomingDay and haven't been shown yet
export function getPendingTutorials(
  upcomingDay: number,
  shownTutorials: string[],
  ownedUpgrades: Record<string, { tier: number; purchasedOnDay: number }>,
): TutorialConfig[] {
  return TUTORIALS.filter((t) => {
    if (t.minDay > upcomingDay) return false
    if (shownTutorials.includes(t.id)) return false
    if (t.requiresUpgrade && !ownedUpgrades[t.requiresUpgrade]) return false
    return true
  })
}
