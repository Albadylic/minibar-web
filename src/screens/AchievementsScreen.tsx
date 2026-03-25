// MBW-NEW: Achievements screen — shows all achievements grouped by category
// Shows completed tiers + next tier to aim for, with progress bar for cumulative conditions
import { useGameStore } from '../store/gameStore'
import { ACHIEVEMENTS, TOTAL_ACHIEVEMENTS } from '../config/achievements'
import type { AchievementConfig, AchievementTier } from '../types/achievements'
import type { GameSave } from '../types/game'

const CATEGORY_LABELS: Record<string, string> = {
  serving: '🍺 Serving',
  customers: '👥 Customers',
  economy: '🪙 Economy',
  brawls: '⚔️ Brawls',
  survival: '📅 Survival',
  staff: '👷 Staff',
  entertainment: '🎵 Entertainment',
  cleaning: '🧹 Cleaning',
  misc: '⭐ Miscellaneous',
}

const TIER_BADGE: Record<AchievementTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
}

function rewardText(ach: AchievementConfig): string {
  const r = ach.reward
  const parts: string[] = []
  if (r.coins) parts.push(`🪙${r.coins}`)
  if (r.powerupUnlock) parts.push(`Unlocks: ${r.powerupUnlock}`)
  if (r.powerupGrant) parts.push(`+${r.powerupGrant.quantity}× ${r.powerupGrant.type}`)
  if (r.decoration) parts.push('Decoration')
  return parts.join(', ')
}

function getProgress(ach: AchievementConfig, stats: GameSave['stats']): number | null {
  if (ach.condition.type !== 'cumulative') return null
  const stat = ach.condition.stat
  const knownStats: Record<string, number | string[]> = stats as unknown as Record<string, number | string[]>
  const raw = knownStats[stat]
  const val = typeof raw === 'number' ? raw : 0
  return Math.min(1, val / ach.condition.target)
}

export function AchievementsScreen() {
  const { gameSave, goToScreen } = useGameStore()
  const completed = gameSave.achievements.completed
  const completedCount = Object.keys(completed).length

  // Group by category maintaining order
  const categories = [...new Set(ACHIEVEMENTS.map((a) => a.category))]

  return (
    <div className="achievements-screen screen">
      <div className="ach-header">
        <button className="ach-back-btn" onClick={() => goToScreen('BETWEEN_DAY_SHOP')}>← Back</button>
        <span className="ach-title">Achievements</span>
        <span className="ach-count">{completedCount} / {TOTAL_ACHIEVEMENTS}</span>
      </div>

      <div className="ach-list">
        {categories.map((cat) => {
          const catAchs = ACHIEVEMENTS.filter((a) => a.category === cat)
          const completedInCat = catAchs.filter((a) => completed[a.id])
          const nextUncompleted = catAchs.find((a) => !completed[a.id])

          if (completedInCat.length === 0 && !nextUncompleted) return null

          return (
            <div key={cat} className="ach-category">
              <div className="ach-category-header">{CATEGORY_LABELS[cat] ?? cat}</div>

              {completedInCat.map((ach) => (
                <div key={ach.id} className="ach-item ach-item--complete">
                  <span className="ach-tier-badge">{TIER_BADGE[ach.tier]}</span>
                  <span className="ach-item-name">{ach.name}</span>
                  <span className="ach-item-reward">✓ {rewardText(ach)}</span>
                </div>
              ))}

              {nextUncompleted && (
                <div className="ach-item ach-item--next">
                  <span className="ach-tier-badge">{TIER_BADGE[nextUncompleted.tier]}</span>
                  <div className="ach-item-body">
                    <span className="ach-item-name">
                      {nextUncompleted.hidden ? '???' : nextUncompleted.name}
                    </span>
                    {!nextUncompleted.hidden && (
                      <span className="ach-item-desc">{nextUncompleted.description}</span>
                    )}
                    {!nextUncompleted.hidden && (
                      <span className="ach-item-reward">{rewardText(nextUncompleted)}</span>
                    )}
                    {nextUncompleted.condition.type === 'cumulative' && !nextUncompleted.hidden && (() => {
                      const pct = getProgress(nextUncompleted, gameSave.stats)
                      if (pct === null) return null
                      return (
                        <div className="ach-progress-bar">
                          <div className="ach-progress-fill" style={{ width: `${Math.round(pct * 100)}%` }} />
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
