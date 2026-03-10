// MBW-77: BrawlEntity — tracks an active brawl triggered by a hooligan
export interface BrawlEntity {
  id: string
  instigatorId: string              // hooligan customer ID
  position: { x: number; y: number }
  radius: number                    // canvas units — customers within this are affected
  affectedCustomerIds: string[]     // collateral customers pulled into the brawl
  timer: number                     // auto-resolve fallback countdown (seconds)
  tapsRequired: number              // total player taps to eject the brawler
  tapsReceived: number
  ejectProgress: number             // 0–1 convenience ratio
  securityResponding: boolean       // V2.5 — always false in V2.0
  securityTimer: number             // V2.5
}

let _nextBrawlId = 0
export function nextBrawlId(): string {
  return `brawl-${++_nextBrawlId}`
}

export function resetBrawlIdCounter(): void {
  _nextBrawlId = 0
}
