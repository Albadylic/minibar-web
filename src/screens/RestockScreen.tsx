// MBW-NEW: Restock screen — daily supply purchase before each day
// Player buys drink stock in bulk tiers (Small/Medium/Large) before opening.
// Navigation: Open Bar → EVENT_NOTICE (if event/powerups) or DAY_IN_PROGRESS
//             Skip Restocking → same routing, no purchases made
import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { DRINKS_BY_ID } from '../config/drinks'
import { FINANCES_CONFIG, computeBulkCost, type BulkTierKey } from '../config/finances'
import { PRE_DAY_POWERUPS } from '../config/powerups'
import type { PowerupType } from '../types/achievements'

interface PendingOrder {
  qty: number
  cost: number
}

export function RestockScreen() {
  const { gameSave, restockDrink, goToScreen, pendingEvent } = useGameStore()
  const [pending, setPending] = useState<Record<string, PendingOrder>>({})

  const hasPredayPowerups = (PRE_DAY_POWERUPS as PowerupType[]).some(
    (t) => gameSave.powerups.unlockedTypes.includes(t) && (gameSave.powerups.inventory[t] ?? 0) > 0,
  )

  function addToCart(drinkId: string, tier: BulkTierKey) {
    const drink = DRINKS_BY_ID[drinkId]
    if (!drink) return
    const cost = computeBulkCost(drink.supplyUnitCost, tier)
    const qty = FINANCES_CONFIG.BULK_TIERS[tier].quantity
    setPending((prev) => ({
      ...prev,
      [drinkId]: {
        qty: (prev[drinkId]?.qty ?? 0) + qty,
        cost: (prev[drinkId]?.cost ?? 0) + cost,
      },
    }))
  }

  function removeFromCart(drinkId: string) {
    setPending((prev) => {
      const next = { ...prev }
      delete next[drinkId]
      return next
    })
  }

  const totalPendingCost = Object.values(pending).reduce((sum, o) => sum + o.cost, 0)
  const canAfford = gameSave.coins >= totalPendingCost

  function navigate() {
    if (pendingEvent || hasPredayPowerups) {
      goToScreen('EVENT_NOTICE')
    } else {
      goToScreen('DAY_IN_PROGRESS')
    }
  }

  function handleOpenBar() {
    for (const [drinkId, order] of Object.entries(pending)) {
      if (order.qty <= 0) continue
      restockDrink(drinkId, order.qty, order.cost)
    }
    navigate()
  }

  // Days until weekly bill
  const daysUntilBill = 7 - ((gameSave.dayNumber - 1) % 7) || 7

  return (
    <div className="screen restock-screen">
      <h2>Stock the Bar</h2>
      <p className="restock-subtitle">Day {gameSave.dayNumber} — 🪙 {gameSave.coins} coins</p>

      <div className="restock-drink-list">
        {gameSave.unlockedDrinks.map((drinkId) => {
          const drink = DRINKS_BY_ID[drinkId]
          if (!drink) return null
          const supply = gameSave.finances.supplies[drinkId]
          const inStock = supply?.remaining ?? 0
          const usedYesterday = supply?.usedToday ?? 0
          const cartOrder = pending[drinkId]

          return (
            <div key={drinkId} className="restock-drink-row">
              <div className="restock-drink-header">
                <span className="restock-drink-name">{drink.name}</span>
                <span className="restock-drink-stock">
                  {inStock} in stock
                  {usedYesterday > 0 && <span className="restock-used"> · {usedYesterday} used yesterday</span>}
                </span>
              </div>

              {cartOrder && (
                <div className="restock-cart-row">
                  <span className="restock-cart-label">+{cartOrder.qty} units — 🪙{cartOrder.cost}</span>
                  <button className="restock-clear-btn" onClick={() => removeFromCart(drinkId)}>✕</button>
                </div>
              )}

              <div className="restock-bulk-btns">
                {(['small', 'medium', 'large'] as BulkTierKey[]).map((tier) => {
                  const { quantity, discount } = FINANCES_CONFIG.BULK_TIERS[tier]
                  const cost = computeBulkCost(drink.supplyUnitCost, tier)
                  return (
                    <button
                      key={tier}
                      className={`restock-bulk-btn restock-bulk-${tier}`}
                      onClick={() => addToCart(drinkId, tier)}
                    >
                      <span className="bulk-qty">{quantity}u</span>
                      <span className="bulk-cost">🪙{cost}</span>
                      {discount > 0 && <span className="bulk-discount">{Math.round(discount * 100)}% off</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="restock-footer">
        {totalPendingCost > 0 && (
          <div className="restock-totals">
            <span>Order total: 🪙{totalPendingCost}</span>
            <span className={canAfford ? 'restock-balance-ok' : 'restock-balance-short'}>
              Balance after: 🪙{gameSave.coins - totalPendingCost}
            </span>
          </div>
        )}
        {daysUntilBill <= 3 && (
          <p className="restock-bill-warning">⚠ Weekly bill due in {daysUntilBill} day{daysUntilBill !== 1 ? 's' : ''}</p>
        )}
        <div className="restock-actions">
          <button
            className="restock-open-btn"
            onClick={handleOpenBar}
            disabled={totalPendingCost > 0 && !canAfford}
          >
            {totalPendingCost > 0 ? `Buy & Open Bar (🪙${totalPendingCost})` : 'Open Bar'}
          </button>
          <button className="restock-skip-btn" onClick={navigate}>
            Skip Restocking
          </button>
        </div>
      </div>
    </div>
  )
}
