// MBW-87: SecurityState — tracks active bouncer/security team responses
// MBW-180: Tier 3 added — fastest response, handles all brawls simultaneously
export interface SecurityResponse {
  brawlId: string
  timer: number // seconds until auto-resolve
}

export interface SecurityState {
  tier: 1 | 2 | 3
  responses: SecurityResponse[] // Tier 1 max 1; Tier 2/3 handle multiple/all
}
