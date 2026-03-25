// MBW-NEW: Weekly Bill screen — shown after WeeklyReport at the end of each week.
// Displays income vs expenses breakdown, outstanding debt, and three payment options.
// Insurance toggle affects next week's coverage.
// Navigation: any payment option → BETWEEN_DAY_SHOP
import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import {
  FINANCES_CONFIG,
  computeWeeklyRent,
  computeWeeklyInsurance,
  computeWeeklyWages,
} from '../config/finances'
import { UPGRADES_BY_ID } from '../config/upgrades'
import type { WeeklyBillRecord } from '../types/game'

export function WeeklyBillScreen() {
  const {
    gameSave,
    goToScreen,
    accrueWeeklyLoans,
    payWeeklyBill,
    deferWeeklyBill,
    takeLoan,
    toggleInsurance,
    resetWeeklyFinances,
  } = useGameStore()

  // Accrue interest on existing loans once on mount, capture accrued total
  const [loanDebt, setLoanDebt] = useState<number>(0)
  const [accrued, setAccrued] = useState(false)

  useEffect(() => {
    if (accrued) return
    const total = accrueWeeklyLoans()
    setLoanDebt(total)
    setAccrued(true)
  }, [accrued, accrueWeeklyLoans])

  const { finances, upgrades } = gameSave
  const completedWeek = Math.ceil((gameSave.dayNumber - 1) / 7)

  // Build tier cost map for insurable upgrades
  const upgradeTierCosts: Record<string, number[]> = {}
  for (const id of FINANCES_CONFIG.INSURABLE_UPGRADE_IDS) {
    const cfg = UPGRADES_BY_ID[id]
    if (cfg) upgradeTierCosts[id] = cfg.tiers.map((t) => t.cost)
  }

  const extraSeatTier = upgrades['extra_seating']?.tier ?? 0
  const rent = computeWeeklyRent(extraSeatTier)
  const insurancePremium = finances.insuranceOptedIn
    ? computeWeeklyInsurance(upgrades, upgradeTierCosts)
    : 0
  const wages = computeWeeklyWages(upgrades)
  const expensesTotal = rent + insurancePremium + wages + loanDebt

  const income = finances.weeklyRevenue
  const suppliesInfoOnly = finances.suppliesSpentThisWeek
  const profitLoss = income - (expensesTotal + suppliesInfoOnly)

  const outstandingDebt = finances.outstandingDebt
  const totalDebt = outstandingDebt + expensesTotal
  const debtWarning = totalDebt >= FINANCES_CONFIG.DEBT_WARNING_THRESHOLD
  const debtCritical = totalDebt >= FINANCES_CONFIG.DEBT_THRESHOLD

  function buildRecord(method: 'immediate' | 'deferred' | 'loan'): WeeklyBillRecord {
    return {
      weekNumber: completedWeek,
      income: { drinks: income, total: income },
      expenses: {
        rent,
        insurance: insurancePremium,
        wages,
        loanRepayments: loanDebt,
        suppliesInfoOnly,
        total: expensesTotal,
      },
      profitLoss,
      paymentMethod: method,
    }
  }

  function handlePayNow() {
    payWeeklyBill(expensesTotal, buildRecord('immediate'))
    resetWeeklyFinances()
    goToScreen('BETWEEN_DAY_SHOP')
  }

  function handleDefer() {
    deferWeeklyBill(expensesTotal, buildRecord('deferred'))
    resetWeeklyFinances()
    goToScreen('BETWEEN_DAY_SHOP')
  }

  function handleTakeLoan() {
    takeLoan(expensesTotal, buildRecord('loan'))
    resetWeeklyFinances()
    goToScreen('BETWEEN_DAY_SHOP')
  }

  const discountSaving = Math.round(expensesTotal * FINANCES_CONFIG.EARLY_PAYMENT_DISCOUNT)
  const payNowCost = expensesTotal - discountSaving

  return (
    <div className="screen weekly-bill-screen">
      <h2>Week {completedWeek} Bill</h2>

      {/* Income section */}
      <div className="bill-section bill-income-section">
        <h3 className="bill-section-title">Income</h3>
        <div className="bill-line">
          <span>Drinks sold</span>
          <span className="bill-positive">🪙{income}</span>
        </div>
        <div className="bill-line bill-section-total">
          <span>Total income</span>
          <span className="bill-positive">🪙{income}</span>
        </div>
      </div>

      {/* Expenses section */}
      <div className="bill-section bill-expense-section">
        <h3 className="bill-section-title">Expenses</h3>
        <div className="bill-line">
          <span>Rent</span>
          <span>🪙{rent}</span>
        </div>
        {wages > 0 && (
          <div className="bill-line">
            <span>Staff wages</span>
            <span>🪙{wages}</span>
          </div>
        )}
        {finances.insuranceOptedIn && insurancePremium > 0 && (
          <div className="bill-line">
            <span>Insurance</span>
            <span>🪙{insurancePremium}</span>
          </div>
        )}
        {loanDebt > 0 && (
          <div className="bill-line bill-loan-line">
            <span>Loan repayment (+10% interest)</span>
            <span>🪙{loanDebt}</span>
          </div>
        )}
        {suppliesInfoOnly > 0 && (
          <div className="bill-line bill-supplies-info">
            <span>Supplies (already paid)</span>
            <span className="bill-info">🪙{suppliesInfoOnly}</span>
          </div>
        )}
        <div className="bill-line bill-section-total">
          <span>Bill total</span>
          <span>🪙{expensesTotal}</span>
        </div>
      </div>

      {/* Profit / Loss */}
      <div className={`bill-profit-loss ${profitLoss >= 0 ? 'bill-profit' : 'bill-loss'}`}>
        <span>Profit / Loss</span>
        <span>{profitLoss >= 0 ? '+' : ''}🪙{profitLoss}</span>
      </div>

      {/* Outstanding debt */}
      {outstandingDebt > 0 && (
        <div className={`bill-debt-bar ${debtWarning ? 'bill-debt-warning' : ''} ${debtCritical ? 'bill-debt-critical' : ''}`}>
          <div className="bill-debt-label">
            <span>Outstanding debt</span>
            <span>🪙{outstandingDebt} / {FINANCES_CONFIG.DEBT_THRESHOLD}</span>
          </div>
          <div className="bill-debt-track">
            <div
              className="bill-debt-fill"
              style={{ width: `${Math.min(100, (outstandingDebt / FINANCES_CONFIG.DEBT_THRESHOLD) * 100)}%` }}
            />
          </div>
          {debtCritical && (
            <p className="bill-debt-eviction">⚠ Debt threshold reached — your bar is at risk!</p>
          )}
        </div>
      )}

      {/* Insurance toggle */}
      <div className="bill-insurance-toggle">
        <button
          className={`insurance-toggle-btn ${finances.insuranceOptedIn ? 'insurance-on' : 'insurance-off'}`}
          onClick={toggleInsurance}
        >
          {finances.insuranceOptedIn
            ? `Insurance: ON (🪙${computeWeeklyInsurance(upgrades, upgradeTierCosts)}/week next week — click to cancel)`
            : 'Enable Insurance (protects upgrades from burglary)'}
        </button>
      </div>

      {/* Payment options */}
      <div className="bill-payment-options">
        <p className="bill-payment-prompt">How will you pay the 🪙{expensesTotal} bill?</p>
        <button
          className="bill-pay-btn bill-pay-now"
          onClick={handlePayNow}
          disabled={debtCritical && gameSave.coins < payNowCost}
        >
          Pay Now — 🪙{payNowCost}
          {discountSaving > 0 && <span className="bill-saving"> (save 🪙{discountSaving})</span>}
        </button>
        <button
          className="bill-pay-btn bill-pay-defer"
          onClick={handleDefer}
          disabled={debtCritical}
        >
          Defer to Next Week — add 🪙{expensesTotal} to debt
        </button>
        <button
          className="bill-pay-btn bill-pay-loan"
          onClick={handleTakeLoan}
          disabled={debtCritical}
        >
          Take a Loan — 🪙{expensesTotal} at 10%/week
        </button>
      </div>
    </div>
  )
}
