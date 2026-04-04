/**
 * WithdrawalPanel — shared across e-commerce (CoinWithdrawal.tsx) and
 * NEFOL Social Revenue tab (AffiliatePartner.tsx).
 *
 * Props
 *   source   — 'store' | 'social_revenue'. Stored in metadata on the
 *              coin_withdrawals row so admin / Razorpay can filter by origin.
 *   variant  — 'page'     → standalone page style (matches old CoinWithdrawal)
 *              'embedded' → compact card style for the Revenue tab
 */
import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  IndianRupee,
  Info,
  Loader2,
  Lock,
  Wallet,
  XCircle,
} from 'lucide-react'
import { getApiBase } from '../utils/apiBase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Withdrawal {
  id: number
  amount: number
  withdrawal_method: string
  account_holder_name: string
  account_number?: string
  ifsc_code?: string
  bank_name?: string
  upi_id?: string
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed'
  transaction_id?: string
  admin_notes?: string
  rejection_reason?: string
  created_at: string
  processed_at?: string
}

interface CoinsData {
  total: number
  available: number
  locked: number
}

type Source = 'store' | 'social_revenue'
type Variant = 'page' | 'embedded'

export interface WithdrawalPanelProps {
  source?: Source
  variant?: Variant
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtINR(coins: number) {
  return (coins / 10).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    processing: 'bg-blue-50 text-blue-800 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-50 text-red-800 border-red-200',
    failed: 'bg-red-50 text-red-800 border-red-200',
  }
  const cls = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
      {(status === 'rejected' || status === 'failed') && <XCircle className="w-3 h-3" />}
      {status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'pending' && <Clock className="w-3 h-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function WithdrawalPanel({
  source = 'store',
  variant = 'page',
}: WithdrawalPanelProps) {
  const embedded = variant === 'embedded'

  // ── State ──────────────────────────────────────────────────────────────────
  const [coins, setCoins] = useState<CoinsData>({ total: 0, available: 0, locked: 0 })
  const [coinsLoading, setCoinsLoading] = useState(true)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const [hasSavedPayout, setHasSavedPayout] = useState(false)
  const [savedPayoutLabel, setSavedPayoutLabel] = useState('')
  const [useSavedPayout, setUseSavedPayout] = useState(false)

  const [form, setForm] = useState({
    amount: '',
    method: 'upi' as 'upi' | 'bank',
    holder: '',
    upi_id: '',
    account_number: '',
    ifsc_code: '',
    bank_name: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const token = () => localStorage.getItem('token') ?? ''
  const authHeaders = () => ({
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
  })

  const fetchCoins = useCallback(async () => {
    if (!token()) { setCoinsLoading(false); return }
    try {
      const r = await fetch(`${getApiBase()}/api/nefol-coins`, { headers: authHeaders() })
      if (r.ok) {
        const d = await r.json()
        const total = d.nefol_coins ?? 0
        const available = d.available_coins ?? total
        setCoins({ total, available, locked: Math.max(0, total - available) })
      }
    } catch { /* ignore */ } finally {
      setCoinsLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!token()) { setHistoryLoading(false); return }
    try {
      const r = await fetch(`${getApiBase()}/api/coin-withdrawals`, { headers: authHeaders() })
      if (r.ok) {
        const d = await r.json()
        setWithdrawals(d.data ?? [])
      }
    } catch { /* ignore */ } finally {
      setHistoryLoading(false)
    }
  }, [])

  const fetchPayoutPrefs = useCallback(async () => {
    if (!token()) return
    try {
      const r = await fetch(`${getApiBase()}/api/user/payout-preferences`, { headers: authHeaders() })
      if (!r.ok) return
      const d = await r.json()
      const p = d.payout as {
        payout_method: string
        account_holder_name: string
        upi_id?: string | null
        bank_name?: string | null
      } | null
      if (p?.payout_method) {
        setHasSavedPayout(true)
        const label =
          p.payout_method === 'upi'
            ? `UPI · ${p.upi_id || p.account_holder_name}`
            : `${p.bank_name || 'Bank'} · ${p.account_holder_name}`
        setSavedPayoutLabel(label)
        setForm((prev) => ({
          ...prev,
          method: p.payout_method === 'bank' ? 'bank' : 'upi',
          holder: p.account_holder_name || prev.holder,
        }))
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchCoins()
    fetchHistory()
    fetchPayoutPrefs()
    const id = setInterval(() => { fetchCoins(); fetchHistory() }, 30_000)
    return () => clearInterval(id)
  }, [fetchCoins, fetchHistory, fetchPayoutPrefs])

  // Re-fetch prefs when form opens so changes in Settings are reflected immediately
  useEffect(() => {
    if (showForm) fetchPayoutPrefs()
  }, [showForm, fetchPayoutPrefs])

  // ── Submission ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    const amt = parseFloat(form.amount)
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount'
    else if (amt < 10) errs.amount = 'Minimum is 10 coins (₹1)'
    else if (amt > coins.available) errs.amount = `Max ${coins.available.toLocaleString()} available coins`

    if (useSavedPayout && !hasSavedPayout) {
      errs.amount = 'No saved payout method. Add one in Settings → Payout method.'
    }

    if (!useSavedPayout) {
      if (!form.holder.trim()) errs.holder = 'Account holder name is required'
      if (form.method === 'upi' && !form.upi_id.trim()) errs.upi_id = 'UPI ID is required'
      if (form.method === 'bank') {
        if (!form.account_number.trim()) errs.account_number = 'Account number is required'
        if (!form.ifsc_code.trim()) errs.ifsc_code = 'IFSC code is required'
        if (!form.bank_name.trim()) errs.bank_name = 'Bank name is required'
      }
    }

    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = useSavedPayout
        ? { amount: parseFloat(form.amount), use_saved_payout: true, source }
        : {
            amount: parseFloat(form.amount),
            withdrawal_method: form.method,
            account_holder_name: form.holder,
            source,
            ...(form.method === 'upi'
              ? { upi_id: form.upi_id }
              : {
                  account_number: form.account_number,
                  ifsc_code: form.ifsc_code.toUpperCase(),
                  bank_name: form.bank_name,
                }),
          }

      const r = await fetch(`${getApiBase()}/api/coin-withdrawals`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setFormError(d.error || d.message || 'Request failed. Try again.')
        return
      }

      setFormSuccess('Withdrawal request submitted! We will process it shortly.')
      setShowForm(false)
      setUseSavedPayout(false)
      setForm({ amount: '', method: 'upi', holder: '', upi_id: '', account_number: '', ifsc_code: '', bank_name: '' })
      await fetchCoins()
      await fetchHistory()
      window.dispatchEvent(new CustomEvent('coinsUpdated'))
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Field helper ───────────────────────────────────────────────────────────

  const inp = (
    name: keyof typeof form,
    placeholder: string,
    type = 'text',
    extra?: Partial<React.InputHTMLAttributes<HTMLInputElement>>
  ) => (
    <div>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => {
          setForm((p) => ({ ...p, [name]: e.target.value }))
          if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: '' }))
        }}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/15 transition-all ${
          fieldErrors[name] ? 'border-red-400' : 'border-gray-200'
        }`}
        {...extra}
      />
      {fieldErrors[name] && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {fieldErrors[name]}
        </p>
      )}
    </div>
  )

  // ── Balance section ────────────────────────────────────────────────────────

  const BalanceBar = () => (
    <div className={`rounded-2xl border ${embedded ? 'border-[#e8eef4]' : 'border-slate-100'} bg-white shadow-sm p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Total */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-1">Total coins</p>
            {coinsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            ) : (
              <>
                <p className="text-3xl sm:text-4xl font-light text-gray-900 tabular-nums leading-none">
                  {coins.total.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">≈ ₹{fmtINR(coins.total)}</p>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px self-stretch bg-gray-100" />

          {/* Available */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-1">Available</p>
            {coinsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            ) : (
              <>
                <p className="text-3xl sm:text-4xl font-light text-[#1B4965] tabular-nums leading-none">
                  {coins.available.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">≈ ₹{fmtINR(coins.available)}</p>
              </>
            )}
          </div>

          {/* Locked */}
          {coins.locked > 0 && (
            <>
              <div className="hidden sm:block w-px self-stretch bg-gray-100" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </p>
                <p className="text-3xl sm:text-4xl font-light text-amber-500 tabular-nums leading-none">
                  {coins.locked.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">Unlocks after 8 days</p>
              </div>
            </>
          )}
        </div>

        {/* Request button */}
        <button
          type="button"
          onClick={() => { setShowForm((p) => !p); setFormError(null); setFormSuccess(null) }}
          className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors self-start"
          style={{ backgroundColor: showForm ? '#94a3b8' : 'var(--arctic-blue-primary, #4B97C9)' }}
        >
          {showForm ? 'Cancel' : 'Request withdrawal'}
        </button>
      </div>

      {coins.locked > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
          <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            {coins.locked.toLocaleString()} coins are locked for 8 days from when referral purchases occurred — this
            prevents chargebacks. They become available automatically.
          </p>
        </div>
      )}

      {/* Payout method pill */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {hasSavedPayout ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Payout: {savedPayoutLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
            No saved payout method
          </span>
        )}
        <a
          href="#/user/blog/settings?view=payout"
          className="text-xs font-medium underline underline-offset-2 text-[#4B97C9] hover:opacity-80 transition-opacity"
        >
          {hasSavedPayout ? 'Edit' : 'Add bank / UPI'}
        </a>
      </div>

      {formSuccess && (
        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {formSuccess}
        </div>
      )}
    </div>
  )

  // ── Withdrawal form ────────────────────────────────────────────────────────

  const WithdrawalForm = () => (
    <div className={`rounded-2xl border ${embedded ? 'border-[#e8eef4]' : 'border-slate-100'} bg-white shadow-sm p-5 sm:p-6`}>
      <h3 className="text-base font-semibold text-[#1B4965] mb-5">Withdrawal request</h3>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Amount (coins)
          </label>
          <div className="relative">
            <input
              type="number"
              value={form.amount}
              min={10}
              max={coins.available}
              onChange={(e) => {
                setForm((p) => ({ ...p, amount: e.target.value }))
                if (fieldErrors.amount) setFieldErrors((p) => ({ ...p, amount: '' }))
              }}
              placeholder={`Up to ${coins.available.toLocaleString()} available`}
              className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/15 pr-32 ${
                fieldErrors.amount ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {form.amount && !isNaN(parseFloat(form.amount)) && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                ≈ ₹{fmtINR(parseFloat(form.amount) || 0)}
              </span>
            )}
          </div>
          {fieldErrors.amount ? (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />{fieldErrors.amount}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-400">Min 10 coins · 10 coins = ₹1 · Available: {coins.available.toLocaleString()}</p>
          )}
          {/* Quick-fill buttons */}
          {coins.available >= 10 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {[Math.floor(coins.available * 0.25), Math.floor(coins.available * 0.5), coins.available]
                .filter((v, i, a) => v >= 10 && a.indexOf(v) === i)
                .map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, amount: String(v) }))}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-[#4B97C9] hover:text-[#1B4965] transition-colors"
                  >
                    {v === coins.available ? 'All' : v.toLocaleString()}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Saved payout shortcut */}
        {hasSavedPayout && (
          <div className="rounded-xl bg-gray-50/80 border border-gray-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useSavedPayout}
                onChange={(e) => setUseSavedPayout(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 accent-[#1B4965]"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Send to saved payout method</p>
                <p className="text-xs text-gray-500 mt-0.5">{savedPayoutLabel}</p>
              </div>
            </label>
          </div>
        )}

        {/* Manual bank/UPI fields */}
        {!useSavedPayout && (
          <>
            {/* Method toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Payout method
              </label>
              <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50/80">
                {(['upi', 'bank'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, method: m }))}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      form.method === m ? 'bg-white text-[#1B4965] shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {m === 'upi' ? 'UPI' : 'Bank account'}
                  </button>
                ))}
              </div>
            </div>

            {/* Holder */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Account holder name
              </label>
              {inp('holder', 'Name as per bank / UPI', 'text', { autoComplete: 'name' })}
            </div>

            {form.method === 'upi' ? (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">UPI ID</label>
                {inp('upi_id', 'name@paytm / ybl / okaxis…')}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Bank name
                  </label>
                  {inp('bank_name', 'e.g. HDFC Bank')}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Account number
                  </label>
                  {inp('account_number', 'Account number', 'text', { autoComplete: 'off' })}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    IFSC code
                  </label>
                  {inp('ifsc_code', 'HDFC0001234', 'text', { maxLength: 11, className: 'font-mono' })}
                </div>
              </>
            )}

            {/* Save link */}
            <p className="text-xs text-gray-400">
              Save these for next time:{' '}
              <a href="#/user/blog/settings?view=payout" className="text-[#4B97C9] underline underline-offset-2">
                Settings → Payout method
              </a>
            </p>
          </>
        )}

        {formError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--arctic-blue-primary, #4B97C9)' }}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
    </div>
  )

  // ── History section ────────────────────────────────────────────────────────

  const HistorySection = () => (
    <div className={`rounded-2xl border ${embedded ? 'border-[#e8eef4]' : 'border-slate-100'} bg-white shadow-sm overflow-hidden`}>
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#1B4965]">Withdrawal history</h3>
        {historyLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-300" />}
      </div>

      {!historyLoading && withdrawals.length === 0 ? (
        <div className="flex flex-col items-center py-12 px-6 text-center">
          <Wallet className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm text-gray-500">No withdrawal requests yet</p>
          <p className="text-xs text-gray-400 mt-1">Requests appear here once submitted</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {withdrawals.map((w) => (
            <li key={w.id} className="px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {w.withdrawal_method === 'bank' ? (
                  <Building2 className="w-5 h-5 text-blue-500" />
                ) : (
                  <CreditCard className="w-5 h-5 text-purple-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1.5">
                  <span className="text-base font-semibold text-gray-900 tabular-nums">
                    {w.amount.toLocaleString()} coins
                  </span>
                  <span className="text-sm text-gray-500">≈ ₹{fmtINR(w.amount)}</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{fmtDate(w.created_at)}</p>
                <StatusBadge status={w.status} />
                <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                  <p>
                    {w.withdrawal_method === 'bank' ? 'Bank transfer' : 'UPI'} · {w.account_holder_name}
                    {w.withdrawal_method === 'bank' && w.bank_name ? ` · ${w.bank_name}` : ''}
                    {w.withdrawal_method === 'upi' && w.upi_id ? ` · ${w.upi_id}` : ''}
                  </p>
                  {w.transaction_id && <p>Txn: {w.transaction_id}</p>}
                  {w.rejection_reason && <p className="text-red-600">Reason: {w.rejection_reason}</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  if (embedded) {
    return (
      <div className="space-y-4">
        <BalanceBar />
        {showForm && <WithdrawalForm />}
        <HistorySection />
      </div>
    )
  }

  // Page variant — same outer shell, same spacing as old CoinWithdrawal
  return (
    <div className="space-y-6">
      <BalanceBar />
      {showForm && <WithdrawalForm />}
      <HistorySection />
    </div>
  )
}
