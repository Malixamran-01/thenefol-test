import React from 'react'
import { Truck, Clock, Package, MapPin, AlertCircle, CheckCircle, Mail } from 'lucide-react'

export default function ShippingPolicy() {
  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Truck className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Shipping Policy
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            At Nefol, we are committed to ensuring that your experience with our premium cosmetic products 
            is seamless and enjoyable from the moment you place an order to when it arrives at your doorstep.
          </p>
        </div>

        {/* Order Processing */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            1. Order Processing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-4">
                  <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Processing Time
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                All orders are processed within 1-2 business days (excluding weekends and holidays) 
                after payment confirmation. Orders placed after 12 PM will be processed the following business day.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4">
                  <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Order Confirmation
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                You will receive an email confirmation with your order details as soon as your order is placed.
              </p>
            </div>
          </div>
        </div>

        {/* Shipping Methods */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            2. Shipping Methods & Delivery Times
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Standard Shipping
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Typically takes 3-7 business days within India. Shipping times may vary based on your 
                location and external conditions.
              </p>
              <div className="flex items-center text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Free on orders over ₹1999</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Express Shipping
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Available upon request, with an estimated delivery time of 1-3 business days. 
                Additional charges may apply.
              </p>
              <div className="flex items-center text-purple-600 dark:text-purple-400">
                <Package className="w-5 h-5 mr-2" />
                <span className="font-semibold">Calculated at checkout</span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Charges */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            3. Shipping Charges
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Standard Shipping
                </h3>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                    Free on orders over ₹1999
                  </li>
                  <li className="flex items-center">
                    <span className="text-orange-600 dark:text-orange-400 mr-2">•</span>
                    For orders under ₹599, a flat rate of ₹99 will be applied
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Express Shipping
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Calculated at checkout based on location and package weight.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Tracking */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            4. Order Tracking
          </h2>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Once your order has been shipped, you will receive a shipment confirmation email with 
                  a tracking number and a link to track your package.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* International Shipping */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            5. International Shipping
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Availability
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                We offer international shipping to select countries. Please check at checkout if we ship to your destination.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Customs Fees
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Any customs, duties, or taxes imposed by the destination country are the responsibility of the customer.
              </p>
            </div>
          </div>
        </div>

        {/* Delays & Issues */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            6. Delays & Issues
          </h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Unforeseen Delays
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    While we strive to meet all estimated delivery times, Nefol is not responsible for delays 
                    caused by external factors such as customs clearance, severe weather conditions, or carrier issues.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Lost or Damaged Packages
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    If your package is lost or arrives damaged, please contact us at 
                    <a href="mailto:support@thenefol.com" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
                      support@thenefol.com
                    </a> within 7 days of delivery for assistance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Additional Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Incorrect Shipping Information
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Customers are responsible for providing accurate shipping details. Any packages returned 
                due to incorrect or incomplete addresses will require an additional shipping fee for reshipment.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Non-Delivery Areas
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                We do not currently ship to restricted areas. Please check with our support team for 
                specific delivery restrictions.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Questions About Shipping?</h2>
          <p className="text-xl mb-8 opacity-90">
            For any questions or concerns regarding shipping, please reach out to our customer support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:support@thenefol.com" 
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-5 h-5 inline mr-2" />
              Contact Support
            </a>
            <a 
              href="#/user/contact" 
              className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Support Center
            </a>
          </div>
          <p className="mt-6 text-lg opacity-90">
            Thank you for choosing Nefol. We look forward to serving you and helping you achieve 
            radiant beauty with our high-quality cosmetic products!
          </p>
        </div>
      </div>
    </main>
  )
}
