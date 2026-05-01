import React from 'react'
import { FileText, Mail } from 'lucide-react'
import { getSiteUrl } from '../utils/apiBase'

const s = {
  body:    { color: '#555', letterSpacing: '0.04em', lineHeight: '1.75' } as React.CSSProperties,
  heading: { color: '#1a1a1a', fontFamily: 'var(--font-heading-family)', letterSpacing: '0.15em' } as React.CSSProperties,
  sub:     { color: '#1a1a1a', letterSpacing: '0.05em' } as React.CSSProperties,
  blue:    'var(--arctic-blue-primary)' as string,
  light:   'var(--arctic-blue-light)' as string,
  lighter: 'var(--arctic-blue-lighter)' as string,
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-5 sm:p-7 shadow-sm border" style={{ borderColor: s.light }}>
      <h3 className="text-base sm:text-lg font-medium mb-3" style={s.sub}>
        <span style={{ color: s.blue }}>{num}.</span> {title}
      </h3>
      <div className="font-light text-sm sm:text-base space-y-3" style={s.body}>
        {children}
      </div>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2" style={s.body}>
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.blue }} />
      <span>{children}</span>
    </li>
  )
}

export default function TermsOfService() {
  const siteUrl   = getSiteUrl()
  const tcHref    = '#/user/terms-of-service'
  const ppHref    = '#/user/privacy-policy'
  const ppFullUrl = `${siteUrl}/${ppHref}`

  return (
    <main
      className="min-h-screen bg-white overflow-x-hidden py-12 sm:py-16 md:py-20"
      style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}
    >
      <style>{`
        :root {
          --arctic-blue-primary: rgb(75,151,201);
          --arctic-blue-primary-hover: rgb(60,120,160);
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
        }
      `}</style>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="text-center mb-10 sm:mb-14">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"
            style={{ backgroundColor: s.light }}
          >
            <FileText className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: s.blue }} />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light mb-3 sm:mb-4" style={s.heading}>
            Terms &amp; Conditions
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs font-light mt-4" style={{ color: '#888', letterSpacing: '0.06em' }}>
            <span>Effective Date: May 1, 2025</span>
            <span className="hidden sm:inline">·</span>
            <span>Applicable to thenefol.com and all linked domains</span>
            <span className="hidden sm:inline">·</span>
            <span>Governed by the laws of India</span>
          </div>
        </div>

        {/* ── Intro banner ── */}
        <div className="rounded-2xl p-6 sm:p-8 mb-10 sm:mb-14" style={{ backgroundColor: s.lighter }}>
          <p className="font-light text-sm sm:text-base leading-relaxed" style={s.body}>
            These Terms and Conditions ("Terms") govern your access to and use of{' '}
            <strong className="font-medium">thenefol.com</strong> and all associated subdomains,
            mobile-optimised versions, and related digital properties (collectively, the "Site")
            operated by <strong className="font-medium">Nefol Aesthetics Private Limited</strong>{' '}
            ("Nefol", "we", "us", or "our"), incorporated under the Companies Act, 2013, with its
            Registered Office at D-2627, 12th Avenue, Gaur City 2, Ghaziabad, Uttar Pradesh – 201009, India.
          </p>
          <p className="font-light text-sm sm:text-base leading-relaxed mt-3" style={s.body}>
            By accessing, browsing, or placing an order through the Site, you confirm that you have
            read, understood, and agree to be bound by these Terms, our{' '}
            <a href={ppHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80 font-medium">Privacy Policy</a>,
            {' '}and any other policies published on the Site. If you do not agree, please refrain from using the Site.
          </p>
        </div>

        {/* ── All sections ── */}
        <div className="space-y-5 sm:space-y-6 mb-12">

          <Section num="1" title="Introduction and Acceptance of Terms">
            <p>
              These Terms constitute a legally binding electronic agreement as contemplated under the
              Information Technology Act, 2000 and the rules framed thereunder, including the Information
              Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
            </p>
          </Section>

          <Section num="2" title="Eligibility">
            <p>
              The Site and its services are available only to individuals who are <strong className="font-medium">18 years of age or older</strong> and
              legally competent to enter into binding contracts under the Indian Contract Act, 1872.
              By using the Site, you represent and warrant that you meet these eligibility requirements.
              If you are accessing the Site on behalf of a legal entity, you represent that you have the
              authority to bind that entity to these Terms.
            </p>
            <p>
              Nefol reserves the right to refuse service, cancel accounts, or remove content in its sole
              discretion, including where it believes an individual does not meet the eligibility criteria.
            </p>
          </Section>

          <Section num="3" title="Products and Personal Use">
            <p>
              All skincare, haircare, and related beauty and wellness products ("Products") available on
              the Site are for <strong className="font-medium">personal, non-commercial use only</strong>. You may not purchase Products for
              the purpose of resale, distribution, or any commercial purpose without our prior written consent.
            </p>
            <p>
              Nefol reserves the right to limit quantities per order or per customer. We may cancel or reduce
              any order that we believe contravenes this clause.
            </p>
            <p>
              Nefol products are cosmetic products. They are <strong className="font-medium">not drugs or medicines</strong> and are not
              intended to diagnose, treat, cure, or prevent any disease or medical condition. Please refer
              to the Medical Disclaimer in Section 15.
            </p>
          </Section>

          <Section num="4" title="Account Registration">
            <p>
              When creating an account, you must provide accurate, current, and complete information and
              keep it updated at all times.
            </p>
            <p>
              You are solely responsible for maintaining the confidentiality of your login credentials and
              for all activities that occur under your account. You must promptly notify us of any suspected
              unauthorised use.
            </p>
            <p>
              We reserve the right to suspend or terminate your account without prior notice if we reasonably
              believe your account has been used in breach of these Terms or applicable law.
            </p>
          </Section>

          <Section num="5" title="Terms of Sale">
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>5.1 Order Processing</p>
                <p>
                  All orders are subject to availability and acceptance by Nefol. Receipt of an order
                  confirmation email does not constitute acceptance. Nefol reserves the right to cancel or
                  refuse any order, including after confirmation, for reasons including stock unavailability,
                  pricing errors, suspected fraud, or violation of these Terms.
                </p>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>5.2 Pricing and GST</p>
                <p>
                  All prices are in Indian Rupees (INR) and are inclusive of applicable GST unless expressly
                  stated otherwise. Nefol will issue a valid GST-compliant tax invoice for all purchases.
                  Prices are subject to change without prior notice.
                </p>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>5.3 Payment Methods</p>
                <ul className="space-y-1 mt-1">
                  {['UPI (Unified Payments Interface)', 'Debit and Credit Cards (Visa, Mastercard, RuPay, and other accepted networks)', 'Net Banking', 'Cash on Delivery (COD) – available for eligible PIN codes'].map(m => <Bullet key={m}>{m}</Bullet>)}
                </ul>
                <p className="mt-2">
                  Payments are processed through secure third-party payment gateways. Nefol does not store
                  your card or banking details on its servers.
                </p>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>5.4 Order Quantity Limits</p>
                <p>Nefol may impose quantity limits on orders to ensure fair availability.</p>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>5.5 Discounts, Promotions &amp; Offers</p>
                <p>
                  All offers are subject to availability and may be withdrawn, modified, or discontinued at
                  any time without prior notice. Discounts cannot be combined with other offers unless
                  expressly stated.
                </p>
              </div>
            </div>
          </Section>

          <Section num="6" title="Dispatch and Delivery">
            <p>
              Nefol endeavours to dispatch all confirmed orders by the <strong className="font-medium">next working day</strong> following
              order confirmation, subject to payment verification and stock availability. Working days exclude
              Sundays and public holidays.
            </p>
            <p>
              Delivery is facilitated through Shiprocket Limited and its associated courier partners. Nefol
              is not liable for delays, damages, or losses caused by logistics partners.
            </p>
            <p>
              Estimated delivery timelines are provided in good faith but are not guaranteed. International
              orders may be subject to customs duties and import taxes, which are the sole responsibility of
              the recipient.
            </p>
            <p>
              Risk of loss and title to Products passes to you upon delivery to the address specified at checkout.
            </p>
          </Section>

          <Section num="7" title="Returns, Refunds, and Replacements">
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>7.1 Return Window</p>
                <p>You may request a return within <strong className="font-medium">7 days</strong> of the date of delivery. Requests made after this period will not be entertained except where required by applicable law.</p>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>7.2 Eligibility for Returns</p>
                <p>To be eligible for a return, Products must be:</p>
                <ul className="space-y-1 mt-1">
                  {['Unused and in their original, sealed, or unaltered condition', 'In their original packaging with all labels, tags, and accessories intact', 'Accompanied by proof of purchase (order confirmation email or invoice)'].map(m => <Bullet key={m}>{m}</Bullet>)}
                </ul>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>7.3 Return Shipping</p>
                <p>Nefol bears the <strong className="font-medium">full cost of return shipping</strong> for all eligible returns. A return pick-up will be arranged through our logistics partners upon approval.</p>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>7.4 Refunds and Replacements</p>
                <p>Upon receipt and inspection, Nefol will either process a full refund to your original payment method or dispatch a replacement Product. Refunds for prepaid orders will be processed within <strong className="font-medium">7–10 working days</strong> of approval. COD refunds are processed via NEFT/bank transfer.</p>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>7.5 Defective or Incorrect Products</p>
                <p>If you receive a defective or incorrect Product, please contact us within <strong className="font-medium">48 hours</strong> of delivery with supporting photographs. Nefol will arrange a replacement or full refund after verification, at no cost to you.</p>
              </div>
            </div>
          </Section>

          <Section num="8" title="Consumer Rights under Indian Law">
            <p>
              Nothing in these Terms limits or excludes any rights you may have as a consumer under the
              Consumer Protection Act, 2019 (India), or any rules made thereunder, including the Consumer
              Protection (E-Commerce) Rules, 2020. These Terms are in addition to, and do not override,
              any statutory rights you may have.
            </p>
          </Section>

          <Section num="9" title="Consent to Electronic Communications">
            <p>By creating an account, placing an order, or subscribing to our communications, you expressly consent to receive from Nefol:</p>
            <ul className="space-y-1 mt-1">
              {['Email (including order confirmations, updates, and promotional content)', 'WhatsApp messages', 'SMS (Short Message Service)'].map(m => <Bullet key={m}>{m}</Bullet>)}
            </ul>
            <p className="mt-2">
              You may opt out of marketing communications at any time by clicking "unsubscribe" in any
              marketing email or replying STOP to an SMS. Transactional messages cannot be opted out of
              while you have an active account or pending order.
            </p>
          </Section>

          <Section num="10" title="Intellectual Property">
            <p>
              All content on the Site — including the Nefol name, logo, trade dress, taglines, product names,
              images, graphics, text, videos, and the overall site design — is the exclusive intellectual
              property of Nefol Aesthetics Private Limited or its licensors, protected under the Trade Marks
              Act, 1999, the Copyright Act, 1957, and other applicable laws.
            </p>
            <p>
              You are granted a limited, non-exclusive, non-transferable, revocable licence to access the Site
              and view the Content solely for personal, non-commercial purposes. No Content may be reproduced,
              distributed, or used for commercial purposes without the prior written consent of Nefol.
            </p>
            <p>
              NEFOL is a registered trademark of Nefol Aesthetics Private Limited. Any unauthorised use,
              reproduction, or imitation of the NEFOL name or logo is strictly prohibited and may result in
              civil and criminal proceedings under applicable law.
            </p>
          </Section>

          <Section num="11" title="User Content">
            <p>
              If you submit reviews, comments, photographs, or any other content to the Site or our social
              media channels ("User Content"), you grant Nefol a royalty-free, perpetual, irrevocable,
              worldwide, sub-licensable licence to use, reproduce, publish, translate, and display such User
              Content in connection with our business and marketing activities.
            </p>
            <div className="mt-3 space-y-3">
              <p className="font-medium text-sm" style={{ color: '#333' }}>11.1 Product Reviews &amp; Ratings</p>
              <p><strong className="font-medium">Authenticity.</strong> Reviews must reflect your genuine, first-hand experience with the Product. Fake, fabricated, or incentivised reviews are prohibited and may constitute an unfair trade practice under the Consumer Protection Act, 2019.</p>
              <p><strong className="font-medium">Appropriate Content.</strong> Reviews must not contain obscene, vulgar, sexually explicit, or otherwise inappropriate language or imagery. Such reviews will be removed immediately and may result in account suspension or termination.</p>
              <p><strong className="font-medium">No Unlawful Links or Self-Promotion.</strong> Reviews must not contain hyperlinks, URLs, or references to third-party websites or competing brands. Embedding phishing or spam links is strictly prohibited.</p>
              <p><strong className="font-medium">Nefol's Right to Moderate.</strong> Nefol reserves the right to edit, withhold, or delete any review that violates these guidelines, without prior notice.</p>
            </div>
          </Section>

          <Section num="12" title="Prohibited Conduct">
            <p>You agree not to:</p>
            <ul className="space-y-1 mt-1">
              {[
                'Use the Site for any unlawful purpose or in violation of any applicable law or regulation',
                'Use automated bots, scripts, or crawlers to extract data from the Site',
                'Attempt to gain unauthorised access to any part of the Site or its servers',
                'Upload or transmit any malicious code, virus, or harmful content',
                'Misrepresent your identity or impersonate any person or entity',
                'Post or transmit unsolicited commercial communications (spam)',
                'Engage in any conduct that could damage, disable, or impair the Site',
                'Resell, redistribute, or commercially exploit Products purchased from the Site',
              ].map(m => <Bullet key={m}>{m}</Bullet>)}
            </ul>
            <p className="mt-2">Any violation may result in immediate account suspension or termination and may be reported to appropriate law enforcement authorities.</p>
          </Section>

          <Section num="13" title="Accuracy of Product Information">
            <p>
              Nefol makes every reasonable effort to ensure that product descriptions, ingredient lists,
              images, and pricing information are accurate. Product appearances, including colour and packaging,
              may vary slightly due to photography or display settings.
            </p>
            <p>
              Nefol reserves the right to correct any typographical errors or pricing mistakes at any time,
              including after an order has been placed, and to cancel any order where a pricing error is
              material. You will be notified and a full refund will be processed in such cases.
            </p>
          </Section>

          <Section num="14" title="Results Disclaimer">
            <p>
              Individual results from the use of Nefol Products may vary significantly depending on skin type,
              hair type, age, lifestyle, diet, hormonal factors, environmental conditions, and consistency of
              use. Any testimonials, reviews, before-and-after photographs, or results described on the Site
              represent individual experiences and are <strong className="font-medium">not guarantees of similar outcomes</strong> for all users.
            </p>
          </Section>

          <Section num="15" title="Medical Disclaimer">
            <p>
              Nefol Products are cosmetic products formulated for general skincare and haircare purposes.
              They are <strong className="font-medium">not pharmaceutical products, medicines, or medical devices</strong>, and are not
              intended to diagnose, treat, cure, prevent, or mitigate any disease or medical condition.
            </p>
            <p>
              Nothing on the Site constitutes medical or dermatological advice. You should consult a qualified
              dermatologist or healthcare professional before using any Product if you have a known skin
              condition, allergy, sensitivity, or are pregnant, breastfeeding, or taking any medication.
            </p>
            <p>
              If you experience any adverse reaction, discontinue use immediately and consult a healthcare
              professional. You may also report adverse effects to the Central Drugs Standard Control
              Organisation (CDSCO) as required under applicable Indian law.
            </p>
          </Section>

          <Section num="16" title="Third-Party Links and Platforms">
            <p>
              The Site may contain links to third-party websites or services provided for your convenience
              only and do not constitute an endorsement by Nefol. Nefol has no control over and accepts no
              responsibility for the content, privacy practices, or terms of any third-party site.
            </p>
          </Section>

          <Section num="17" title="Limitation of Liability">
            <p className="uppercase text-xs font-medium tracking-wide" style={{ color: '#444' }}>
              To the fullest extent permitted by applicable law, Nefol Aesthetics Private Limited shall not
              be liable for any indirect, incidental, special, consequential, or punitive damages, including
              but not limited to loss of profits, goodwill, data, or business opportunities, arising out of
              or in connection with your use of the Site or the Products.
            </p>
            <p className="mt-2">
              Our aggregate liability to you for any claim shall not exceed the amount paid by you for the
              order giving rise to the claim. Nothing in these Terms shall limit our liability for death or
              personal injury caused by our negligence, fraud, or any liability that cannot be excluded under
              applicable Indian law.
            </p>
          </Section>

          <Section num="18" title="Indemnification">
            <p>
              You agree to defend, indemnify, and hold harmless Nefol Aesthetics Private Limited, its officers,
              directors, employees, agents, and affiliates from and against any claims, damages, losses,
              liabilities, costs, and expenses (including reasonable legal fees) arising out of or in connection
              with: (a) your use of or access to the Site; (b) your violation of these Terms; (c) your violation
              of any applicable law; or (d) any User Content submitted by you.
            </p>
          </Section>

          <Section num="19" title="Disputes, Governing Law, and Arbitration">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>19.1 Governing Law</p>
                <p>These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.</p>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>19.2 Jurisdiction</p>
                <p>Subject to the arbitration clause below, the courts in <strong className="font-medium">Lucknow, Uttar Pradesh</strong> shall have exclusive jurisdiction to adjudicate any dispute arising out of or in connection with these Terms.</p>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>19.3 Arbitration</p>
                <p>Any dispute shall be referred to and finally resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996 (as amended). The seat and venue of arbitration shall be Lucknow, Uttar Pradesh, India. The language of arbitration shall be English. The arbitrator's award shall be final and binding.</p>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>19.4 Consumer Forum</p>
                <p>Nothing in this Section shall deprive you of your right to approach any Consumer Disputes Redressal Commission or Forum as established under the Consumer Protection Act, 2019.</p>
              </div>
            </div>
          </Section>

          <Section num="20" title="Grievance Officer">
            <p>
              In accordance with the Information Technology Act, 2000 and the Consumer Protection
              (E-Commerce) Rules, 2020, Nefol has designated a Grievance Officer:
            </p>
            <div className="mt-3 rounded-lg p-4" style={{ backgroundColor: s.lighter }}>
              <dl className="space-y-1 text-sm">
                {[
                  ['Name', 'Mohd Malik'],
                  ['Designation', 'Grievance Officer'],
                  ['Company', 'Nefol Aesthetics Private Limited'],
                  ['Registered Office', 'D-2627, 12th Avenue, Gaur City 2, Ghaziabad, Uttar Pradesh – 201009, India'],
                  ['Email', 'support@thenefol.com'],
                  ['Working Hours', 'Monday to Saturday, 10:00 AM – 6:00 PM IST'],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-wrap gap-x-2">
                    <dt className="font-medium" style={{ color: '#333', minWidth: '120px' }}>{k}:</dt>
                    <dd style={{ color: '#555' }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-2">Grievances must be submitted in writing and will be acknowledged within <strong className="font-medium">48 hours</strong> and resolved within <strong className="font-medium">1 month</strong> of receipt, in accordance with applicable law.</p>
          </Section>

          <Section num="21" title="Amendments to these Terms">
            <p>
              Nefol reserves the right to modify these Terms at any time. The updated Terms will be published
              on the Site with a revised Effective Date. Your continued use of the Site after the posting of
              any changes constitutes your acceptance of the revised Terms. We encourage you to review these
              Terms periodically.
            </p>
          </Section>

          <Section num="22" title="Privacy Policy">
            <p>
              Your use of the Site is also governed by our{' '}
              <a href={ppHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">
                Privacy Policy
              </a>
              , available at{' '}
              <a href={ppHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80 text-xs">
                {ppFullUrl.replace(/^https?:\/\//, '')}
              </a>
              , which is incorporated into these Terms by reference. The Privacy Policy describes how we
              collect, use, store, and share your personal data in compliance with applicable Indian law,
              including the Digital Personal Data Protection Act, 2023.
            </p>
          </Section>

          <Section num="23" title="Severability and Waiver">
            <p>
              If any provision of these Terms is held to be invalid or unenforceable, such provision shall
              be modified to the minimum extent necessary to make it enforceable, and the remaining provisions
              shall continue in full force and effect.
            </p>
          </Section>

          <Section num="24" title="Entire Agreement">
            <p>
              These Terms, together with our Privacy Policy and any other policies published on the Site,
              constitute the entire agreement between you and Nefol with respect to your use of the Site
              and supersede all prior agreements, understandings, representations, and warranties.
            </p>
          </Section>

        </div>

        {/* ── Contact / Grievance CTA ── */}
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-light mb-3 tracking-[0.15em]" style={s.heading}>
              Questions About These Terms?
            </h2>
            <p className="text-sm sm:text-base font-light mb-6 max-w-xl mx-auto" style={{ color: '#666', letterSpacing: '0.04em' }}>
              Reach out to our Grievance Officer or support team and we'll respond within 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@thenefol.com"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 text-white font-light text-xs tracking-[0.15em] uppercase rounded-xl transition-opacity hover:opacity-90"
                style={{ backgroundColor: s.blue }}
              >
                <Mail className="w-4 h-4" />
                Email Support
              </a>
              <a
                href="#/user/contact"
                className="inline-flex items-center justify-center px-8 py-3 font-light text-xs tracking-[0.15em] uppercase rounded-xl border transition-opacity hover:opacity-80"
                style={{ color: s.blue, borderColor: s.blue }}
              >
                Support Centre
              </a>
            </div>

            {/* Footer note */}
            <p className="mt-8 text-xs font-light" style={{ color: '#aaa', letterSpacing: '0.04em' }}>
              © 2026 Nefol Aesthetics Private Limited. All rights reserved.
              <br />
              thenefol.com · support@thenefol.com · D-2627, 12th Avenue, Gaur City 2, Ghaziabad, UP – 201009, India
            </p>
          </div>
        </div>

      </div>
    </main>
  )
}
