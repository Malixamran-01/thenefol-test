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

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-sm mb-1" style={{ color: '#333' }}>{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export default function CreatorAgreement() {
  const siteUrl = getSiteUrl()
  const tcHref  = '#/user/terms-of-service'
  const ppHref  = '#/user/privacy-policy'

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
            Creator, Collab &amp; Affiliate<br className="hidden sm:block" /> Program Agreement
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs font-light mt-4" style={{ color: '#888', letterSpacing: '0.06em' }}>
            <span>Updated &amp; Effective: May 1, 2025</span>
            <span className="hidden sm:inline">·</span>
            <span>Operated by Nefol Aesthetics Private Limited</span>
            <span className="hidden sm:inline">·</span>
            <span>Governed by the laws of India</span>
          </div>
        </div>

        {/* ── Intro banner ── */}
        <div className="rounded-2xl p-6 sm:p-8 mb-10 sm:mb-14" style={{ backgroundColor: s.lighter }}>
          <p className="font-light text-sm sm:text-base leading-relaxed" style={s.body}>
            This Creator, Collab &amp; Affiliate Program Agreement ("Agreement") is a legally binding
            document between you ("Creator", "Affiliate", "Author", or "User") and{' '}
            <strong className="font-medium">Nefol Aesthetics Private Limited</strong>, D-2627, 12th Avenue,
            Gaur City 2, Ghaziabad, India 201009 ("Nefol", "we", "us", or "our"), governing your
            participation in the Nefol Social Section, Creator Program, Collab Program, and Affiliate
            Program (collectively, the "Programs") available on thenefol.com and its associated domains.
          </p>
          <p className="font-light text-sm sm:text-base leading-relaxed mt-3" style={s.body}>
            This Agreement supplements and must be read in conjunction with the{' '}
            <a href={tcHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80 font-medium">
              Nefol Terms &amp; Conditions
            </a>{' '}
            ("Main T&amp;C"), which are incorporated herein by reference. In the event of any conflict
            between this Agreement and the Main T&amp;C, the Main T&amp;C shall prevail.
          </p>
          <p className="font-light text-sm sm:text-base leading-relaxed mt-3" style={s.body}>
            <strong className="font-medium">By clicking "I Agree", creating an Author Account, publishing content, or
            otherwise participating in any Nefol Program</strong>, you acknowledge that you have read,
            understood, and agree to be legally bound by this Agreement and the Nefol Terms &amp; Conditions.
          </p>
        </div>

        {/* ── Sections ── */}
        <div className="space-y-5 sm:space-y-6 mb-12">

          <Section num="1" title="Definitions">
            <p>In this Agreement, the following terms shall have the meanings set out below:</p>
            <dl className="space-y-2 mt-1">
              {[
                ['"Author Account"', 'A registered user account on the Platform that enables the User to publish blog posts, articles, and other content on the Nefol Social Section.'],
                ['"Collab Program"', 'A program under which approved Creators are assigned tasks by Nefol administrators and compensated in Nefol Coins or through product barter/exchange upon satisfactory completion.'],
                ['"Affiliate Program"', 'A performance-based referral program under which approved Affiliates earn a commission (calculated as a percentage of qualifying order value) for sales generated through their unique referral links.'],
                ['"Creator"', 'A User who has been approved by Nefol to participate in the Collab Program and/or Affiliate Program.'],
                ['"Nefol Coins"', 'Virtual credits issued by Nefol to Creators as compensation for completed Collab tasks, redeemable for Nefol products or encashable to Indian Rupees (INR) subject to the conditions in Section 8.'],
                ['"Platform Content"', 'Any text, images, videos, audio, reviews, articles, blog posts, or other material published by a User on the Nefol Social Section.'],
                ['"Task"', 'A specific deliverable assigned to a Collab Creator by a Nefol administrator, communicated via the Platform or email.'],
                ['"Referral Link"', 'A unique, trackable URL assigned to an Affiliate for the purpose of tracking sales attributable to that Affiliate.'],
                ['"Social Section"', 'The community-facing area of the Platform where Users can publish content, follow other Users, like, comment on, and repost content.'],
              ].map(([term, def]) => (
                <div key={term as string} className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-sm" style={{ color: '#333' }}>{term}</dt>
                  <dd className="text-sm">{def}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section num="2" title="Eligibility and Application">
            <Sub title="2.1 General Eligibility">
              <p>To participate in any Program under this Agreement, you must:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'Be at least 18 (eighteen) years of age at the time of application.',
                  'Hold a valid, active Author Account on the Platform.',
                  'Be a resident of India or an eligible international jurisdiction as determined by Nefol from time to time.',
                  'Not have been previously suspended or terminated from any Nefol Program.',
                  'Comply with all applicable laws and regulations, including the Information Technology Act, 2000, the Consumer Protection Act, 2019, and ASCI (Advertising Standards Council of India) guidelines.',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
            </Sub>
            <Sub title="2.2 Author Account Registration">
              <p>To create an Author Account, you must provide accurate and complete information including:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'Full legal name',
                  'Date of birth',
                  'Email address and contact number',
                  'Educational background and professional skills',
                  'Anniversary or other milestone dates (where applicable)',
                  'Links to your social media accounts (Instagram, YouTube, Twitter/X, or other platforms as required)',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
              <p className="mt-2">
                You represent and warrant that all information provided is true, current, and complete.
                Nefol collects and processes this data in accordance with its{' '}
                <a href={ppHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">Privacy Policy</a>{' '}
                and the Digital Personal Data Protection Act, 2023.
              </p>
            </Sub>
            <Sub title="2.3 Application and Approval">
              <p>
                Participation in the Collab Program and Affiliate Program is not open to all Users — you must
                submit an application through the Platform. Nefol reserves the right, in its sole and absolute
                discretion, to approve or reject any application without providing reasons. Approval criteria
                may include:
              </p>
              <ul className="space-y-1 mt-1">
                {[
                  'Social media following and engagement metrics across linked platforms (assessed on a case-by-case basis — no fixed minimum threshold applies)',
                  'Content quality, niche relevance, and audience alignment with the Nefol brand',
                  'Prior content history and community conduct on the Platform',
                  'Compliance with all eligibility requirements in Section 2.1',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
              <p className="mt-2">Approval for one Program does not constitute automatic approval for any other Program.</p>
            </Sub>
          </Section>

          <Section num="3" title="Nefol Social Section — Author and Community Terms">
            <Sub title="3.1 Author Accounts and Blogging">
              <p>Approved Author Account holders may publish blog posts, product reviews, opinion pieces, tutorials, and other content on the Social Section. The Social Section also enables Users to like, comment on, follow, and repost other Users' content, forming a community around beauty, skincare, haircare, and wellness topics.</p>
            </Sub>
            <Sub title="3.2 Content Originality">
              <p>All Platform Content you publish must be original and created by you. You must not:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'Copy, reproduce, or republish content from any third-party source without express written permission from the original creator.',
                  'Submit content that is substantially similar to or derived from another creator\'s work without proper attribution and authorisation.',
                  'Engage in plagiarism in any form, including paraphrasing another author\'s work without credit.',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
              <p className="mt-2">Violation of this clause constitutes a material breach of this Agreement and may result in immediate content removal, account suspension, and legal action.</p>
            </Sub>
            <Sub title="3.3 AI-Generated Content Disclosure">
              <p>You may use AI tools to assist in creating Platform Content, subject to the following mandatory conditions:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'Any Platform Content that is fully or substantially generated by an AI tool (including ChatGPT, Gemini, Claude, or any other large language model) must be clearly disclosed at the beginning of the post using the tag: [AI-Generated Content] or [AI-Assisted Content] as applicable.',
                  'Undisclosed AI-generated content presented as entirely your own original work is prohibited and may be treated as a content integrity violation.',
                  'Nefol reserves the right to use automated or manual review processes to detect undisclosed AI-generated content and to take appropriate action.',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
            </Sub>
            <Sub title="3.4 Prohibited Content">
              <p>You must not publish, share, or distribute Platform Content that:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'Is obscene, sexually explicit, pornographic, or otherwise NSFW in nature, including suggestive imagery or language.',
                  'Is defamatory, harassing, threatening, abusive, or hateful toward any individual, group, religion, caste, gender, nationality, or community.',
                  'Infringes any third-party intellectual property rights, including copyrights, trademarks, patents, or trade secrets.',
                  'Contains unlawful hyperlinks, phishing URLs, spam links, malware, or links to competitor platforms for commercial benefit.',
                  'Constitutes self-promotion of your own competing business, brand, or services unrelated to Nefol.',
                  'Contains false, misleading, or unverified health or medical claims about any product.',
                  'Violates any applicable law, including the Information Technology Act, 2000, the Drugs and Magic Remedies Act, 1954, or any other statute.',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
            </Sub>
            <Sub title="3.5 Community Conduct">
              <p>When engaging with other Users through likes, comments, reposts, or follows, you must at all times maintain respectful and constructive conduct. Harassment, bullying, trolling, or any conduct that violates Nefol's community standards is strictly prohibited.</p>
            </Sub>
          </Section>

          <Section num="4" title="Ownership of Platform Content">
            <Sub title="4.1 Assignment of Rights">
              <p>
                By publishing any Platform Content on the Nefol Social Section, you{' '}
                <strong className="font-medium">irrevocably assign to Nefol Aesthetics Private Limited all rights, title, and interest</strong>{' '}
                in and to such Platform Content, including all intellectual property rights therein, throughout
                the world and in perpetuity. This assignment takes effect at the moment of publication and does
                not require any further act or instrument.
              </p>
            </Sub>
            <Sub title="4.2 Nefol's Rights to Use Content">
              <p>As the owner of all Platform Content, Nefol shall have the unrestricted right to:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'Reproduce, publish, display, distribute, and adapt the Platform Content across all media and channels, including the Site, social media platforms, digital advertising campaigns, email marketing, print, and broadcast.',
                  'Use Platform Content in paid advertising, sponsored posts, influencer campaigns, and any other commercial marketing activities, without any additional compensation to you beyond what is expressly provided under this Agreement.',
                  'Edit, crop, translate, or otherwise modify the Platform Content for any lawful purpose.',
                  'Sub-license the Platform Content to third-party partners, agencies, or platforms at Nefol\'s discretion.',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
            </Sub>
            <Sub title="4.3 Moral Rights">
              <p>To the fullest extent permitted by applicable law, you waive any moral rights you may have in the Platform Content, including the right of attribution and the right of integrity. You agree not to object to Nefol's use, modification, or adaptation of the Platform Content in any manner.</p>
            </Sub>
            <Sub title="4.4 Creator Representations">
              <p>You represent and warrant that:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'You have the full right, power, and authority to assign the rights described in this Section.',
                  'The Platform Content does not infringe any third-party intellectual property right or any other right of any person or entity.',
                  'The Platform Content does not contain any material that is defamatory, obscene, or otherwise unlawful.',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
              <p className="mt-2">You agree to indemnify and hold Nefol harmless against any claim arising from a breach of these representations.</p>
            </Sub>
          </Section>

          <Section num="5" title="Profile Moderation, Monitoring, and Safety">
            <Sub title="5.1 Moderation Rights">
              <p>Nefol and its authorised administrators reserve the right, at any time and without prior notice, to:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'Review, moderate, edit, withhold, or remove any Platform Content that violates this Agreement, the Main T&C, or any applicable law.',
                  'Restrict, suspend, or terminate any Author Account or Creator profile.',
                  'Add, modify, or remove features associated with your profile or account.',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
              <p className="mt-2">Nefol's exercise of its moderation rights shall not create any liability toward you and shall not be deemed to make Nefol an editorial publisher of your content.</p>
            </Sub>
            <Sub title="5.2 Monitoring of Activities">
              <p>By participating in the Programs, you acknowledge and consent that Nefol may monitor your:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'Platform activity, including posts, comments, likes, follows, and reposts.',
                  'Linked social media accounts and publicly available activity on those accounts, for the purpose of assessing conduct, brand alignment, and compliance with this Agreement.',
                  'Affiliate referral activity and Collab task completion for compensation and fraud prevention purposes.',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
            </Sub>
            <Sub title="5.3 Personal Data">
              <p>
                Nefol collects and processes personal data provided at registration for the purpose of
                administering the Programs, verifying identity, preventing fraud, and personalising your
                experience. All such data is processed in accordance with Nefol's{' '}
                <a href={ppHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">Privacy Policy</a>{' '}
                and the Digital Personal Data Protection Act, 2023.
              </p>
            </Sub>
          </Section>

          <Section num="6" title="Collab Program">
            <Sub title="6.1 Nature of the Program">
              <p>The Nefol Collab Program is a structured creator engagement initiative under which approved Creators are assigned specific Tasks by Nefol administrators. Tasks may include creating product reviews, tutorial videos, social media posts, blog articles, unboxing content, or any other content as specified by Nefol.</p>
            </Sub>
            <Sub title="6.2 Task Assignment">
              <p>Tasks will be communicated via the Platform's internal messaging system, email, or WhatsApp. Each Task communication will specify:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'The nature and deliverables of the Task',
                  'The deadline for submission',
                  'The compensation type (Paid Collab — Nefol Coins, or Barter Collab — Nefol products)',
                  'Any specific content guidelines, brand requirements, or usage rights applicable to that Task',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
              <p className="mt-2">You are not obligated to accept any Task. However, once accepted, it becomes binding and must be completed in accordance with the specifications provided.</p>
            </Sub>
            <Sub title="6.3 Collab Types">
              <p><strong className="font-medium">Paid Collab:</strong> Upon satisfactory completion and approval, you will be compensated in Nefol Coins. The number of Coins awarded is determined at Nefol's sole discretion based on the scope, reach, and quality of the deliverable.</p>
              <p><strong className="font-medium">Barter / Product Exchange Collab:</strong> Compensation takes the form of Nefol products. No monetary compensation or Nefol Coins are paid unless expressly stated otherwise. Products provided under Barter Collabs may not be resold.</p>
            </Sub>
            <Sub title="6.4 Task Completion and Approval">
              <p>All completed Tasks are subject to review and approval by Nefol administrators. Nefol reserves the right to request revisions, reject submissions that do not meet specified requirements, or reduce compensation where deliverables only partially meet Task specifications. Compensation will be issued only upon final approval.</p>
            </Sub>
            <Sub title="6.5 Exclusivity and Competing Brands">
              <p>During the term of an active Collab Task and for a period of <strong className="font-medium">30 days</strong> following its completion, you agree not to publish sponsored or paid content for any competing skincare, haircare, or beauty brand without prior written consent from Nefol, unless otherwise agreed in the Task communication.</p>
            </Sub>
          </Section>

          <Section num="7" title="Affiliate Program">
            <Sub title="7.1 Nature of the Program">
              <p>The Nefol Affiliate Program enables approved Affiliates to earn a commission on qualifying purchases made by customers who click through the Affiliate's unique Referral Link and complete a purchase on thenefol.com.</p>
            </Sub>
            <Sub title="7.2 Referral Links">
              <p>You must not:</p>
              <ul className="space-y-1 mt-1">
                {[
                  'Modify, obscure, or misrepresent your Referral Link.',
                  'Place your Referral Link on websites or content that violates applicable law, contains NSFW material, or is otherwise inconsistent with Nefol\'s brand values.',
                  'Use your Referral Link in unsolicited emails, spam messages, or any form of bulk communication.',
                  'Self-refer — i.e., use your own Referral Link to make purchases for yourself or for any person connected to you.',
                ].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
            </Sub>
            <Sub title="7.3 Commission Structure">
              <p>You will earn a commission calculated as a percentage of the net order value (excluding taxes, shipping charges, and discounts) of qualifying purchases attributed to your Referral Link. The applicable commission percentage will be communicated individually upon approval and may vary. Nefol reserves the right to revise your commission rate at any time by providing written notice.</p>
            </Sub>
            <Sub title="7.4 Tracking and Attribution">
              <p>Affiliate sales are tracked via cookies and UTM parameters. Nefol does not guarantee that all clicks will be tracked accurately, as tracking may be affected by browser settings, ad blockers, or technical issues. Nefol's tracking records shall be final and conclusive for the purpose of calculating commissions.</p>
            </Sub>
            <Sub title="7.5 Commission Payments">
              <p>Commissions are calculated on a monthly basis and credited within <strong className="font-medium">15 working days</strong> following the end of each calendar month, provided the minimum threshold of <strong className="font-medium">500 Nefol Coins</strong> (or equivalent cash value) has been reached. Nefol reserves the right to withhold, reverse, or clawback any commission generated through fraudulent activity, self-referral, policy violations, or returns.</p>
            </Sub>
          </Section>

          <Section num="8" title="Nefol Coins">
            <Sub title="8.1 Nature of Nefol Coins">
              <p>Nefol Coins are virtual credits issued exclusively through the Programs described in this Agreement. They are not a currency, cryptocurrency, or financial instrument and have no fixed monetary value independent of this Agreement.</p>
            </Sub>
            <Sub title="8.2 Earning Nefol Coins">
              <p>Nefol Coins may be earned through:</p>
              <ul className="space-y-1 mt-1">
                {['Completion and approval of Paid Collab Tasks.', 'Affiliate commission earnings (credited as Nefol Coins at an exchange rate determined by Nefol from time to time).', 'Any other earning mechanisms introduced by Nefol on the Platform, subject to their specific terms.'].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
            </Sub>
            <Sub title="8.3 Redemption">
              <p>Nefol Coins may be redeemed (minimum balance: <strong className="font-medium">500 Coins</strong>) in either of the following ways:</p>
              <ul className="space-y-1 mt-1">
                <Bullet><strong className="font-medium">Redemption for Nefol Products:</strong> Coins may be applied as a discount or full payment toward purchases on thenefol.com at an exchange rate published by Nefol on the Platform.</Bullet>
                <Bullet><strong className="font-medium">Cash Out to INR:</strong> Coins may be encashed to Indian Rupees via NEFT/bank transfer to your registered bank account, at an exchange rate determined by Nefol. Cash-out requests will be processed within <strong className="font-medium">15 working days</strong> of request submission.</Bullet>
              </ul>
            </Sub>
            <Sub title="8.4 Non-Transferability">
              <p>Nefol Coins are personal to your account and may not be transferred, gifted, sold, or assigned to any other User or third party. Any attempted transfer shall be void and may result in account suspension.</p>
            </Sub>
            <Sub title="8.5 Tax Liability">
              <p>You are solely responsible for any income tax, GST, or other tax liability arising from Nefol Coins earned and/or redeemed, or from any commission income received under this Agreement. You agree to provide Nefol with your PAN (Permanent Account Number) for tax reporting purposes if requested.</p>
            </Sub>
          </Section>

          <Section num="9" title="Prohibited Conduct for Creators and Affiliates">
            <p>In addition to the prohibited conduct set out in the Main T&amp;C and Section 3.4, as a Creator or Affiliate you must not:</p>
            <ul className="space-y-1 mt-1">
              {[
                'Make false or misleading representations about Nefol Products or the Programs in any content, communication, or advertisement.',
                'Use Nefol\'s name, NEFOL trademark, logo, or any brand assets in any manner not expressly authorised by Nefol in writing.',
                'Engage in black-hat SEO, cookie stuffing, ad hijacking, or any other deceptive affiliate marketing technique.',
                'Create or use fake social media accounts, bot-generated engagement, or purchased followers to misrepresent your reach or influence.',
                'Offer cash, gifts, or any other incentive to customers to use your Referral Link.',
                'Disparage, defame, or make derogatory statements about Nefol, its Products, employees, or other Creators.',
                'Operate multiple Affiliate or Creator accounts simultaneously without prior written approval from Nefol.',
              ].map(i => <Bullet key={i}>{i}</Bullet>)}
            </ul>
          </Section>

          <Section num="10" title="Warnings, Suspension, and Termination">
            <Sub title="10.1 Warning System">
              <p>In the event of a non-material or first-time breach, Nefol may issue a formal warning that will describe the nature of the breach, specify the remedial action required, and set a reasonable deadline for compliance. A warning does not limit Nefol's right to take more severe action if the breach is repeated or causes harm.</p>
            </Sub>
            <Sub title="10.2 Suspension">
              <p>Nefol may suspend your Author Account, Creator profile, or participation in any Program immediately and without prior notice where:</p>
              <ul className="space-y-1 mt-1">
                {['You commit a repeated breach following a prior warning.', 'Your conduct poses an immediate risk to the safety or integrity of the Nefol community.', 'Nefol suspects fraudulent activity in connection with your account or Referral Link.', 'A regulatory authority or law enforcement agency requires Nefol to take such action.'].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
              <p className="mt-2">During suspension, you will not be able to publish content, earn Nefol Coins, generate affiliate commissions, or access your account features. Your Coins balance will be frozen pending the outcome of any review.</p>
            </Sub>
            <Sub title="10.3 Termination">
              <p>Upon termination:</p>
              <ul className="space-y-1 mt-1">
                {['Any accrued, approved, and unpaid Nefol Coins balance will be settled within 30 days, subject to any deductions for outstanding liabilities or fraudulent earnings.', 'Unapproved or pending Coins balances shall be forfeited.', 'All Platform Content you have published becomes and remains the property of Nefol as per Section 4.', 'Any pending Affiliate commissions for orders that have not passed the return window will be reviewed and paid or forfeited accordingly.'].map(i => <Bullet key={i}>{i}</Bullet>)}
              </ul>
            </Sub>
            <Sub title="10.4 Voluntary Withdrawal">
              <p>You may withdraw from the Programs at any time by providing written notice to Nefol via <a href="mailto:support@thenefol.com" style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">support@thenefol.com</a>. Upon withdrawal, your Author Account will be deactivated, and any pending Coins balance meeting the minimum redemption threshold of 500 Coins will be settled within 30 working days. Content already published will remain on the Platform as the property of Nefol.</p>
            </Sub>
          </Section>

          <Section num="11" title="Relationship Between the Parties">
            <p>
              You and Nefol are <strong className="font-medium">independent parties</strong>. Nothing in this
              Agreement shall be construed to create an employment relationship, partnership, joint venture,
              franchise, agency, or any other legal relationship between you and Nefol Aesthetics Private
              Limited. You have no authority to enter into any agreement on behalf of Nefol or to bind Nefol
              in any way.
            </p>
            <p>
              As an independent creator or affiliate, you are solely responsible for all costs, expenses, and
              tax obligations arising from your participation in the Programs.
            </p>
          </Section>

          <Section num="12" title="Limitation of Liability">
            <p className="uppercase text-xs font-medium tracking-wide" style={{ color: '#444' }}>
              To the fullest extent permitted by applicable law, Nefol shall not be liable to you for any
              indirect, incidental, special, consequential, or punitive damages arising out of or in connection
              with your participation in the Programs, including but not limited to loss of earnings, loss of
              data, reputational harm, or loss of Nefol Coins due to account suspension or termination.
            </p>
            <p className="mt-2">
              Nefol's aggregate liability to you under this Agreement shall not exceed the total value of
              Nefol Coins or commissions earned by you and credited to your account in the three (3) months
              immediately preceding the event giving rise to the claim.
            </p>
          </Section>

          <Section num="13" title="Indemnification">
            <p>
              You agree to defend, indemnify, and hold harmless Nefol Aesthetics Private Limited, its officers,
              directors, employees, administrators, and affiliates from and against any claims, damages,
              liabilities, penalties, fines, costs, and legal fees arising out of or in connection with:{' '}
              (a) your Platform Content; (b) your breach of this Agreement or the Main T&amp;C; (c) your
              violation of any applicable law; (d) any third-party intellectual property claim arising from
              content you have submitted; or (e) any fraudulent activity in connection with the Affiliate Program.
            </p>
          </Section>

          <Section num="14" title="Governing Law and Disputes">
            <p>
              This Agreement shall be governed by and construed in accordance with the laws of India.
              Any dispute arising out of or in connection with this Agreement shall be resolved in accordance
              with the dispute resolution mechanism set out in Section 19 of the{' '}
              <a href={tcHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">Main T&amp;C</a>{' '}
              (arbitration seated in Lucknow, Uttar Pradesh, under the Arbitration and Conciliation Act, 1996).
              Courts in Lucknow, Uttar Pradesh shall have exclusive jurisdiction for all other matters.
            </p>
          </Section>

          <Section num="15" title="Amendments">
            <p>
              Nefol reserves the right to modify the terms of this Agreement at any time. Updated terms will
              be published on the Platform with a revised Effective Date. Your continued participation in any
              Program after such publication constitutes your acceptance of the revised Agreement. It is your
              responsibility to review this Agreement periodically.
            </p>
          </Section>

          <Section num="16" title="Miscellaneous">
            <ul className="space-y-2">
              <Bullet><strong className="font-medium">Entire Agreement:</strong> This Agreement, together with the Main T&amp;C and Privacy Policy, constitutes the entire agreement between you and Nefol with respect to the Programs.</Bullet>
              <Bullet><strong className="font-medium">Severability:</strong> If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.</Bullet>
              <Bullet><strong className="font-medium">Waiver:</strong> Nefol's failure to enforce any provision shall not constitute a waiver of that provision.</Bullet>
              <Bullet><strong className="font-medium">Notices:</strong> All notices from Nefol to you will be sent to the email address registered on your account. Notices from you to Nefol must be sent to <a href="mailto:support@thenefol.com" style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80">support@thenefol.com</a>.</Bullet>
              <Bullet><strong className="font-medium">Language:</strong> This Agreement is executed in the English language. In the event of any conflict between an English version and any translated version, the English version shall prevail.</Bullet>
            </ul>
          </Section>

        </div>

        {/* ── Acknowledgement banner ── */}
        <div className="rounded-2xl p-6 sm:p-8 mb-10 border-2" style={{ borderColor: s.blue, backgroundColor: s.lighter }}>
          <h2 className="text-lg sm:text-xl font-medium mb-3" style={{ color: '#1a1a1a' }}>Acknowledgement</h2>
          <p className="font-light text-sm sm:text-base leading-relaxed" style={s.body}>
            By clicking <strong className="font-medium">"I Agree"</strong>, submitting an application,
            publishing content, or otherwise participating in any Nefol Program, you acknowledge that you
            have read, understood, and agree to be legally bound by this Creator, Collab &amp; Affiliate
            Program Agreement and the{' '}
            <a href={tcHref} style={{ color: s.blue }} className="underline underline-offset-2 hover:opacity-80 font-medium">
              Nefol Terms &amp; Conditions
            </a>.
          </p>
        </div>

        {/* ── Contact CTA ── */}
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-light mb-3 tracking-[0.15em]" style={s.heading}>
              Questions About This Agreement?
            </h2>
            <p className="text-sm sm:text-base font-light mb-6 max-w-xl mx-auto" style={{ color: '#666', letterSpacing: '0.04em' }}>
              Contact us at <a href="mailto:support@thenefol.com" style={{ color: s.blue }} className="underline underline-offset-2">support@thenefol.com</a> — we respond within 48 hours.
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
