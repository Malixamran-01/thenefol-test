import React from 'react'
import { Heart, Leaf, Users, Award, Target, Globe, Shield } from 'lucide-react'

export default function AboutUs() {
  return (
    <main className="min-h-screen py-10" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-7xl px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-serif mb-6" style={{color: '#1B4965'}}>
            ABOUT NEFOL
          </h1>
          <p className="text-xl font-light max-w-3xl mx-auto" style={{color: '#9DB4C0'}}>
            Natural beauty products that combine science with herbs, crafted with care and commitment to quality.
          </p>
        </div>

        {/* Our Story */}
        <div className="mb-16">
          <div className="rounded-2xl p-8" style={{backgroundColor: '#D0E8F2'}}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-serif mb-6" style={{color: '#1B4965'}}>
                  Our Story
                </h2>
                <p className="font-light leading-relaxed mb-6" style={{color: '#9DB4C0'}}>
                  Nefol has a series of beauty products that don't have harmful components in them. 
                  Nefol products are based on the concept of combination with science and herbs. 
                  Nefol Aesthetics Private Limited extends social and financial help to causes such as 
                  education, health, women's rights and empowerment, rural development.
                </p>
                <p className="font-light leading-relaxed" style={{color: '#9DB4C0'}}>
                  The concept of providing quality products to society took a long time for research. 
                  Nefol fulfilled all the global norms and set its standard accordingly.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6">
                <img 
                  src="/IMAGES/about-us-story.jpg" 
                  alt="Nefol Story" 
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Blue Tea Innovation */}
        <div className="mb-16">
          <h2 className="text-3xl font-serif mb-8 text-center" style={{color: '#1B4965'}}>
            Our Innovation: Blue Tea
          </h2>
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <img 
                  src="/IMAGES/blue pea.png" 
                  alt="Blue Tea Flower" 
                  className="w-full h-80 object-contain"
                />
              </div>
              <div>
                <h3 className="text-2xl font-serif mb-4" style={{color: '#1B4965'}}>
                  The Power of Blue Pea Flower
                </h3>
                <p className="font-light leading-relaxed mb-4" style={{color: '#9DB4C0'}}>
                  Our signature ingredient, Blue Tea (Aprajita), is a natural powerhouse rich in antioxidants, 
                  anthocyanins, and flavonoids. This beautiful flower has been used in traditional Ayurvedic 
                  medicine for centuries and is now at the heart of our modern skincare formulations.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#4B97C9'}}></div>
                    <span className="font-light" style={{color: '#1B4965'}}>Natural skin brightening properties</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#4B97C9'}}></div>
                    <span className="font-light" style={{color: '#1B4965'}}>Anti-inflammatory and soothing effects</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#4B97C9'}}></div>
                    <span className="font-light" style={{color: '#1B4965'}}>Rich in antioxidants for skin protection</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#4B97C9'}}></div>
                    <span className="font-light" style={{color: '#1B4965'}}>Supports collagen and skin elasticity</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-serif mb-12 text-center" style={{color: '#1B4965'}}>
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: '#D0E8F2'}}>
                <Leaf className="w-8 h-8" style={{color: '#4B97C9'}} />
              </div>
              <h3 className="text-xl font-serif mb-3" style={{color: '#1B4965'}}>Natural & Pure</h3>
              <p className="font-light" style={{color: '#9DB4C0'}}>
                We use only natural, plant-based ingredients without harmful chemicals or synthetic additives.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: '#D0E8F2'}}>
                <Shield className="w-8 h-8" style={{color: '#4B97C9'}} />
              </div>
              <h3 className="text-xl font-serif mb-3" style={{color: '#1B4965'}}>Safe & Gentle</h3>
              <p className="font-light" style={{color: '#9DB4C0'}}>
                Our products are formulated to be gentle on all skin types, including sensitive skin.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: '#D0E8F2'}}>
                <Award className="w-8 h-8" style={{color: '#4B97C9'}} />
              </div>
              <h3 className="text-xl font-serif mb-3" style={{color: '#1B4965'}}>Quality Assured</h3>
              <p className="font-light" style={{color: '#9DB4C0'}}>
                Every product undergoes rigorous testing to meet the highest quality standards.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: '#D0E8F2'}}>
                <Globe className="w-8 h-8" style={{color: '#4B97C9'}} />
              </div>
              <h3 className="text-xl font-serif mb-3" style={{color: '#1B4965'}}>Sustainable</h3>
              <p className="font-light" style={{color: '#9DB4C0'}}>
                We are committed to sustainable practices and environmentally friendly packaging.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: '#D0E8F2'}}>
                <Users className="w-8 h-8" style={{color: '#4B97C9'}} />
              </div>
              <h3 className="text-xl font-serif mb-3" style={{color: '#1B4965'}}>Community Focused</h3>
              <p className="font-light" style={{color: '#9DB4C0'}}>
                We support education, health, women's rights, and rural development initiatives.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: '#D0E8F2'}}>
                <Target className="w-8 h-8" style={{color: '#4B97C9'}} />
              </div>
              <h3 className="text-xl font-serif mb-3" style={{color: '#1B4965'}}>Innovation</h3>
              <p className="font-light" style={{color: '#9DB4C0'}}>
                We combine traditional knowledge with modern science to create effective products.
              </p>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="mb-16">
          <h2 className="text-3xl font-serif mb-8 text-center" style={{color: '#1B4965'}}>
            Our Certifications
          </h2>
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex flex-wrap justify-center items-center gap-8">
              <div className="text-center">
                <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src="/IMAGES/cruielty.jpg" 
                    alt="Cruelty-Free"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm font-medium" style={{color: '#1B4965'}}>Cruelty-Free</p>
              </div>
              <div className="text-center">
                <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src="/IMAGES/paraben.jpg" 
                    alt="Paraben-Free"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm font-medium" style={{color: '#1B4965'}}>Paraben-Free</p>
              </div>
              <div className="text-center">
                <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src="/IMAGES/india.jpg" 
                    alt="Made in India"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm font-medium" style={{color: '#1B4965'}}>Made in India</p>
              </div>
              <div className="text-center">
                <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src="/IMAGES/chemical.jpg" 
                    alt="Chemical-Free"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm font-medium" style={{color: '#1B4965'}}>Chemical-Free</p>
              </div>
              <div className="text-center">
                <div className="w-32 h-24 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src="/IMAGES/vegan.jpg" 
                    alt="Vegan"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm font-medium" style={{color: '#1B4965'}}>Vegan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-3xl font-serif mb-4" style={{color: '#1B4965'}}>
              Join Our Journey
            </h2>
            <p className="text-lg font-light mb-6 max-w-2xl mx-auto" style={{color: '#9DB4C0'}}>
              Experience the power of natural beauty with Nefol. Discover our range of products 
              and become part of our community committed to natural, effective skincare.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="#/user/shop"
                className="px-8 py-4 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg"
                style={{backgroundColor: '#1B4965'}}
              >
                SHOP NOW
              </a>
              <a 
                href="#/user/contact"
                className="px-8 py-4 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg"
                style={{backgroundColor: '#4B97C9'}}
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
