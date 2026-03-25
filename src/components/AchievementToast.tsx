// MBW-NEW: Achievement toast — slides in from top, auto-dismisses after 3s, queued
import { useEffect } from 'react'
import { useHudStore } from '../store/hudStore'
import type { AchievementTier } from '../types/achievements'

const TIER_EMOJI: Record<AchievementTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
}

export function AchievementToast() {
  const queue = useHudStore((s) => s.achievementToastQueue)
  const current = queue[0]

  useEffect(() => {
    if (!current) return
    const timer = setTimeout(() => {
      useHudStore.setState((s) => ({ achievementToastQueue: s.achievementToastQueue.slice(1) }))
    }, 3000)
    return () => clearTimeout(timer)
  }, [current?.id])

  if (!current) return null

  const tierEmoji = TIER_EMOJI[current.tier]
  const r = current.reward
  const rewardText = r.coins
    ? `+🪙${r.coins}`
    : r.powerupUnlock
      ? `Unlocked: ${r.powerupUnlock}`
      : r.powerupGrant
        ? `+${r.powerupGrant.quantity}× ${r.powerupGrant.type}`
        : r.decoration
          ? 'Decoration earned!'
          : ''

  return (
    <div key={current.id} className="achievement-toast">
      <span className="achievement-toast-tier">{tierEmoji}</span>
      <span className="achievement-toast-name">{current.name}</span>
      <span className="achievement-toast-reward">{rewardText}</span>
    </div>
  )
}
