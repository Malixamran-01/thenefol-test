import React from 'react'
import { Leaf, Shield, Award, Heart, Users, Zap, Globe, Star, CheckCircle } from 'lucide-react'

export default function USP() {
  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-6xl px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Why Choose Nefol?
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Discover what makes Nefol products truly special and why thousands of customers 
            trust us for their skincare needs.
          </p>
        </div>

        {/* Main USP */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Nefol Aesthetics Products
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Enriched with high antioxidants give dazzling beautiful skin
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Blue Tea Excellence
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  It is extracted from the plant called Clitoria Ternatea (Aprajita) that has multiple benefits 
                  and is beneficial for skin. Rich antioxidants which work staggering for hair growth and gleam the skin.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  It also helps to defend your skin against pollution and also give radical free skin. 
                  Blue tea present in the Nefol products is rich in Anthocyanins.
                </p>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Natural Properties
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Anthocyanins give it bright blue color and medical properties it uplift the moods and 
                  enhance skin, stimulate hair growth. The flavonoids existing in blue tea help to glow 
                  and are malleable to the skin.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  EDTA in all Nefol products maintains pH balance of the skin.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Range */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">
            Our Product Range
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Nefol Face Cleanser</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Yuja (Vitamin C, Vitamin B5) helps in brightening dull skin boosting collagen production 
                reducing signs of aging. Kananga Tree gives a soothing effect in acne prone and to the 
                sensitive skin also it is beneficial in summer for oily skin.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Nefol Face Mask</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Cassava Flour, AHA's, BHA's, Rose petals make the skin glow and brighten skin reducing 
                fine lines wrinkles improving skin texture and make it glow.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Nefol Face Serum</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Green tea and White tea hydrate skin to prevent wrinkles and fine lines and dark circles. 
                It's an all-time serum that gives glow and shine to skin.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Nefol Furbish (Scrub)</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Rice powder, Cassava flour and Papaya Fruit extract clean skin, prevent aging, remove dirt 
                and dead skin. Marsh Mallow roots protect skin from harmful rays and pollution.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Nefol Wine Lotion</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Wine extract gives bouncy elastic skin, makes the skin feel youthful or young. Grape seeds 
                give Vitamin E and Vitamin C protect skin from UV rays and work as antioxidants.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Nefol Hair Lather (Shampoo)</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Non ionic surfactant deep cleaning hair without stripping hair, tea tree gets rid of dandruff, 
                prevents hair loss and enhances growth without split ends.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Nefol Anytime Cream</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Yellow Dragon Fruit that has Vitamin C, gives glow to skin while saffron reduces under eye 
                dark circles, it gives an even tone to skin and can be used AM to PM.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Nefol Hydrating Moisturizer</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Blueberry and coconut oil clear congestion in skin, moisture and glow the skin.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Nefol Hair Tonic (Hair Oil)</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Coconut oil, Mustard oil, Argan oil, Flex oil and Almond oil is perfect mixture for the best 
                hair oil that Nefol is providing it strengthen hairs, prevent hair loss & split ends providing 
                dandruff free. Amla providing Vitamin C to hairs avoiding split ends.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Nefol Hair Mask (Conditioner)</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Shea Butter and Glycerin soften and moisture hair, hydrate hair. Quinoa gives Vitamin B, 
                Vitamin E nourishes hair and provides healthy hair.
              </p>
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">
            What Makes Us Different
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                Natural & Safe
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Nefol products are paraben, cruelty, nasties and sulphate free
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                International Compliance
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Our products fulfill all international compliance and don't use prohibited components
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                High Antioxidants
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Enriched with high antioxidants that give dazzling beautiful skin
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
                pH Balance
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                EDTA in all Nefol products maintains pH balance of the skin
              </p>
            </div>
          </div>
        </div>

        {/* Quality Assurance */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">
            Quality Assurance
          </h2>
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                International Standards
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl mx-auto">
                Our products fulfill all international compliance and Nefol products don't use components 
                that are internationally prohibited or interdict. We maintain the highest quality standards 
                to ensure your safety and satisfaction.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Experience the Nefol Difference</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of satisfied customers who have discovered the power of natural, 
            effective skincare with Nefol.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#/user/shop" 
              className="inline-block bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Shop Now
            </a>
            <a 
              href="#/user/contact" 
              className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition-colors"
            >
              Get Expert Advice
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
