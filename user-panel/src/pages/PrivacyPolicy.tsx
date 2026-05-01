import React from 'react'
import { Shield, Mail } from 'lucide-react'
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

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export default function PrivacyPolicy() {
  // These resolve to the correct domain automatically in every environment.
  // Hash links like "#/user/terms-of-service" are already environment-agnostic for
  // in-app navigation; we also build full absolute URLs for displayed text.
  const siteUrl = getSiteUrl()
  const tcHref   = '#/user/terms-of-service'
  const ppHref   = '#/user/privacy-policy'
  const tcFullUrl = `${siteUrl}/${tcHref}`
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
            <Shield className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: s.blue }} />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light mb-3 sm:mb-4" style={s.heading}>
            Privacy Policy
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs font-light mt-4" style={{ color: '#888', letterSpacing: '0.06em' }}>
            <span>Updated &amp; Effective: May 1, 2025</span>
            <span className="hidden sm:inline">·</span>
            <span>thenefol.com · Nefol Social Section · Creator &amp; Affiliate Programs</span>
          </div>
        </div>

        {/* ── Scope banner ── */}
        <div className="rounded-2xl p-6 sm:p-8 mb-10 sm:mb-14" style={{ backgroundColor: s.lighter }}>
          <p className="font-light text-sm sm:text-base leading-relaxed" style={s.body}>
            This Privacy Policy ("Policy") explains how{' '}
            <strong className="font-medium">Nefol Aesthetics Private Limited</strong> ("Nefol", "we", "us",
            "our") — the owner and operator of <strong className="font-medium">thenefol.com</strong> and all
            associated subdomains and digital properties (collectively, the "Platform") — collects, uses,
            stores, shares, and protects your personal data.
          </p>
          <p className="font-light text-sm sm:text-base leading-relaxed mt-3" style={s.body}>
            This Policy applies to all individuals who interact with Nefol in any capacity, including:
          </p>
          <ul className="mt-2 space-y-1" style={s.body}>
            {[
              'Visitors and shoppers on thenefol.com',
              'Registered account holders and Author Account holders',
              'Participants in the Nefol Social Section (bloggers, commenters, followers)',
              'Creators, Collab Creators, and Affiliates enrolled in the Nefol Creator Programs',
              'Individuals who contact us by phone, email, WhatsApp, or SMS',
            ].map(item => <Bullet key={item}>{item}</Bullet>)}
          </ul>
          <p className="font-light text-sm sm:text-base leading-relaxed mt-3" style={s.body}>
            This Policy is incorporated into and must be read alongside the{' '}
            <a href={tcHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80 font-medium">
              Nefol Terms &amp; Conditions
            </a>{' '}
            and the Nefol Creator, Collab &amp; Affiliate Program Agreement, both available on thenefol.com.
          </p>
          <p className="font-light text-sm sm:text-base leading-relaxed mt-3" style={s.body}>
            <strong className="font-medium">Legal Framework:</strong> This Policy complies with the
            Information Technology Act, 2000, the IT (SPDI) Rules, 2011, the Digital Personal Data
            Protection Act, 2023 ("DPDPA"), the Consumer Protection (E-Commerce) Rules, 2020, and all
            other applicable Indian laws.
          </p>
        </div>

        {/* ── Sections ── */}
        <div className="space-y-5 sm:space-y-6 mb-12">

          <Section num="1" title="Data Controller Information">
            <p>The data fiduciary (data controller) responsible for your personal data is:</p>
            <div className="rounded-lg p-4 mt-1" style={{ backgroundColor: s.lighter }}>
              <dl className="space-y-1 text-sm">
                {[
                  ['Company', 'Nefol Aesthetics Private Limited'],
                  ['Registered Office', 'D-2627, 12th Avenue, Gaur City 2, Ghaziabad, Uttar Pradesh – 201009, India'],
                  ['Privacy Contact', 'support@thenefol.com'],
                  ['Grievance Officer', 'support@thenefol.com'],
                  ['Website', 'https://www.thenefol.com'],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-wrap gap-x-2">
                    <dt className="font-medium" style={{ color: '#333', minWidth: '140px' }}>{k}:</dt>
                    <dd style={{ color: '#555' }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p>
              Where Nefol engages third-party data processors (such as payment gateways, logistics partners,
              or analytics providers), those entities act under Nefol's instructions and are bound by data
              processing agreements consistent with applicable Indian law.
            </p>
          </Section>

          <Section num="2" title="Personal Data We Collect and How We Collect It">
            <p>Depending on how you interact with the Platform, we collect the following categories of personal data:</p>
            <div className="space-y-4 mt-1">
              <Sub title="2.1 Identity and Contact Information">
                <ul className="space-y-1">
                  {['Full legal name', 'Email address', 'Mobile number', 'Postal / delivery address', 'Date of birth', 'Gender (optional)'].map(i => <Bullet key={i}>{i}</Bullet>)}
                </ul>
                <p className="mt-1">Collected when you create an account, place an order, subscribe to communications, or contact us.</p>
              </Sub>
              <Sub title="2.2 Transaction and Payment Information">
                <ul className="space-y-1">
                  {['Order history, product preferences, cart data', 'Billing address', 'Payment method type (card, UPI, net banking, COD)', 'Transaction reference numbers'].map(i => <Bullet key={i}>{i}</Bullet>)}
                </ul>
                <p className="mt-1">
                  We do <strong className="font-medium">not</strong> store your full card number, CVV, or banking credentials.
                  All payment data is processed directly by Razorpay under PCI-DSS standards.
                </p>
              </Sub>
              <Sub title="2.3 Account and Profile Information">
                <ul className="space-y-1">
                  {['Username and password (hashed and encrypted)', 'Profile photograph (if uploaded)', 'Educational background and professional skills', 'Anniversary or milestone dates', 'Linked social media account handles (Meta, YouTube, Twitter/X and others)', 'Follower counts and engagement metrics on linked platforms (for Creator Program participants)'].map(i => <Bullet key={i}>{i}</Bullet>)}
                </ul>
              </Sub>
              <Sub title="2.4 Device and Technical Information">
                <ul className="space-y-1">
                  {['IP address', 'Browser type and version', 'Operating system', 'Device type and unique device identifiers', 'Referring URL and exit pages', 'Time zone and language settings'].map(i => <Bullet key={i}>{i}</Bullet>)}
                </ul>
                <p className="mt-1">Collected automatically when you access the Platform through cookies and similar tracking technologies (see Section 5).</p>
              </Sub>
              <Sub title="2.5 Usage and Behavioural Data">
                <ul className="space-y-1">
                  {['Pages visited, content viewed, and time spent on pages', 'Search queries made on the Platform', 'Products added to cart, wishlisted, or purchased', 'Clicks, scrolls, and interaction patterns', 'Social Section activity: posts published, likes, comments, reposts, accounts followed'].map(i => <Bullet key={i}>{i}</Bullet>)}
                </ul>
              </Sub>
              <Sub title="2.6 Communications Data">
                <ul className="space-y-1">
                  {['Content of emails, WhatsApp messages, SMS, and telephone calls with our support or Creator team', 'Your communication preferences', 'Records of consent given for marketing communications'].map(i => <Bullet key={i}>{i}</Bullet>)}
                </ul>
                <p className="mt-1">Telephone calls with Nefol may be recorded for quality assurance and training purposes. You will be informed of this at the start of any such call.</p>
              </Sub>
              <Sub title="2.7 User-Generated Content">
                <ul className="space-y-1">
                  {['Blog posts, articles, and other content published on the Nefol Social Section', 'Product reviews and ratings', 'Comments and replies on other users\' content', 'Photographs, videos, and other media uploaded to the Platform'].map(i => <Bullet key={i}>{i}</Bullet>)}
                </ul>
                <p className="mt-1">All content published on the Nefol Social Section is assigned to and owned by Nefol Aesthetics Private Limited upon publication, as described in the Creator Program Agreement.</p>
              </Sub>
              <Sub title="2.8 Creator and Affiliate Program Data">
                <ul className="space-y-1">
                  {['Task completion records and performance metrics', 'Nefol Coins balance and transaction history', 'Affiliate referral link usage data and commission records', 'Bank account details or UPI ID provided for Nefol Coins encashment', 'PAN (Permanent Account Number) where required for tax reporting'].map(i => <Bullet key={i}>{i}</Bullet>)}
                </ul>
              </Sub>
            </div>
          </Section>

          <Section num="3" title="Special Categories of Sensitive Personal Data">
            <p>
              Under the SPDI Rules, 2011, certain categories attract a higher standard of protection.
              Nefol may collect the following SPDI in limited circumstances:
            </p>
            <ul className="space-y-2 mt-1">
              <Bullet>
                <strong className="font-medium">Financial information:</strong> Bank account details and UPI IDs collected for Nefol Coins encashment by Creator Program participants.
              </Bullet>
              <Bullet>
                <strong className="font-medium">Health-related information:</strong> Skin type, skin concerns, or health conditions you voluntarily disclose when completing a skin quiz, writing a review, or contacting support. Used solely to personalise product recommendations.
              </Bullet>
            </ul>
            <p>
              Nefol will not collect SPDI without your explicit, informed consent. You may withdraw consent at
              any time as described in Section 13. Nefol will not sell, trade, or share SPDI with any third
              party except as required by law or as necessary to provide the services you requested.
            </p>
          </Section>

          <Section num="4" title="Data Collected Through the Nefol Social Section">
            <p>The Nefol Social Section is a community platform where registered users can publish content, interact with other users, and participate in the Creator and Affiliate Programs.</p>
            <div className="space-y-4 mt-1">
              <Sub title="4.1 Public Profile Data">
                <p>Your Author Account profile — including your username, profile photograph, bio, published blog posts, and follower/following counts — is visible to other registered users and, where applicable, to the general public. You should not include sensitive personal information in your public profile.</p>
              </Sub>
              <Sub title="4.2 Social Interaction Data">
                <p>We collect and store data about your interactions on the Social Section, including which content you like, comment on, or repost, and which accounts you follow. This data is used to personalise your feed, recommend relevant content, and generate community engagement analytics.</p>
              </Sub>
              <Sub title="4.3 Linked Social Media Accounts">
                <p>Creator Program applicants are required to link their external social media accounts (e.g. Instagram, YouTube, Twitter/X) to their Nefol Author Account. By doing so, you authorise Nefol to access publicly available data from those platforms — including follower counts, engagement metrics, and post performance data — for the sole purpose of evaluating and administering your participation in the Creator or Affiliate Program. Nefol will not access private messages or non-public data from your linked social accounts without your explicit consent.</p>
              </Sub>
              <Sub title="4.4 Content Moderation and Monitoring">
                <p>Nefol and its authorised administrators monitor Platform activity and published content for compliance with Nefol's community standards,{' '}
                  <a href={tcHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">Terms &amp; Conditions</a>,
                  {' '}and applicable law. This monitoring does not extend to private messages unless required by a lawful order.</p>
              </Sub>
            </div>
          </Section>

          <Section num="5" title="Cookies, Tracking Technologies, and Analytics">
            <div className="space-y-4">
              <Sub title="5.1 What Are Cookies">
                <p>Cookies are small text files placed on your device when you visit a website. They enable the website to remember your preferences, understand how you use the site, and deliver relevant content and advertising. Nefol uses both first-party cookies (set by us) and third-party cookies (set by our analytics and advertising partners).</p>
              </Sub>
              <Sub title="5.2 Types of Cookies We Use">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm border-collapse mt-1">
                    <thead>
                      <tr style={{ backgroundColor: s.lighter }}>
                        <th className="text-left p-2 sm:p-3 font-medium border" style={{ borderColor: s.light, color: '#333' }}>Cookie Type</th>
                        <th className="text-left p-2 sm:p-3 font-medium border" style={{ borderColor: s.light, color: '#333' }}>Purpose</th>
                        <th className="text-left p-2 sm:p-3 font-medium border" style={{ borderColor: s.light, color: '#333' }}>Can You Opt Out?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Strictly Necessary', 'Essential for the Platform to function (login sessions, cart data, security tokens)', 'No — required for core functionality'],
                        ['Analytics & Performance', 'Google Analytics: tracks page visits, traffic sources, and user behaviour to help us improve the Platform', 'Yes — via browser/cookie settings or Google Analytics opt-out'],
                        ['Marketing & Advertising', 'Meta Pixel (Facebook/Instagram): tracks conversions and enables personalised advertising on Meta platforms', 'Yes — via cookie settings or Meta Ad Preferences'],
                        ['Personalisation', 'Remembers your preferences (language, recently viewed products) to personalise your experience', 'Yes — via cookie settings'],
                        ['Session Cookies', 'Temporary cookies that expire when you close your browser; used to maintain your session', 'No — expire automatically'],
                      ].map(([type, purpose, opt]) => (
                        <tr key={type} className="border-b" style={{ borderColor: s.light }}>
                          <td className="p-2 sm:p-3 border font-medium" style={{ borderColor: s.light, color: '#333' }}>{type}</td>
                          <td className="p-2 sm:p-3 border" style={{ borderColor: s.light, color: '#555' }}>{purpose}</td>
                          <td className="p-2 sm:p-3 border" style={{ borderColor: s.light, color: '#555' }}>{opt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2">You can manage or withdraw consent to non-essential cookies at any time by adjusting your browser settings. Disabling certain cookies may affect Platform functionality.</p>
              </Sub>
              <Sub title="5.3 Google Analytics">
                <p>Nefol uses Google Analytics to collect information about how users interact with the Platform. You can opt out by installing the Google Analytics Opt-out Browser Add-on at <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer" style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">tools.google.com/dlpage/gaoptout</a>.</p>
              </Sub>
              <Sub title="5.4 Meta Pixel">
                <p>Nefol uses the Meta Pixel to measure the effectiveness of our advertising and deliver targeted advertisements on Facebook and Instagram. You can manage your ad preferences through your Facebook and Instagram account settings or via the Digital Advertising Alliance opt-out tools.</p>
              </Sub>
            </div>
          </Section>

          <Section num="6" title="How We Use Your Personal Data">
            <p>Nefol uses your personal data for the following purposes. Where we rely on your consent, you may withdraw it at any time.</p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr style={{ backgroundColor: s.lighter }}>
                    <th className="text-left p-2 sm:p-3 font-medium border" style={{ borderColor: s.light, color: '#333' }}>Purpose</th>
                    <th className="text-left p-2 sm:p-3 font-medium border" style={{ borderColor: s.light, color: '#333' }}>Legal Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Processing and fulfilling your orders', 'Contract performance'],
                    ['Creating and managing your account', 'Contract performance'],
                    ['Processing returns, refunds and replacements', 'Contract performance / Legal obligation'],
                    ['Customer support via email, WhatsApp, SMS, or phone', 'Contract performance / Legitimate interest'],
                    ['Sending order confirmations, shipping updates and OTPs', 'Contract performance'],
                    ['Sending marketing communications (email, SMS, WhatsApp)', 'Consent'],
                    ['Personalising your shopping and content experience', 'Legitimate interest / Consent'],
                    ['Analytics and improving the Platform', 'Legitimate interest / Consent'],
                    ['Targeted advertising (Google, Meta)', 'Consent'],
                    ['Administering the Collab and Affiliate Programs', 'Contract performance'],
                    ['Processing Nefol Coins encashment and affiliate commissions', 'Contract performance / Legal obligation'],
                    ['Fraud prevention and security', 'Legitimate interest / Legal obligation'],
                    ['Tax compliance and regulatory reporting', 'Legal obligation'],
                    ['Content moderation and community safety', 'Legitimate interest / Legal obligation'],
                    ['Legal proceedings and enforcement of our Terms', 'Legal obligation / Legitimate interest'],
                  ].map(([purpose, basis]) => (
                    <tr key={purpose} className="border-b" style={{ borderColor: s.light }}>
                      <td className="p-2 sm:p-3 border" style={{ borderColor: s.light, color: '#555' }}>{purpose}</td>
                      <td className="p-2 sm:p-3 border" style={{ borderColor: s.light, color: '#555' }}>{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section num="7" title="Legal Bases for Processing Your Personal Data">
            <p>Under the DPDPA 2023 and the IT Act, 2000, Nefol processes your personal data on one or more of the following legal bases:</p>
            <ul className="space-y-2 mt-1">
              <Bullet><strong className="font-medium">Consent:</strong> Where you have given clear, informed, and specific consent for a particular purpose. You may withdraw consent at any time without affecting the lawfulness of prior processing.</Bullet>
              <Bullet><strong className="font-medium">Contract Performance:</strong> Where processing is necessary to fulfil a contract with you (e.g. processing your order, managing your account, or administering your Creator Program participation).</Bullet>
              <Bullet><strong className="font-medium">Legal Obligation:</strong> Where we are required by applicable Indian law to process your data (e.g. maintaining tax records, responding to lawful orders from regulatory or law enforcement authorities).</Bullet>
              <Bullet><strong className="font-medium">Legitimate Interest:</strong> Where processing is necessary for our legitimate business interests — including fraud prevention, Platform analytics, content moderation, and improving our products — provided those interests are not overridden by your rights.</Bullet>
            </ul>
          </Section>

          <Section num="8" title="Disclosure and Sharing of Your Personal Data">
            <p><strong className="font-medium">Nefol does not sell your personal data.</strong> We share your data only in the circumstances described below:</p>
            <div className="space-y-4 mt-2">
              <Sub title="8.1 Service Providers and Data Processors">
                <ul className="space-y-2">
                  <Bullet><strong className="font-medium">Razorpay Financial Solutions Pvt. Ltd.:</strong> Payment processing under PCI-DSS compliance.</Bullet>
                  <Bullet><strong className="font-medium">Shiprocket Limited:</strong> Logistics and order fulfilment. We share your name, delivery address, phone number, and order details to enable delivery.</Bullet>
                  <Bullet><strong className="font-medium">Google LLC:</strong> Google Analytics for website usage analytics.</Bullet>
                  <Bullet><strong className="font-medium">Meta Platforms, Inc.:</strong> Meta Pixel for advertising measurement and targeting.</Bullet>
                  <Bullet><strong className="font-medium">Cloud / Hosting Provider:</strong> Your data is hosted on servers located in India under a data processing agreement.</Bullet>
                  <Bullet><strong className="font-medium">Communication Service Providers:</strong> Third-party SMS, WhatsApp Business API, and email providers used for transactional and marketing communications.</Bullet>
                  <Bullet><strong className="font-medium">Customer Support Tools:</strong> CRM or helpdesk platforms used to manage customer support queries.</Bullet>
                </ul>
              </Sub>
              <Sub title="8.2 Legal and Regulatory Disclosure">
                <p>We may disclose your personal data to government authorities, courts, or law enforcement where required or permitted by applicable Indian law.</p>
              </Sub>
              <Sub title="8.3 Business Transfers">
                <p>In the event of a merger, acquisition, or sale of Nefol's business, your personal data may be transferred to the successor entity. We will notify you of any such transfer and the privacy choices available to you.</p>
              </Sub>
              <Sub title="8.4 With Your Consent">
                <p>We may share your personal data with third parties not described above where you have given explicit consent.</p>
              </Sub>
              <Sub title="8.5 No International Transfers">
                <p>All personal data collected by Nefol is stored and processed on servers located within India. Nefol does not currently transfer personal data outside India. If this changes in future, we will update this Policy and implement appropriate safeguards in accordance with the DPDPA 2023.</p>
              </Sub>
            </div>
          </Section>

          <Section num="9" title="Data Storage, Hosting, and Security">
            <p>Nefol stores all personal data on servers located in India. We implement reasonable technical and organisational security measures, including:</p>
            <ul className="space-y-1 mt-1">
              {[
                'Encryption of data in transit using SSL/TLS protocols',
                'Encrypted storage of passwords using industry-standard hashing algorithms',
                'Access controls and role-based permissions limiting data access to authorised personnel only',
                'Regular security assessments and vulnerability monitoring',
                'Secure data processing agreements with all third-party service providers',
              ].map(i => <Bullet key={i}>{i}</Bullet>)}
            </ul>
            <p>
              No method of transmission over the internet is completely secure. In the event of a data breach
              likely to cause harm to you, we will notify you and the relevant authorities in accordance with
              applicable Indian law.
            </p>
          </Section>

          <Section num="10" title="Retention of Your Personal Data">
            <p>Nefol retains your personal data only for as long as necessary to fulfil the purposes for which it was collected, or as required by applicable law:</p>
            <ul className="space-y-2 mt-1">
              <Bullet><strong className="font-medium">Active accounts:</strong> Retained for as long as your account remains active or as needed to provide our services.</Bullet>
              <Bullet><strong className="font-medium">Transaction records:</strong> Retained for a minimum of <strong className="font-medium">8 years</strong> in accordance with the Income Tax Act, 1961, and the GST Act, 2017.</Bullet>
              <Bullet><strong className="font-medium">Creator Program records:</strong> Collab task records, Coins transaction history, and affiliate commission records retained for <strong className="font-medium">5 years</strong> following the end of your participation.</Bullet>
              <Bullet><strong className="font-medium">Marketing consent records:</strong> Retained until you withdraw consent, plus <strong className="font-medium">2 years</strong> thereafter.</Bullet>
              <Bullet><strong className="font-medium">Legal claims:</strong> Relevant data may be retained for as long as necessary in connection with any claim.</Bullet>
              <Bullet><strong className="font-medium">Communications data:</strong> Customer support communications retained for <strong className="font-medium">3 years</strong> unless required longer for legal purposes.</Bullet>
            </ul>
            <p>Upon expiry of the applicable retention period, personal data will be securely deleted or anonymised.</p>
          </Section>

          <Section num="11" title="Communications and Marketing Consent">
            <div className="space-y-4">
              <Sub title="11.1 Transactional Communications">
                <p>Nefol will send you transactional communications necessary for the performance of our contract with you, including:</p>
                <ul className="space-y-1 mt-1">
                  {['Order confirmation, payment confirmation, and invoice emails', 'Shipping and delivery updates', 'Account security alerts and OTPs', 'Creator Program task assignments and payment notifications'].map(i => <Bullet key={i}>{i}</Bullet>)}
                </ul>
                <p className="mt-1">You cannot opt out of transactional communications while you have an active account or pending order.</p>
              </Sub>
              <Sub title="11.2 Marketing Communications">
                <p>With your consent, Nefol may send you marketing and promotional communications via email, SMS, WhatsApp messages, and telephone calls. You may withdraw consent at any time by:</p>
                <ul className="space-y-1 mt-1">
                  {["Clicking the 'Unsubscribe' link in any marketing email", 'Replying STOP to any marketing SMS', 'Contacting us at support@thenefol.com'].map(i => <Bullet key={i}>{i}</Bullet>)}
                </ul>
                <p className="mt-1">Please allow up to 7 working days for your opt-out preference to take effect across all channels.</p>
              </Sub>
              <Sub title="11.3 Do Not Disturb (DND) Registry">
                <p>If your mobile number is registered on the TRAI DND registry, Nefol will respect your preferences and will not send promotional SMS or make promotional telephone calls to your number. Transactional communications are exempt from DND restrictions under applicable TRAI regulations.</p>
              </Sub>
            </div>
          </Section>

          <Section num="12" title="Children's Privacy">
            <p>
              The Nefol Platform and all its Programs are intended for individuals aged{' '}
              <strong className="font-medium">18 years and above</strong>. Nefol does not knowingly collect
              personal data from anyone under the age of 18.
            </p>
            <p>
              If you are a parent or guardian and believe that your child has provided personal data to Nefol
              without your consent, please contact us immediately at{' '}
              <a href="mailto:support@thenefol.com" style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">
                support@thenefol.com
              </a>. We will take prompt steps to delete such data from our records.
            </p>
          </Section>

          <Section num="13" title="Your Rights Under Indian Law">
            <p>
              As a data principal under the DPDPA 2023 and the SPDI Rules 2011, you have the following
              rights in relation to your personal data held by Nefol:
            </p>
            <div className="space-y-3 mt-2">
              <Sub title="13.1 Right to Access">
                <p>You have the right to request a summary of the personal data we hold about you, the processing activities carried out, and the identities of third parties with whom your data has been shared.</p>
              </Sub>
              <Sub title="13.2 Right to Correction and Erasure">
                <p>You have the right to request correction of any inaccurate or incomplete personal data, or erasure of personal data that is no longer necessary for the purpose for which it was collected, subject to our legal retention obligations.</p>
              </Sub>
              <Sub title="13.3 Right to Withdraw Consent">
                <p>Where we process your personal data on the basis of consent, you have the right to withdraw that consent at any time. Withdrawal does not affect the lawfulness of processing carried out before withdrawal.</p>
              </Sub>
              <Sub title="13.4 Right to Grievance Redressal">
                <p>You have the right to have any grievance related to our processing of your personal data addressed by our Grievance Officer within the timelines specified in Section 16.</p>
              </Sub>
              <Sub title="13.5 Right to Nominate">
                <p>Under the DPDPA 2023, you have the right to nominate an individual who shall, in the event of your death or incapacity, exercise your data rights on your behalf.</p>
              </Sub>
              <Sub title="13.6 Right Against Automated Decision-Making">
                <p>Where Nefol makes decisions that significantly affect you solely on the basis of automated processing, you have the right to request human review of such decisions.</p>
              </Sub>
              <Sub title="13.7 How to Exercise Your Rights">
                <p>Submit a written request to <a href="mailto:support@thenefol.com" style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">support@thenefol.com</a> with the subject line <em>"Data Rights Request – [Your Name]"</em>. We may verify your identity before processing your request. We will acknowledge within <strong className="font-medium">48 hours</strong> and respond within <strong className="font-medium">30 days</strong>, or within the period prescribed by applicable law.</p>
                <p>If you are not satisfied with our response, you may escalate your complaint to the Data Protection Board of India (once established under the DPDPA 2023) or any other competent authority.</p>
              </Sub>
            </div>
          </Section>

          <Section num="14" title="Third-Party Links and Platforms">
            <p>
              The Platform may contain links to third-party websites, social media platforms, and external
              services. This Policy does not apply to those third-party websites. We encourage you to read
              their privacy policies. Nefol is not responsible for the privacy practices, content, or security
              of any third-party website or platform, including Razorpay, Shiprocket, Google, Meta, or any
              linked social media platform.
            </p>
            <p>
              The Nefol Social Section may contain links posted by users in their blog posts or comments.
              Nefol does not endorse and is not responsible for the privacy practices of any website linked
              to by users.
            </p>
          </Section>

          <Section num="15" title="Changes to This Privacy Policy">
            <p>Nefol reserves the right to update or amend this Policy at any time. When we make material changes, we will:</p>
            <ul className="space-y-1 mt-1">
              <Bullet>Update the Effective Date at the top of this Policy</Bullet>
              <Bullet>
                Publish the revised Policy at{' '}
                <a href={ppHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">
                  {ppFullUrl.replace(/^https?:\/\//, '')}
                </a>
              </Bullet>
              <Bullet>Notify registered users by email or through a prominent notice on the Platform</Bullet>
            </ul>
            <p>
              Your continued use of the Platform after the revised Policy has been published constitutes your
              acceptance of the changes. If you do not agree with the revised Policy, you must discontinue
              use of the Platform and may request deletion of your account.
            </p>
          </Section>

          <Section num="16" title="Grievance Officer and Contact">
            <p>
              In accordance with the Information Technology Act, 2000, the SPDI Rules 2011, the DPDPA 2023,
              and the Consumer Protection (E-Commerce) Rules 2020, Nefol has designated a Grievance Officer:
            </p>
            <div className="rounded-lg p-4 mt-2" style={{ backgroundColor: s.lighter }}>
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
                    <dt className="font-medium" style={{ color: '#333', minWidth: '140px' }}>{k}:</dt>
                    <dd style={{ color: '#555' }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-2">
              All grievances must be submitted in writing to the Grievance Officer. We will acknowledge your
              grievance within <strong className="font-medium">48 hours</strong> and resolve it within{' '}
              <strong className="font-medium">1 month</strong> of receipt, in accordance with applicable law.
            </p>
            <p>For general privacy queries, you may also write to us at <a href="mailto:support@thenefol.com" style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">support@thenefol.com</a>.</p>
          </Section>

        </div>

        {/* ── Contact CTA ── */}
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-light mb-3 tracking-[0.15em]" style={s.heading}>
              Privacy Questions?
            </h2>
            <p className="text-sm sm:text-base font-light mb-6 max-w-xl mx-auto" style={{ color: '#666', letterSpacing: '0.04em' }}>
              Contact our Grievance Officer at <a href="mailto:support@thenefol.com" style={{ color: s.blue }} className="underline underline-offset-2">support@thenefol.com</a> — we respond within 48 hours.
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
