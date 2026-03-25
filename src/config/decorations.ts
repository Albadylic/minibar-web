// MBW-NEW: Decoration configs — earned via achievements, rendered as PixiJS objects in the bar scene
export interface DecorationConfig {
  id: string
  name: string
  position: { x: number; y: number }
  color: number  // PixiJS hex color
}

export const DECORATIONS: DecorationConfig[] = [
  { id: 'trophy_shelf',       name: 'Trophy Shelf',        position: { x: 40,  y: 80  }, color: 0xffd700 },
  { id: 'golden_tankard',     name: 'Golden Tankard',      position: { x: 340, y: 80  }, color: 0xffd700 },
  { id: 'framed_review',      name: 'Framed Review',       position: { x: 187, y: 50  }, color: 0xffd700 },
  { id: 'star_trophy',        name: 'Star Trophy',         position: { x: 80,  y: 50  }, color: 0xffd700 },
  { id: 'shield_plaque',      name: 'Shield Plaque',       position: { x: 295, y: 50  }, color: 0xffd700 },
  { id: 'staff_portrait',     name: 'Staff Portrait',      position: { x: 40,  y: 200 }, color: 0xffd700 },
  { id: 'chandelier_trophy',  name: 'Chandelier Trophy',   position: { x: 295, y: 100 }, color: 0xffd700 },
  { id: 'master_key',         name: 'Master Key',          position: { x: 40,  y: 580 }, color: 0xffd700 },
  { id: 'stage_spotlight',    name: 'Stage Spotlight',     position: { x: 65,  y: 580 }, color: 0xffd700 },
  { id: 'entertainer_poster', name: 'Entertainer Poster',  position: { x: 320, y: 200 }, color: 0xffd700 },
  { id: 'royal_warrant',      name: 'Royal Warrant',       position: { x: 187, y: 100 }, color: 0xffd700 },
  { id: 'tavern_flag',        name: 'Tavern Flag',         position: { x: 20,  y: 50  }, color: 0xffd700 },
  { id: 'crown',              name: 'Crown',               position: { x: 355, y: 50  }, color: 0xffd700 },
  { id: 'gold_coin_stack',    name: 'Gold Coin Stack',     position: { x: 20,  y: 620 }, color: 0xffd700 },
]

export const DECORATIONS_BY_ID: Record<string, DecorationConfig> = Object.fromEntries(
  DECORATIONS.map((d) => [d.id, d]),
)
