// MBW-87: SecurityState — tracks active bouncer/security team responses
// MBW-180: Tier 3 added — fastest response, handles all brawls simultaneously
export interface SecurityResponse {
  brawlId: string
  instigatorId: string // needed to look up brawler position each tick
}

export interface SecurityState {
  tier: 1 | 2 | 3
  responses: SecurityResponse[] // queue; [0] = active, rest = pending
  bouncerPos: { x: number; y: number }
  returning: boolean // true when walking back to BOUNCER_START
}
