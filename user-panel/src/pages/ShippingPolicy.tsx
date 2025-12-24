import React from 'react'
import { Truck, Clock, Package, MapPin, AlertCircle, CheckCircle, Mail } from 'lucide-react'

export default function ShippingPolicy() {
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
            <Truck className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--arctic-blue-primary)' }} />
          </div>
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Shipping Policy
          </h1>
          <p 
            className="text-sm sm:text-base font-light max-w-3xl mx-auto tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            At NEFOL®, we are committed to ensuring that your experience with our premium cosmetic products 
            is seamless and enjoyable from the moment you place an order to when it arrives at your doorstep.
          </p>
        </div>

        {/* Order Processing */}
        <div className="mb-8 sm:mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            1. Order Processing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                  <Clock className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
                </div>
                <h3 
                  className="text-lg font-light tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Processing Time
                </h3>
              </div>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                All orders are processed within 1-2 business days (excluding weekends and holidays) 
                after payment confirmation. Orders placed after 12 PM will be processed the following business day.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                  <CheckCircle className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
                </div>
                <h3 
                  className="text-lg font-light tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Order Confirmation
                </h3>
              </div>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                You will receive an email confirmation with your order details as soon as your order is placed.
              </p>
            </div>
          </div>
        </div>

        {/* Shipping Methods */}
        <div className="mb-8 sm:mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            2. Shipping Methods & Delivery Times
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-xl p-4 sm:p-6 border" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg sm:text-xl font-light mb-2 sm:mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Standard Shipping
              </h3>
              <p 
                className="font-light mb-4 tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Typically takes 3-7 business days within India. Shipping times may vary based on your 
                location and external conditions.
              </p>
              <div className="flex items-center" style={{ color: 'var(--arctic-blue-primary)' }}>
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Free on orders over ₹1999</span>
              </div>
            </div>

            <div className="rounded-xl p-4 sm:p-6 border" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg sm:text-xl font-light mb-2 sm:mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Express Shipping
              </h3>
              <p 
                className="font-light mb-4 tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Available upon request, with an estimated delivery time of 1-3 business days. 
                Additional charges may apply.
              </p>
              <div className="flex items-center" style={{ color: 'var(--arctic-blue-primary)' }}>
                <Package className="w-5 h-5 mr-2" />
                <span className="font-light tracking-wide" style={{ letterSpacing: '0.05em' }}>Calculated at checkout</span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Charges */}
        <div className="mb-8 sm:mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            3. Shipping Charges
          </h2>
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 
                  className="text-lg font-light mb-3 tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Standard Shipping
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" style={{ color: 'var(--arctic-blue-primary)' }} />
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      Free on orders over ₹1999
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      For orders under ₹599, a flat rate of ₹99 will be applied
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 
                  className="text-lg font-light mb-3 tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Express Shipping
                </h3>
                <p 
                  className="font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  Calculated at checkout based on location and package weight.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Tracking */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            4. Order Tracking
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
                  Once your order has been shipped, you will receive a shipment confirmation email with 
                  a tracking number and a link to track your package.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* International Shipping */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            5. International Shipping
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Availability
              </h3>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                We offer international shipping to select countries. Please check at checkout if we ship to your destination.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Customs Fees
              </h3>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Any customs, duties, or taxes imposed by the destination country are the responsibility of the customer.
              </p>
            </div>
          </div>
        </div>

        {/* Delays & Issues */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            6. Delays & Issues
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                  <AlertCircle className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
                </div>
                <div>
                  <h3 
                    className="text-lg font-light mb-2 tracking-wide"
                    style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                  >
                    Unforeseen Delays
                  </h3>
                  <p 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    While we strive to meet all estimated delivery times, NEFOL® is not responsible for delays 
                    caused by external factors such as customs clearance, severe weather conditions, or carrier issues.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                  <Package className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
                </div>
                <div>
                  <h3 
                    className="text-lg font-light mb-2 tracking-wide"
                    style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                  >
                    Lost or Damaged Packages
                  </h3>
                  <p 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    If your package is lost or arrives damaged, please contact us at 
                    <a href="mailto:support@thenefol.com" className="hover:underline ml-1" style={{ color: 'var(--arctic-blue-primary)' }}>
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
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Additional Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Incorrect Shipping Information
              </h3>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Customers are responsible for providing accurate shipping details. Any packages returned 
                due to incorrect or incomplete addresses will require an additional shipping fee for reshipment.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Non-Delivery Areas
              </h3>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                We do not currently ship to restricted areas. Please check with our support team for 
                specific delivery restrictions.
              </p>
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
              Questions About Shipping?
            </h2>
            <p 
              className="text-sm sm:text-base font-light mb-8 tracking-wide max-w-2xl mx-auto"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              For any questions or concerns regarding shipping, please reach out to our customer support team.
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
            <p 
              className="mt-6 text-sm sm:text-base font-light tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              Thank you for choosing NEFOL®. We look forward to serving you and helping you achieve 
              radiant beauty with our high-quality cosmetic products!
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
