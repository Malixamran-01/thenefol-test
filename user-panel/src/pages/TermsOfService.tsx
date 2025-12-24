import React from 'react'
import { FileText, Shield, AlertTriangle, CheckCircle, Mail, Scale } from 'lucide-react'

export default function TermsOfService() {
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
            <FileText className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--arctic-blue-primary)' }} />
          </div>
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Terms of Service
          </h1>
          <p 
            className="text-sm sm:text-base font-light max-w-3xl mx-auto tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Welcome to NEFOL®. By accessing or using our website and services, you agree to comply with 
            and be bound by the following Terms of Use.
          </p>
        </div>

        {/* Overview */}
        <div className="mb-8 sm:mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Overview
          </h2>
          <div className="rounded-2xl p-6 sm:p-8 md:p-10" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
            <p 
              className="font-light leading-relaxed mb-4 tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              This website is operated by NEFOL® Aesthetics Private Limited. Throughout the site, the terms 
              "we", "us" and "our" refer to NEFOL®. NEFOL® offers this website, including all information, 
              tools and Services available from this site to you, the user, conditioned upon your acceptance 
              of all terms, conditions, policies and notices stated here.
            </p>
            <p 
              className="font-light leading-relaxed tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              By visiting our site and/or purchasing something from us, you engage in our "Service" and 
              agree to be bound by the following terms and conditions ("Terms of Service", "Terms"), 
              including those additional terms and conditions and policies referenced herein and/or available by hyperlink.
            </p>
          </div>
        </div>

        {/* Key Sections */}
        <div className="mb-8 sm:mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Key Terms & Conditions
          </h2>
          <div className="space-y-4 sm:space-y-6">
            {/* Section 1 */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg sm:text-xl font-light mb-3 sm:mb-4 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Section 1 - Online Store Terms
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    You must be at least the age of majority in your state or province of residence
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    You may not use our products for any illegal or unauthorized purpose
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    You must not transmit any worms or viruses or any code of a destructive nature
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    A breach or violation of any of the Terms will result in an immediate termination of your Services
                  </span>
                </li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg sm:text-xl font-light mb-3 sm:mb-4 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Section 2 - General Conditions
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Shield className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    We reserve the right to refuse Service to anyone for any reason at any time
                  </span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    Credit card information is always encrypted during transfer over networks
                  </span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service
                  </span>
                </li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg sm:text-xl font-light mb-3 sm:mb-4 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Section 4 - Modifications to the Service and Prices
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    Prices for our products are subject to change without notice
                  </span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    We reserve the right at any time to modify or discontinue the Service without notice
                  </span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    We shall not be liable for any modification, price change, suspension or discontinuance of the Service
                  </span>
                </li>
              </ul>
            </div>

            {/* Section 6 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-xl font-light mb-4 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Section 6 - Accuracy of Billing and Account Information
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    We reserve the right to refuse any order you place with us
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    You agree to provide current, complete and accurate purchase and account information
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mr-2 mt-0.5" style={{ color: 'var(--arctic-blue-primary)' }} />
                  <span 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    You agree to promptly update your account and other information as needed
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Sections */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Important Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl p-6 border" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Prohibited Uses
              </h3>
              <p 
                className="font-light text-sm mb-3 tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                You are prohibited from using the site for:
              </p>
              <ul className="space-y-1">
                <li className="font-light text-sm tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>• Any unlawful purpose</li>
                <li className="font-light text-sm tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>• Violating any laws or regulations</li>
                <li className="font-light text-sm tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>• Infringing upon intellectual property rights</li>
                <li className="font-light text-sm tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>• Harassing, abusing, or discriminating</li>
                <li className="font-light text-sm tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>• Submitting false or misleading information</li>
                <li className="font-light text-sm tracking-wide" style={{ color: '#666', letterSpacing: '0.05em' }}>• Uploading viruses or malicious code</li>
              </ul>
            </div>

            <div className="rounded-xl p-6 border" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-light)' }}>
              <h3 
                className="text-lg font-light mb-3 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                Disclaimer of Warranties
              </h3>
              <p 
                className="font-light text-sm tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                We do not guarantee that your use of our Service will be uninterrupted, timely, secure or error-free. 
                The Service is provided 'as is' and 'as available' without any warranties or conditions of any kind.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Information */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Legal Information
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                  <Scale className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
                </div>
                <div>
                  <h3 
                    className="text-lg font-light mb-2 tracking-wide"
                    style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                  >
                    Governing Law
                  </h3>
                  <p 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    These Terms of Service and any separate agreements whereby we provide you Services shall be 
                    governed by and construed in accordance with the laws of India. All disputes if any arising 
                    out of or in connection with these terms shall be subject to the exclusive jurisdiction 
                    of the courts in Lucknow India.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--arctic-blue-light)' }}>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                  <FileText className="w-6 h-6" style={{ color: 'var(--arctic-blue-primary)' }} />
                </div>
                <div>
                  <h3 
                    className="text-lg font-light mb-2 tracking-wide"
                    style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                  >
                    Changes to Terms of Service
                  </h3>
                  <p 
                    className="font-light tracking-wide"
                    style={{ color: '#666', letterSpacing: '0.05em' }}
                  >
                    We reserve the right, at our sole discretion, to update, change or replace any part of these 
                    Terms of Service by posting updates and changes to our website. It is your responsibility to 
                    check our website periodically for changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-12">
          <h2 
            className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Contact Information
          </h2>
          <div className="rounded-xl p-6 border" style={{ backgroundColor: 'var(--arctic-blue-lighter)', borderColor: 'var(--arctic-blue-light)' }}>
            <div className="text-center">
              <h3 
                className="text-xl font-light mb-4 tracking-wide"
                style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
              >
                NEFOL® Aesthetics Private Limited
              </h3>
              <p 
                className="font-light mb-4 tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Questions about the Terms of Service should be sent to us at:
              </p>
              <a 
                href="mailto:support@thenefol.com" 
                className="inline-flex items-center hover:underline font-light tracking-wide"
                style={{ color: 'var(--arctic-blue-primary)', letterSpacing: '0.05em' }}
              >
                <Mail className="w-5 h-5 mr-2" />
                support@thenefol.com
              </a>
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
              Questions About Our Terms?
            </h2>
            <p 
              className="text-sm sm:text-base font-light mb-8 tracking-wide max-w-2xl mx-auto"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              If you have any questions about these Terms of Service, please don't hesitate to contact us.
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
