import React from 'react'
import { RotateCcw, Clock, Package, AlertCircle, CheckCircle, Mail } from 'lucide-react'

export default function RefundPolicy() {
  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <RotateCcw className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Refund Policy
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            We have a 07-day return policy, which means you have 07 days after receiving your item to request a return.
          </p>
        </div>

        {/* Return Policy */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Return Policy
          </h2>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Eligibility Requirements
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  To be eligible for a return, your item must be:
                </p>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    In the same condition that you received it
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    Unworn or unused
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    With tags attached
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    In its original packaging
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    With receipt or proof of purchase
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  How to Start a Return
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">1</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Contact us at <a href="mailto:support@thenefol.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@thenefol.com</a>
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">2</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      If your return is accepted, we'll send you a return shipping label
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">3</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Follow instructions on how and where to send your package
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    <strong>Important:</strong> Items sent back to us without first requesting a return will not be accepted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Damages and Issues */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Damages and Issues
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Please inspect your order upon reception and contact us immediately if the item is defective, 
                  damaged or if you receive the wrong item, so that we can evaluate the issue and make it right.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Exceptions */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Exceptions / Non-Returnable Items
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Cannot Be Returned
              </h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start">
                  <span className="text-red-600 dark:text-red-400 mr-2">•</span>
                  Perishable goods (Special Order)
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 dark:text-red-400 mr-2">•</span>
                  Personal care goods (such as beauty products)
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 dark:text-red-400 mr-2">•</span>
                  Hazardous materials
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 dark:text-red-400 mr-2">•</span>
                  Flammable liquids or gases
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 dark:text-red-400 mr-2">•</span>
                  Sale items
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 dark:text-red-400 mr-2">•</span>
                  Gift cards
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Need Clarification?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Please get in touch if you have questions or concerns about your specific item.
              </p>
              <a 
                href="mailto:support@thenefol.com" 
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </a>
            </div>
          </div>
        </div>

        {/* Exchanges */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Exchanges
          </h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  The fastest way to ensure you get what you want is to return the item you have, and once 
                  the return is accepted, make a separate purchase for the new item.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* EU Cooling Off Period */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            European Union 14 Day Cooling Off Period
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Notwithstanding the above, if the merchandise is being shipped into the European Union, 
                  you have the right to cancel or return your order within 14 days, for any reason and 
                  without a justification.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  As above, your item must be in the same condition that you received it, unworn or unused, 
                  with tags, and in its original packaging. You'll also need the receipt or proof of purchase.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Refunds */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Refunds
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Refund Process
              </h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  Once we receive and inspect your return, you will be notified of the approval or rejection
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  If approved, refunds are processed to your original payment method within 7–10 business days
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  If more than 7 business days have passed since approval, contact us at support@thenefol.com
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Refund Charges
              </h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start">
                  <span className="text-orange-600 dark:text-orange-400 mr-2">•</span>
                  Refund charges equivalent to the original shipping cost will be deducted from your refund
                </li>
                <li className="flex items-start">
                  <span className="text-orange-600 dark:text-orange-400 mr-2">•</span>
                  The original shipping fee is non-refundable
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Need Help with Returns?</h2>
          <p className="text-xl mb-8 opacity-90">
            You can always contact us for any return question at support@thenefol.com
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:support@thenefol.com" 
              className="inline-block bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-5 h-5 inline mr-2" />
              Contact Support
            </a>
            <a 
              href="#/user/contact" 
              className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition-colors"
            >
              Support Center
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
