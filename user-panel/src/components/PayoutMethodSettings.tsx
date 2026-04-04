import React, { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'

type Method = 'upi' | 'bank'

export default function PayoutMethodSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [method, setMethod] = useState<Method>('upi')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [upiId, setUpiId] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [bankName, setBankName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const r = await fetch(`${getApiBase()}/api/user/payout-preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!r.ok) {
          setLoading(false)
          return
        }
        const j = await r.json()
        const p = j.payout as {
          payout_method: Method
          account_holder_name: string
          upi_id?: string | null
          account_number?: string | null
          ifsc_code?: string | null
          bank_name?: string | null
        } | null
        if (p) {
          setMethod(p.payout_method === 'bank' ? 'bank' : 'upi')
          setAccountHolderName(p.account_holder_name || '')
          setUpiId(p.upi_id || '')
          setAccountNumber(p.account_number || '')
          setIfscCode(p.ifsc_code || '')
          setBankName(p.bank_name || '')
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage({ type: 'err', text: 'Sign in to save your payout details.' })
      return
    }
    setSaving(true)
    try {
      const body: Record<string, string> = {
        payout_method: method,
        account_holder_name: accountHolderName.trim(),
      }
      if (method === 'bank') {
        body.account_number = accountNumber.trim()
        body.ifsc_code = ifscCode.trim().toUpperCase()
        body.bank_name = bankName.trim()
      } else {
        body.upi_id = upiId.trim()
      }
      const r = await fetch(`${getApiBase()}/api/user/payout-preferences`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        setMessage({ type: 'err', text: j.error || 'Could not save. Check your details.' })
        return
      }
      setMessage({ type: 'ok', text: 'Saved. Withdrawals will use this bank or UPI when you redeem coins.' })
    } catch {
      setMessage({ type: 'err', text: 'Network error. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    )
  }

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null
  if (!token) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
        <a href="#/user/login" className="font-semibold underline">
          Sign in
        </a>{' '}
        to save where we should send your Nefol coin redemptions (affiliate and blog earnings).
      </div>
    )
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <p className="text-sm text-gray-600 leading-relaxed">
        When you redeem Nefol coins on the{' '}
        <a href="#/user/coin-withdrawal" className="font-medium text-[#1B4965] underline">
          redeem
        </a>{' '}
        page, payouts are sent to this account. Razorpay or manual processing uses the same details as coin withdrawals.
      </p>

      <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50/80 w-fit">
        <button
          type="button"
          onClick={() => setMethod('upi')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            method === 'upi' ? 'bg-white text-[#1B4965] shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          UPI
        </button>
        <button
          type="button"
          onClick={() => setMethod('bank')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            method === 'bank' ? 'bg-white text-[#1B4965] shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Bank account
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Account holder name
        </label>
        <input
          type="text"
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
          required
          autoComplete="name"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
          placeholder="Name as per bank / UPI"
        />
      </div>

      {method === 'upi' ? (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">UPI ID</label>
          <input
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
            placeholder="yourname@paytm / ybl / okaxis…"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bank name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
              placeholder="e.g. HDFC Bank"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Account number
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
              autoComplete="off"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20"
              placeholder="Account number"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">IFSC code</label>
            <input
              type="text"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              required
              maxLength={11}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20 font-mono"
              placeholder="HDFC0001234"
            />
          </div>
        </div>
      )}

      {message && (
        <p
          className={`text-sm rounded-xl px-4 py-3 ${
            message.type === 'ok' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full sm:w-auto rounded-xl bg-[#1B4965] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#163d54] disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save payout method
      </button>
    </form>
  )
}
