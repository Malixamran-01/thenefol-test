import React from 'react'
import { FileText, Shield, AlertTriangle, CheckCircle, Mail, Scale } from 'lucide-react'

export default function TermsOfService() {
  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Terms of Service
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Welcome to Nefol. By accessing or using our website and services, you agree to comply with 
            and be bound by the following Terms of Use.
          </p>
        </div>

        {/* Overview */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Overview
          </h2>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              This website is operated by Nefol Aesthetics Private Limited. Throughout the site, the terms 
              "we", "us" and "our" refer to Nefol. Nefol offers this website, including all information, 
              tools and Services available from this site to you, the user, conditioned upon your acceptance 
              of all terms, conditions, policies and notices stated here.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              By visiting our site and/or purchasing something from us, you engage in our "Service" and 
              agree to be bound by the following terms and conditions ("Terms of Service", "Terms"), 
              including those additional terms and conditions and policies referenced herein and/or available by hyperlink.
            </p>
          </div>
        </div>

        {/* Key Sections */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Key Terms & Conditions
          </h2>
          <div className="space-y-6">
            {/* Section 1 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Section 1 - Online Store Terms
              </h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  You must be at least the age of majority in your state or province of residence
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  You may not use our products for any illegal or unauthorized purpose
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  You must not transmit any worms or viruses or any code of a destructive nature
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  A breach or violation of any of the Terms will result in an immediate termination of your Services
                </li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Section 2 - General Conditions
              </h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  We reserve the right to refuse Service to anyone for any reason at any time
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  Credit card information is always encrypted during transfer over networks
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service
                </li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Section 4 - Modifications to the Service and Prices
              </h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                  Prices for our products are subject to change without notice
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                  We reserve the right at any time to modify or discontinue the Service without notice
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2 mt-0.5 flex-shrink-0" />
                  We shall not be liable for any modification, price change, suspension or discontinuance of the Service
                </li>
              </ul>
            </div>

            {/* Section 6 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Section 6 - Accuracy of Billing and Account Information
              </h3>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  We reserve the right to refuse any order you place with us
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  You agree to provide current, complete and accurate purchase and account information
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  You agree to promptly update your account and other information as needed
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Important Sections */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Important Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Prohibited Uses
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                You are prohibited from using the site for:
              </p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                <li>• Any unlawful purpose</li>
                <li>• Violating any laws or regulations</li>
                <li>• Infringing upon intellectual property rights</li>
                <li>• Harassing, abusing, or discriminating</li>
                <li>• Submitting false or misleading information</li>
                <li>• Uploading viruses or malicious code</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Disclaimer of Warranties
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                We do not guarantee that your use of our Service will be uninterrupted, timely, secure or error-free. 
                The Service is provided 'as is' and 'as available' without any warranties or conditions of any kind.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Information */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Legal Information
          </h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Scale className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Governing Law
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    These Terms of Service and any separate agreements whereby we provide you Services shall be 
                    governed by and construed in accordance with the laws of India. All disputes if any arising 
                    out of or in connection with these terms shall be subject to the exclusive jurisdiction 
                    of the courts in Lucknow India.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Changes to Terms of Service
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
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
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Contact Information
          </h2>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Nefol Aesthetics Private Limited
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Questions about the Terms of Service should be sent to us at:
              </p>
              <a 
                href="mailto:support@thenefol.com" 
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-lg font-semibold"
              >
                <Mail className="w-5 h-5 mr-2" />
                support@thenefol.com
              </a>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Questions About Our Terms?</h2>
          <p className="text-xl mb-8 opacity-90">
            If you have any questions about these Terms of Service, please don't hesitate to contact us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:support@thenefol.com" 
              className="inline-block bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-5 h-5 inline mr-2" />
              Contact Support
            </a>
            <a 
              href="#/user/contact" 
              className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
            >
              Support Center
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
