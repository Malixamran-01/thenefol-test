import React, { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'

export default function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(item => item !== index)
        : [...prev, index]
    )
  }

  const faqs = [
    {
      question: "What makes NEFOL AESTHETICS products unique?",
      answer: "NEFOL AESTHETICS products are crafted with a unique blend of nature that contain Clitoria Ternatea flower extract also known as BlueTea (Aprajita). Nefol products are clinically proven, safe, and effective components. Our formulations are carefully developed to deliver effective results, addressing specific skincare concerns while promoting overall skin health. Our products fulfil all international compliance to provide the best product to our customer. Nefol products basically combine modern technology with natural ingredients to give the best products to society."
    },
    {
      question: "Are NEFOL AESTHETICS products suitable for all skin types?",
      answer: "Yes, NEFOL AESTHETICS products are designed to be suitable for all skin types including acne-prone skin. Each product is formulated to provide optimal benefits for your skin concern while being gentle on the skin. AHA and BHA components used in Nefol products enhance the skin."
    },
    {
      question: "How do I determine which NEFOL AESTHETICS product is right for me?",
      answer: "We recommended considering your specific skincare concerns and goals. Our product descriptions provide details about their benefits and recommended usage. Additionally, you can consult skincare experts for personalised recommendations."
    },
    {
      question: "Can I use NEFOL AESTHETICS products if I have sensitive skin?",
      answer: "Yes, most of our products are formulated with gentle components like triethanolamine to accommodate sensitive skin. However, it's always recommended to perform a patch test before incorporating new products into your routine to ensure compatibility and to consult with a dermatologist if you have specific sensitivities."
    },
    {
      question: "Are NEFOL AESTHETICS products tested on animals?",
      answer: "No, we are committed to being a cruelty-free brand. NEFOL AESTHETICS does not conduct any testing on animals, and our products are certified cruelty-free."
    },
    {
      question: "How often should I use NEFOL AESTHETICS products for best results?",
      answer: "The frequency of the product used depends on the specific product and its instructions. Generally, following the recommended usage guidelines on the product packaging or as advised by our skincare experts will help you achieve the best results."
    },
    {
      question: "Can NEFOL AESTHETICS products be used in combination with other skincare brands?",
      answer: "We do not have the safety study for other brands. However, it's essential to ensure compatibility and patch-test with other brands. We recommend integrating one product at a time to observe how your skin responds and adjust accordingly."
    },
    {
      question: "What are the key components used in NEFOL AESTHETICS products?",
      answer: "Nefol skincare products feature a range of thoughtfully selected components such as Blue Tea, Charcoal, hylocereus undatus fruit extract, hyaluronic acid, and purified water, phenoxyethanol and ethylhexylglycerin. Each product description provides detailed information about its benefits."
    },
    {
      question: "Are NEFOL AESTHETICS products free from harmful chemicals and parabens?",
      answer: "Yes, we prioritise formulating our products without harmful chemicals like parabens, sulphates, mineral oil, and artificial fragrances. We aim to deliver safe and effective skincare solutions that promote skin health."
    },
    {
      question: "How long does it take to see results from using NEFOL AESTHETICS products?",
      answer: "Results may vary depending on individual factors and the specific product used. In general, it is recommended to use our products consistently and as directed for several weeks to observe visible improvements in your skin. Remember, skincare is a journey, and patience is key."
    },
    {
      question: "Where can I purchase NEFOL AESTHETICS products?",
      answer: "NEFOL AESTHETICS products are available for purchase on our official website (www.nefol.in). We ensure a secure and convenient online shopping experience for our customers."
    },
    {
      question: "What is the shipping policy for NEFOL AESTHETICS orders?",
      answer: "We offer various shipping options depending on your location. Shipping details, including estimated delivery times and costs, are provided during the checkout process. We strive to process orders promptly and ensure timely delivery."
    },
    {
      question: "Can I track the status of my NEFOL AESTHETICS order?",
      answer: "Yes, once your order is confirmed and shipped, you will receive a tracking number via email/ WhatsApp. You can use the tracking number to monitor the progress of your shipment and stay updated on its estimated delivery date."
    }
  ]

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
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6" style={{ backgroundColor: 'var(--arctic-blue-light)' }}>
            <HelpCircle className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--arctic-blue-primary)' }} />
          </div>
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 sm:mb-6 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Frequently Asked Questions
          </h1>
          <p 
            className="text-sm sm:text-base font-light max-w-3xl mx-auto tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Find answers to common questions about Nefol products, usage, and policies.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-3 sm:space-y-4 mb-12 sm:mb-16">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl shadow-sm overflow-hidden border"
              style={{ borderColor: openItems.includes(index) ? 'var(--arctic-blue-primary)' : 'transparent' }}
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left flex items-center justify-between transition-colors"
                style={{ backgroundColor: openItems.includes(index) ? 'var(--arctic-blue-lighter)' : 'white' }}
              >
                <h3 
                  className="text-sm sm:text-base font-light pr-2 sm:pr-4 tracking-wide"
                  style={{ color: '#1a1a1a', letterSpacing: '0.05em' }}
                >
                  {faq.question}
                </h3>
                {openItems.includes(index) ? (
                  <ChevronUp className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--arctic-blue-primary)' }} />
                ) : (
                  <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: '#666' }} />
                )}
              </button>
              
              {openItems.includes(index) && (
                <div className="px-4 sm:px-6 pb-3 sm:pb-4">
                  <div className="border-t pt-3 sm:pt-4" style={{ borderColor: 'var(--arctic-blue-light)' }}>
                    <p 
                      className="text-sm sm:text-base leading-relaxed tracking-wide"
                      style={{ color: '#666', letterSpacing: '0.05em' }}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-10 text-center">
          <h2 
            className="text-xl sm:text-2xl md:text-3xl font-light mb-3 sm:mb-4 tracking-[0.15em]"
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family)',
              letterSpacing: '0.15em'
            }}
          >
            Still Have Questions?
          </h2>
          <p 
            className="mb-4 sm:mb-6 text-sm sm:text-base tracking-wide"
            style={{ color: '#666', letterSpacing: '0.05em' }}
          >
            Can't find the answer you're looking for? Our customer support team is here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              CONTACT SUPPORT
            </a>
            <a 
              href="tel:+918887847213" 
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
              CALL US: +91-8887-847213
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
