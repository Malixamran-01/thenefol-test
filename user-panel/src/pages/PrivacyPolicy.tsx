import React from 'react'
import { Shield, Eye, Lock, Users, Globe, Mail } from 'lucide-react'

export default function PrivacyPolicy() {
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
            <Shield className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--arctic-blue-primary)' }} />
          </div>
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Privacy Policy
          </h1>
          <p 
            className="text-sm sm:text-base font-light max-w-3xl mx-auto tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            At Nefol, your privacy is of utmost importance to us. Learn how we collect, use, and protect your information.
          </p>
        </div>

        {/* Introduction */}
        <div className="rounded-2xl p-6 sm:p-8 md:p-10 mb-8 sm:mb-12" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
          <h2 
            className="text-xl sm:text-2xl font-light mb-3 sm:mb-4 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            NEFOL® Privacy Policy
          </h2>
          <p 
            className="font-light leading-relaxed tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            At NEFOL®, your privacy is of utmost importance to us. This Privacy Policy explains how we collect, 
            use, disclose, and safeguard your information when you visit our website www.thenefol.com or make 
            use of our services. Please read this policy carefully to understand our practices regarding your personal data.
          </p>
        </div>

        {/* Information We Collect */}
        <div className="mb-8 sm:mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            1. Information We Collect
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Users className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Personal Information
              </h3>
              <p 
                className="text-sm font-light tracking-wide leading-relaxed"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Name, email address, phone number, shipping and billing addresses, payment information, 
                and any other information you voluntarily provide to us.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Eye className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Automatically Collected Information
              </h3>
              <p 
                className="text-sm font-light tracking-wide leading-relaxed"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                IP address, browser type, operating system, and other usage details when you access our website.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Globe className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Cookies and Tracking Technologies
              </h3>
              <p 
                className="text-sm font-light tracking-wide leading-relaxed"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                We may use cookies, web beacons, and similar tracking technologies to collect information 
                about your activity on our website.
              </p>
            </div>
          </div>
        </div>

        {/* How We Use Your Information */}
        <div className="mb-8 sm:mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            2. How We Use Your Information
          </h2>
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
            <p 
              className="font-light mb-4 tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              We use your information to:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                <span 
                  className="font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  Process orders and manage your purchases.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                <span 
                  className="font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  Communicate with you about your orders, updates, and promotional materials.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                <span 
                  className="font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  Improve and personalize your experience on our website.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                <span 
                  className="font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  Enhance our product offerings and services.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                <span 
                  className="font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  Comply with legal obligations and enforce our terms.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Sharing Your Information */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            3. Sharing Your Information
          </h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
            <p 
              className="font-light mb-4 tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              We do not sell your personal data. However, we may share your data with:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                <span 
                  className="font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  <strong>Service Providers:</strong> Third-party companies that perform services on our behalf (e.g., shipping companies, payment processors).
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                <span 
                  className="font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  <strong>Business Transfers:</strong> In the event of a merger, sale, or transfer of company assets, your data may be part of the transferred assets.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: 'var(--arctic-blue-primary)' }}>•</span>
                <span 
                  className="font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  <strong>Compliance with Laws:</strong> We may disclose your data to comply with legal obligations or in response to lawful requests.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Your Rights and Choices */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            4. Your Rights and Choices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Access and Correction
              </h3>
              <p 
                className="text-sm font-light tracking-wide leading-relaxed"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                You have the right to access and correct any personal information we hold about you.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Opt-Out
              </h3>
              <p 
                className="text-sm font-light tracking-wide leading-relaxed"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                You can opt out of marketing communications at any time by following the unsubscribe 
                link in our emails or contacting us directly.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Data Deletion
              </h3>
              <p 
                className="text-sm font-light tracking-wide leading-relaxed"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                You may request the deletion of your data under certain conditions.
              </p>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            5. Security of Your Information
          </h2>
          <div className="rounded-xl p-6 border" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-light)' }}>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Lock className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <div>
                <p 
                  className="font-light leading-relaxed tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  We implement reasonable technical and organizational measures to protect your data. However, 
                  no method of transmission over the internet is entirely secure. While we strive to use 
                  acceptable means to safeguard your information, we cannot guarantee its absolute security.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Third-Party Links */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            6. Third-Party Links
          </h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
            <p 
              className="font-light leading-relaxed tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              Our website may contain links to third-party websites. We are not responsible for the content, 
              privacy policies, or practices of these external sites. We encourage you to review the privacy 
              policies of any third-party sites you visit.
            </p>
          </div>
        </div>

        {/* Changes to Policy */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            7. Changes to This Privacy Policy
          </h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
            <p 
              className="font-light leading-relaxed tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              We may update this Privacy Policy from time to time. Any changes will be posted on this page 
              with an updated effective date. Your continued use of our services after such changes indicates 
              your consent to the updated policy.
            </p>
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
              Questions About Privacy?
            </h2>
            <p 
              className="text-sm sm:text-base font-light mb-8 tracking-wide max-w-2xl mx-auto"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              Your privacy matters to us, and we are committed to protecting your personal information.
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
                CONTACT US
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
              Thank you for trusting NEFOL®.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
