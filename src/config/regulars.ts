// MBW-NEW: Named regular customer configuration.
// Regulars always leave reviews; rendered as green sprites.

import type { CustomerSkin } from '../entities/customer'

export interface RegularConfig {
  id: string
  displayName: string
  skin: CustomerSkin       // Which base skin to use
  letterMarker: string     // Single letter shown on sprite (overrides skin initial)
  visitChancePerDay: number  // 0–1 probability of visiting on any given day (Week 2+)
}

export const REGULARS: RegularConfig[] = [
  {
    id: 'bjorn_blacksmith',
    displayName: 'Bjorn the Blacksmith',
    skin: 'blacksmith',
    letterMarker: 'B',
    visitChancePerDay: 0.08,
  },
  {
    id: 'greta_farmer',
    displayName: 'Greta the Farmer',
    skin: 'farmer',
    letterMarker: 'G',
    visitChancePerDay: 0.08,
  },
  {
    id: 'aldric_priest',
    displayName: 'Father Aldric',
    skin: 'priest',
    letterMarker: 'A',
    visitChancePerDay: 0.06,
  },
  {
    id: 'oswin_merchant',
    displayName: 'Oswin the Merchant',
    skin: 'merchant',
    letterMarker: 'O',
    visitChancePerDay: 0.06,
  },
]

export const REGULARS_BY_ID: Record<string, RegularConfig> = Object.fromEntries(
  REGULARS.map((r) => [r.id, r]),
)
