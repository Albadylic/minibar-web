// MBW-77/150: BrawlEntity — tracks an active brawl triggered by a hooligan
export interface BrawlEntity {
  id: string
  instigatorId: string              // hooligan customer ID
  disruptedCustomerIds: string[]    // MBW-150: customers disrupted during roaming (accumulated)
  timer: number                     // auto-resolve fallback countdown (seconds)
  tapsRequired: number              // total player taps to eject the brawler
  tapsReceived: number
  ejectProgress: number             // 0–1 convenience ratio
  securityResponding: boolean       // V2.5 — always false in V2.0
  securityTimer: number             // V2.5
  // MBW-150: Roaming state
  targetSeatId: string | null       // seat the brawler is currently walking toward
  roamCooldown: number              // seconds to wait after disrupting before picking next target
}

let _nextBrawlId = 0
export function nextBrawlId(): string {
  return `brawl-${++_nextBrawlId}`
}

export function resetBrawlIdCounter(): void {
  _nextBrawlId = 0
}
