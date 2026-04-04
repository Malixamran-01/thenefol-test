import React from 'react'
import { ArrowLeft } from 'lucide-react'
import WithdrawalPanel from '../components/WithdrawalPanel'

export default function CoinWithdrawal() {
  return (
    <main
      className="min-h-screen overflow-x-hidden py-8 sm:py-12 md:py-16"
      style={{ backgroundColor: '#F4F9F9', fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}
    >
      <style>{`
        :root {
          --arctic-blue-primary: rgb(75,151,201);
          --arctic-blue-primary-hover: rgb(60,120,160);
          --arctic-blue-primary-dark: rgb(50,100,140);
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <button
          onClick={() => (window.location.hash = '#/user/nefol-coins')}
          className="flex items-center gap-2 mb-6 text-sm font-light text-gray-500 tracking-wide transition-opacity hover:opacity-70"
          style={{ letterSpacing: '0.05em' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to coins
        </button>

        {/* Heading */}
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-light tracking-[0.1em] mb-2"
            style={{ color: '#1B4965', fontFamily: 'var(--font-heading-family)' }}
          >
            Coin withdrawal
          </h1>
          <p className="text-sm text-gray-500 font-light" style={{ letterSpacing: '0.04em' }}>
            Withdraw Nefol coins earned from purchases, referrals, and blog rewards to your bank or UPI.
          </p>
        </div>

        <WithdrawalPanel source="store" variant="page" />
      </div>
    </main>
  )
}
