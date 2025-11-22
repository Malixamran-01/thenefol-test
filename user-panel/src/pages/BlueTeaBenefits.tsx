import React from 'react'
import { Heart, Shield, Zap, Brain, Moon, Sun, Leaf } from 'lucide-react'

export default function BlueTeaBenefits() {
  return (
    <main className="py-10 dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-6xl px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Blue Tea Benefits
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Discover the incredible health and beauty benefits of Blue Tea (Butterfly Pea Flower) - 
            a natural wonder that has been cherished for centuries.
          </p>
        </div>

        {/* What is Blue Tea */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                  What is Blue Tea?
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Blue tea is rich in anthocyanins. Anthocyanins give it bright blue color and medical properties 
                  that uplift the moods and enhance skin, stimulate hair growth. The flavonoids present in blue tea 
                  help to glow and give elasticity to the skin.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  It helps in brightening dull skin, removing dark spots and uneven skin tone. High antioxidants 
                  help the skin to glow, look young and beautiful. It is extracted from the plant called 
                  Clitoria Ternatea that has multiple benefits and is beneficial for skin.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-700 rounded-xl p-6">
                <img 
                  src="/IMAGES/blue-tea-benefits.jpg" 
                  alt="Blue Tea" 
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">
            Key Benefits of Blue Tea
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Mood Enhancement</h3>
              <p className="text-slate-600 dark:text-slate-400">
                The anthocyanins in Blue Tea have properties that uplift mood and promote 
                mental well-being, helping you feel refreshed and energized.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Skin Protection</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Rich antioxidants help protect your skin against pollution and give radical-free skin. 
                Ageing control and anti-infection free skin is possible with Blue Tea.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Skin Brightening</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Helps in brightening dull skin, removing dark spots and uneven skin tone. 
                High antioxidants help the skin to glow, look young and beautiful.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Skin Elasticity</h3>
              <p className="text-slate-600 dark:text-slate-400">
                The flavonoids present in blue tea help to glow and give elasticity to the skin, 
                making it more supple and youthful.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Moon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Hair Growth</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Rich antioxidants work amazingly for hair growth and skin. Stimulates hair follicles 
                naturally for stronger, healthier hair.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
                <Sun className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">Anti-Aging</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Powerful antioxidants help fight signs of aging by neutralizing free radicals 
                and promoting cellular regeneration for youthful skin.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Benefits */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8 text-center">
            Why Blue Tea is Special
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Clitoria Ternatea Extract
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Extracted from the plant called Clitoria Ternatea that has multiple benefits 
                    and is beneficial for skin. This natural extract is the foundation of our products.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Rich in Anthocyanins
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Blue tea is rich in anthocyanins which give it bright blue color and medical properties. 
                    These compounds provide powerful antioxidant benefits.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Natural Flavonoids
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    The flavonoids present in blue tea help to glow and give elasticity to the skin, 
                    making it more resilient and beautiful.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Pollution Protection
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Helps to defend your skin against pollution and also give radical-free skin. 
                    Perfect for modern urban environments.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sun className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Age Control
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Ageing control and anti-infection free skin is possible with Blue Tea. 
                    Maintains youthful appearance naturally.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Brain className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Hair & Skin Benefits
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Rich antioxidants work amazingly for hair growth and skin. Stimulates both 
                    hair follicles and skin cells for optimal health.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Experience Blue Tea Benefits</h2>
          <p className="text-xl mb-8 opacity-90">
            Discover our range of Blue Tea-infused skincare products and experience the natural power of this incredible ingredient.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#/user/shop" 
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Shop Blue Tea Products
            </a>
            <a 
              href="#/user/contact" 
              className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
