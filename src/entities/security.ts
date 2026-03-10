// MBW-87: SecurityState — tracks active bouncer/security team responses
export interface SecurityResponse {
  brawlId: string
  timer: number // seconds until auto-resolve
}

export interface SecurityState {
  tier: 1 | 2
  responses: SecurityResponse[] // Tier 1 max 1; Tier 2 can handle multiple
}
