import React from 'react'
import { Shield, Eye, Lock, Users, Globe, Mail } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Privacy Policy
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            At Nefol, your privacy is of utmost importance to us. Learn how we collect, use, and protect your information.
          </p>
        </div>

        {/* Introduction */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Nefol Privacy Policy
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            At Nefol, your privacy is of utmost importance to us. This Privacy Policy explains how we collect, 
            use, disclose, and safeguard your information when you visit our website www.thenefol.com or make 
            use of our services. Please read this policy carefully to understand our practices regarding your personal data.
          </p>
        </div>

        {/* Information We Collect */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            1. Information We Collect
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Personal Information
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Name, email address, phone number, shipping and billing addresses, payment information, 
                and any other information you voluntarily provide to us.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Automatically Collected Information
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                IP address, browser type, operating system, and other usage details when you access our website.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Cookies and Tracking Technologies
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                We may use cookies, web beacons, and similar tracking technologies to collect information 
                about your activity on our website.
              </p>
            </div>
          </div>
        </div>

        {/* How We Use Your Information */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            2. How We Use Your Information
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              We use your information to:
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                Process orders and manage your purchases.
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                Communicate with you about your orders, updates, and promotional materials.
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                Improve and personalize your experience on our website.
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                Enhance our product offerings and services.
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                Comply with legal obligations and enforce our terms.
              </li>
            </ul>
          </div>
        </div>

        {/* Sharing Your Information */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            3. Sharing Your Information
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              We do not sell your personal data. However, we may share your data with:
            </p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li className="flex items-start">
                <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                <strong>Service Providers:</strong> Third-party companies that perform services on our behalf (e.g., shipping companies, payment processors).
              </li>
              <li className="flex items-start">
                <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                <strong>Business Transfers:</strong> In the event of a merger, sale, or transfer of company assets, your data may be part of the transferred assets.
              </li>
              <li className="flex items-start">
                <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                <strong>Compliance with Laws:</strong> We may disclose your data to comply with legal obligations or in response to lawful requests.
              </li>
            </ul>
          </div>
        </div>

        {/* Your Rights and Choices */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            4. Your Rights and Choices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Access and Correction
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                You have the right to access and correct any personal information we hold about you.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Opt-Out
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                You can opt out of marketing communications at any time by following the unsubscribe 
                link in our emails or contacting us directly.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Data Deletion
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                You may request the deletion of your data under certain conditions.
              </p>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            5. Security of Your Information
          </h2>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
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
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            6. Third-Party Links
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Our website may contain links to third-party websites. We are not responsible for the content, 
              privacy policies, or practices of these external sites. We encourage you to review the privacy 
              policies of any third-party sites you visit.
            </p>
          </div>
        </div>

        {/* Changes to Policy */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            7. Changes to This Privacy Policy
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              We may update this Privacy Policy from time to time. Any changes will be posted on this page 
              with an updated effective date. Your continued use of our services after such changes indicates 
              your consent to the updated policy.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Questions About Privacy?</h2>
          <p className="text-xl mb-8 opacity-90">
            Your privacy matters to us, and we are committed to protecting your personal information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:support@thenefol.com" 
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-5 h-5 inline mr-2" />
              Contact Us
            </a>
            <a 
              href="#/user/contact" 
              className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Support Center
            </a>
          </div>
          <p className="mt-6 text-lg opacity-90">
            Thank you for trusting Nefol.
          </p>
        </div>
      </div>
    </main>
  )
}
