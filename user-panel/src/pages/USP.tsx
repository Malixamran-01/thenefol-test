import React from 'react'
import { Leaf, Shield, Award, Heart, Users, Zap, Globe, Star, CheckCircle } from 'lucide-react'

export default function USP() {
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Why Choose Nefol?
          </h1>
          <p 
            className="text-sm sm:text-base font-light max-w-3xl mx-auto tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Discover what makes Nefol products truly special and why thousands of customers 
            trust us for their skincare needs.
          </p>
        </div>

        {/* Main USP */}
        <div className="mb-12 sm:mb-16 md:mb-20">
          <div className="rounded-2xl p-6 sm:p-8 md:p-10" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
            <div className="text-center mb-8">
              <h2 
                className="text-2xl sm:text-3xl md:text-4xl font-light mb-4 tracking-[0.15em]"
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family)',
                  letterSpacing: '0.15em'
                }}
              >
                Nefol Aesthetics Products
              </h2>
              <p 
                className="text-sm sm:text-base font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Enriched with high antioxidants give dazzling beautiful skin
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
              <div>
                <h3 
                  className="text-xl sm:text-2xl md:text-3xl font-light mb-4 tracking-[0.15em]"
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family)',
                    letterSpacing: '0.15em'
                  }}
                >
                  Blue Tea Excellence
                </h3>
                <p 
                  className="font-light leading-relaxed mb-4 tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  It is extracted from the plant called Clitoria Ternatea (Aprajita) that has multiple benefits 
                  and is beneficial for skin. Rich antioxidants which work staggering for hair growth and gleam the skin.
                </p>
                <p 
                  className="font-light leading-relaxed tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  It also helps to defend your skin against pollution and also give radical free skin. 
                  Blue tea present in the Nefol products is rich in Anthocyanins.
                </p>
              </div>
              <div>
                <h3 
                  className="text-xl sm:text-2xl md:text-3xl font-light mb-4 tracking-[0.15em]"
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family)',
                    letterSpacing: '0.15em'
                  }}
                >
                  Natural Properties
                </h3>
                <p 
                  className="font-light leading-relaxed mb-4 tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  Anthocyanins give it bright blue color and medical properties it uplift the moods and 
                  enhance skin, stimulate hair growth. The flavonoids existing in blue tea help to glow 
                  and are malleable to the skin.
                </p>
                <p 
                  className="font-light leading-relaxed tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  EDTA in all Nefol products maintains pH balance of the skin.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Range */}
        <div className="mb-12 sm:mb-16 md:mb-20">
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-light mb-8 sm:mb-12 text-center tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Our Product Range
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                title: "Nefol Face Cleanser",
                desc: "Yuja (Vitamin C, Vitamin B5) helps in brightening dull skin boosting collagen production reducing signs of aging. Kananga Tree gives a soothing effect in acne prone and to the sensitive skin also it is beneficial in summer for oily skin."
              },
              {
                title: "Nefol Face Mask",
                desc: "Cassava Flour, AHA's, BHA's, Rose petals make the skin glow and brighten skin reducing fine lines wrinkles improving skin texture and make it glow."
              },
              {
                title: "Nefol Face Serum",
                desc: "Green tea and White tea hydrate skin to prevent wrinkles and fine lines and dark circles. It's an all-time serum that gives glow and shine to skin."
              },
              {
                title: "Nefol Furbish (Scrub)",
                desc: "Rice powder, Cassava flour and Papaya Fruit extract clean skin, prevent aging, remove dirt and dead skin. Marsh Mallow roots protect skin from harmful rays and pollution."
              },
              {
                title: "Nefol Wine Lotion",
                desc: "Wine extract gives bouncy elastic skin, makes the skin feel youthful or young. Grape seeds give Vitamin E and Vitamin C protect skin from UV rays and work as antioxidants."
              },
              {
                title: "Nefol Hair Lather (Shampoo)",
                desc: "Non ionic surfactant deep cleaning hair without stripping hair, tea tree gets rid of dandruff, prevents hair loss and enhances growth without split ends."
              },
              {
                title: "Nefol Anytime Cream",
                desc: "Yellow Dragon Fruit that has Vitamin C, gives glow to skin while saffron reduces under eye dark circles, it gives an even tone to skin and can be used AM to PM."
              },
              {
                title: "Nefol Hydrating Moisturizer",
                desc: "Blueberry and coconut oil clear congestion in skin, moisture and glow the skin."
              },
              {
                title: "Nefol Hair Tonic (Hair Oil)",
                desc: "Coconut oil, Mustard oil, Argan oil, Flex oil and Almond oil is perfect mixture for the best hair oil that Nefol is providing it strengthen hairs, prevent hair loss & split ends providing dandruff free. Amla providing Vitamin C to hairs avoiding split ends."
              },
              {
                title: "Nefol Hair Mask (Conditioner)",
                desc: "Shea Butter and Glycerin soften and moisture hair, hydrate hair. Quinoa gives Vitamin B, Vitamin E nourishes hair and provides healthy hair."
              }
            ].map((product, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm p-6">
                <h3 
                  className="text-lg sm:text-xl font-light mb-3 tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  {product.title}
                </h3>
                <p 
                  className="text-sm font-light tracking-wide leading-relaxed"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  {product.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Benefits */}
        <div className="mb-12 sm:mb-16 md:mb-20">
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-light mb-8 sm:mb-12 text-center tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            What Makes Us Different
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { icon: Leaf, title: "Natural & Safe", desc: "Nefol products are paraben, cruelty, nasties and sulphate free", color: 'var(--arctic-blue-primary)' },
              { icon: Shield, title: "International Compliance", desc: "Our products fulfill all international compliance and don't use prohibited components", color: 'var(--arctic-blue-primary)' },
              { icon: Award, title: "High Antioxidants", desc: "Enriched with high antioxidants that give dazzling beautiful skin", color: 'var(--arctic-blue-primary)' },
              { icon: Heart, title: "pH Balance", desc: "EDTA in all Nefol products maintains pH balance of the skin", color: 'var(--arctic-blue-primary)' }
            ].map((benefit, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm p-6 text-center" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6" style={{ color: benefit.color }} />
                </div>
                <h3 
                  className="text-lg sm:text-xl font-light mb-3 tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  {benefit.title}
                </h3>
                <p 
                  className="text-sm font-light tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Assurance */}
        <div className="mb-12 sm:mb-16 md:mb-20">
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-light mb-8 sm:mb-12 text-center tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Quality Assurance
          </h2>
          <div className="rounded-2xl p-6 sm:p-8 md:p-10" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <h3 
                className="text-xl sm:text-2xl md:text-3xl font-light mb-4 tracking-[0.15em]"
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family)',
                  letterSpacing: '0.15em'
                }}
              >
                International Standards
              </h3>
              <p 
                className="font-light leading-relaxed max-w-4xl mx-auto tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Our products fulfill all international compliance and Nefol products don't use components 
                that are internationally prohibited or interdict. We maintain the highest quality standards 
                to ensure your safety and satisfaction.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-10 md:p-12">
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-light mb-4 tracking-[0.15em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
            >
              Experience the Nefol Difference
            </h2>
            <p 
              className="text-sm sm:text-base font-light mb-8 tracking-wide max-w-2xl mx-auto"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              Join thousands of satisfied customers who have discovered the power of natural, 
              effective skincare with Nefol.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="#/user/shop" 
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
                SHOP NOW
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
                GET EXPERT ADVICE
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
