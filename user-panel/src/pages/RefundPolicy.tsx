import React from 'react'
import { RotateCcw, Clock, Package, AlertCircle, CheckCircle, Mail } from 'lucide-react'

export default function RefundPolicy() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
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
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
            <RotateCcw className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--arctic-blue-primary)' }} />
          </div>
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Refund Policy
          </h1>
          <p 
            className="text-sm sm:text-base font-light max-w-3xl mx-auto tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            We have a 07-day return policy, which means you have 07 days after receiving your item to request a return.
          </p>
        </div>

        {/* Return Policy */}
        <div className="mb-8 sm:mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Return Policy
          </h2>
          <div className="rounded-2xl p-6 sm:p-8 md:p-10" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <h3 
                  className="text-lg sm:text-xl font-light mb-3 sm:mb-4 tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Eligibility Requirements
                </h3>
                <p 
                  className="font-light mb-4 tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  To be eligible for a return, your item must be:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      In the same condition that you received it
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      Unworn or unused
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      With tags attached
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      In its original packaging
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      With receipt or proof of purchase
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 
                  className="text-lg sm:text-xl font-light mb-3 sm:mb-4 tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  How to Start a Return
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                      <span className="font-light text-sm" style={{ color: 'var(--arctic-blue-primary)' }}>1</span>
                    </div>
                    <p 
                      className="font-light tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      Contact us at <a href="mailto:support@thenefol.com" className="hover:underline" style={{ color: 'var(--arctic-blue-primary)' }}>support@thenefol.com</a>
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                      <span className="font-light text-sm" style={{ color: 'var(--arctic-blue-primary)' }}>2</span>
                    </div>
                    <p 
                      className="font-light tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      If your return is accepted, we'll send you a return shipping label
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                      <span className="font-light text-sm" style={{ color: 'var(--arctic-blue-primary)' }}>3</span>
                    </div>
                    <p 
                      className="font-light tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      Follow instructions on how and where to send your package
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-primary)', borderWidth: '1px' }}>
                  <p 
                    className="text-sm font-light tracking-wide"
                    style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                  >
                    <strong>Important:</strong> Items sent back to us without first requesting a return will not be accepted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Damages and Issues */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Damages and Issues
          </h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <AlertCircle className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <div>
                <p 
                  className="font-light leading-relaxed tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  Please inspect your order upon reception and contact us immediately if the item is defective, 
                  damaged or if you receive the wrong item, so that we can evaluate the issue and make it right.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Exceptions */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Exceptions / Non-Returnable Items
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Cannot Be Returned
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    Perishable goods (Special Order)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    Personal care goods (such as beauty products)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    Hazardous materials
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    Flammable liquids or gases
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    Sale items
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    Gift cards
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Need Clarification?
              </h3>
              <p 
                className="font-light mb-4 tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Please get in touch if you have questions or concerns about your specific item.
              </p>
              <a 
                href="mailto:support@thenefol.com" 
                className="inline-flex items-center hover:underline tracking-wide"
                style={{ color: 'var(--arctic-blue-primary)', letterSpacing: '0.05em' }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </a>
            </div>
          </div>
        </div>

        {/* Exchanges */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Exchanges
          </h2>
          <div className="rounded-xl p-6 border" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-light)' }}>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Package className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <div>
                <p 
                  className="font-light leading-relaxed tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  The fastest way to ensure you get what you want is to return the item you have, and once 
                  the return is accepted, make a separate purchase for the new item.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* EU Cooling Off Period */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            European Union 14 Day Cooling Off Period
          </h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Clock className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <div>
                <p 
                  className="font-light leading-relaxed mb-4 tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  Notwithstanding the above, if the merchandise is being shipped into the European Union, 
                  you have the right to cancel or return your order within 14 days, for any reason and 
                  without a justification.
                </p>
                <p 
                  className="font-light leading-relaxed tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  As above, your item must be in the same condition that you received it, unworn or unused, 
                  with tags, and in its original packaging. You'll also need the receipt or proof of purchase.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Refunds */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Refunds
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Refund Process
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    Once we receive and inspect your return, you will be notified of the approval or rejection
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    If approved, refunds are processed to your original payment method within 7–10 business days
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    If more than 7 business days have passed since approval, contact us at support@thenefol.com
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Refund Charges
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    Refund charges equivalent to the original shipping cost will be deducted from your refund
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                  <span 
                    className="font-light tracking-wide text-sm"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    The original shipping fee is non-refundable
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center">
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-10 md:p-12">
            <h2 
              className="text-2xl sm:text-3xl font-light mb-4 tracking-[0.15em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
            >
              Need Help with Returns?
            </h2>
            <p 
              className="text-sm sm:text-base font-light mb-8 tracking-wide max-w-2xl mx-auto"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              You can always contact us for any return question at support@thenefol.com
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:support@thenefol.com" 
                className="px-8 py-3 text-white font-light transition-all duration-300 text-xs tracking-[0.15em] uppercase rounded-xl hover:opacity-90 flex items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--arctic-blue-primary)',
                  letterSpacing: '0.15em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                }}
              >
                CONTACT SUPPORT
              </a>
              <a 
                href="#/user/contact" 
                className="px-8 py-3 text-white font-light transition-all duration-300 text-xs tracking-[0.15em] uppercase rounded-xl hover:opacity-90 flex items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--arctic-blue-primary)',
                  letterSpacing: '0.15em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                }}
              >
                SUPPORT CENTER
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
