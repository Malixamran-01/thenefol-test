import React from 'react'
import { Heart, Leaf, Users, Award, Target, Globe, Shield } from 'lucide-react'

export default function AboutUs() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            ABOUT NEFOL
          </h1>
          <p 
            className="text-sm sm:text-base font-light max-w-3xl mx-auto tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Natural beauty products that combine science with herbs, crafted with care and commitment to quality.
          </p>
        </div>

        {/* Our Story */}
        <div className="mb-12 sm:mb-16 md:mb-20">
          <div className="rounded-2xl p-6 sm:p-8 md:p-10" style={{ backgroundColor: 'var(--arctic-blue-lighter)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-center">
              <div>
                <h2 
                  className="text-2xl sm:text-3xl md:text-4xl font-light mb-6 sm:mb-8 tracking-[0.15em]"
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family)',
                    letterSpacing: '0.15em'
                  }}
                >
                  Our Story
                </h2>
                <p 
                  className="font-light leading-relaxed mb-6 tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  NEFOL® has a series of beauty products that don't have harmful components in them. 
                  NEFOL® products are based on the concept of combination with science and herbs. 
                  NEFOL® Aesthetics Private Limited extends social and financial help to causes such as 
                  education, health, women's rights and empowerment, rural development.
                </p>
                <p 
                  className="font-light leading-relaxed tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  The concept of providing quality products to society took a long time for research. 
                  NEFOL® fulfilled all the global norms and set its standard accordingly.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <img 
                  src="/IMAGES/about-us-story.jpg" 
                  alt="NEFOL® Story" 
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Blue Tea Innovation */}
        <div className="mb-12 sm:mb-16 md:mb-20">
            <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-light mb-8 sm:mb-12 text-center tracking-[0.15em]"
            style={{
                color: 'var(--color-text-body)',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
          >
            Our Innovation: Blue Tea
          </h2>
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-center">
              <div>
                <img 
                  src="/IMAGES/blue pea.webp" 
                  alt="Blue Tea Flower" 
                  className="w-full h-64 sm:h-80 object-contain"
                />
              </div>
              <div>
                <h3 
                  className="text-xl sm:text-2xl md:text-3xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
                  style={{
                    color: 'var(--color-text-body)',
                    fontFamily: 'var(--font-heading-family)',
                    letterSpacing: '0.15em'
                  }}
                >
                  The Power of Blue Pea Flower
                </h3>
                <p 
                  className="font-light leading-relaxed mb-4 tracking-wide"
                  style={{ color: '#666', letterSpacing: '0.05em' }}
                >
                  Our signature ingredient, Blue Tea (Aprajita), is a natural powerhouse rich in antioxidants, 
                  anthocyanins, and flavonoids. This beautiful flower has been used in traditional Ayurvedic 
                  medicine for centuries and is now at the heart of our modern skincare formulations.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--arctic-blue-primary)' }}></div>
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                    >
                      Natural skin brightening properties
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--arctic-blue-primary)' }}></div>
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                    >
                      Anti-inflammatory and soothing effects
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--arctic-blue-primary)' }}></div>
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                    >
                      Rich in antioxidants for skin protection
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--arctic-blue-primary)' }}></div>
                    <span 
                      className="font-light tracking-wide"
                      style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                    >
                      Supports collagen and skin elasticity
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Values */}
        <div className="mb-12 sm:mb-16 md:mb-20">
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-light mb-8 sm:mb-12 text-center tracking-[0.15em]"
              style={{
                color: 'var(--color-text-body)',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
            >
            Our Values
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Leaf className="w-8 h-8" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <h3 
                className="text-xl sm:text-2xl font-light mb-3 tracking-[0.15em]"
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family)',
                  letterSpacing: '0.15em'
                }}
              >
                Natural & Pure
              </h3>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                We use only natural, plant-based ingredients without harmful chemicals or synthetic additives.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Shield className="w-8 h-8" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <h3 
                className="text-xl sm:text-2xl font-light mb-3 tracking-[0.15em]"
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family)',
                  letterSpacing: '0.15em'
                }}
              >
                Safe & Gentle
              </h3>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Our products are formulated to be gentle on all skin types, including sensitive skin.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Award className="w-8 h-8" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <h3 
                className="text-xl sm:text-2xl font-light mb-3 tracking-[0.15em]"
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family)',
                  letterSpacing: '0.15em'
                }}
              >
                Quality Assured
              </h3>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                Every product undergoes rigorous testing to meet the highest quality standards.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Globe className="w-8 h-8" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <h3 
                className="text-xl sm:text-2xl font-light mb-3 tracking-[0.15em]"
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family)',
                  letterSpacing: '0.15em'
                }}
              >
                Sustainable
              </h3>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                We are committed to sustainable practices and environmentally friendly packaging.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Users className="w-8 h-8" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <h3 
                className="text-xl sm:text-2xl font-light mb-3 tracking-[0.15em]"
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family)',
                  letterSpacing: '0.15em'
                }}
              >
                Community Focused
              </h3>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                We support education, health, women's rights, and rural development initiatives.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
                <Target className="w-8 h-8" style={{ color: 'var(--arctic-blue-primary)' }} />
              </div>
              <h3 
                className="text-xl sm:text-2xl font-light mb-3 tracking-[0.15em]"
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family)',
                  letterSpacing: '0.15em'
                }}
              >
                Innovation
              </h3>
              <p 
                className="font-light tracking-wide"
                style={{ color: '#666', letterSpacing: '0.05em' }}
              >
                We combine traditional knowledge with modern science to create effective products.
              </p>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="mb-12 sm:mb-16 md:mb-20">
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-light mb-8 sm:mb-12 text-center tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Our Certifications
          </h2>
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-10">
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 md:gap-10">
              <div className="text-center">
                <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src="/IMAGES/cruielty.webp" 
                    alt="Cruelty-Free"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p 
                  className="text-sm font-light tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Cruelty-Free
                </p>
              </div>
              <div className="text-center">
                <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src="/IMAGES/paraben.webp" 
                    alt="Paraben-Free"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p 
                  className="text-sm font-light tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Paraben-Free
                </p>
              </div>
              <div className="text-center">
                <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src="/IMAGES/india.webp" 
                    alt="Made in India"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p 
                  className="text-sm font-light tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Made in India
                </p>
              </div>
              <div className="text-center">
                <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src="/IMAGES/chemical.webp" 
                    alt="Chemical-Free"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p 
                  className="text-sm font-light tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Chemical-Free
                </p>
              </div>
              <div className="text-center">
                <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src="/IMAGES/vegan.webp" 
                    alt="Vegan"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p 
                  className="text-sm font-light tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  Vegan
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-10">
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family)',
                letterSpacing: '0.15em'
              }}
            >
              Join Our Journey
            </h2>
            <p 
              className="text-sm sm:text-base font-light mb-6 sm:mb-8 max-w-2xl mx-auto tracking-wide"
              style={{ color: '#666', letterSpacing: '0.05em' }}
            >
              Experience the power of natural beauty with NEFOL®. Discover our range of products 
              and become part of our community committed to natural, effective skincare.
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
                CONTACT US
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
