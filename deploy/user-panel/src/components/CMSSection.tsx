import React from 'react'
import { CMSSection as CMSSectionType } from '../services/cms'

interface CMSSectionProps {
  section: CMSSectionType
}

/**
 * Universal CMS Section Renderer
 * Renders different section types based on section_type
 */
export default function CMSSection({ section }: CMSSectionProps) {
  const { section_type, content } = section

  switch (section_type) {
    case 'hero':
      return <HeroSection content={content} />
    
    case 'text':
      return <TextSection content={content} />
    
    case 'grid':
      return <GridSection content={content} />
    
    case 'list':
      return <ListSection content={content} />
    
    case 'features':
      return <FeaturesSection content={content} />
    
    case 'cta':
      return <CTASection content={content} />
    
    case 'contact':
      return <ContactSection content={content} />
    
    default:
      return <DefaultSection content={content} />
  }
}

// Hero Section Component
function HeroSection({ content }: { content: any }) {
  return (
    <section className="relative py-20" style={{background: 'linear-gradient(135deg, #4B97C9 0%, #D0E8F2 50%, #9DB4C0 100%)'}}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            {content.title && (
              <h1 className="text-4xl md:text-6xl font-serif mb-6 text-white">
                {content.title}
              </h1>
            )}
            {content.subtitle && (
              <h2 className="text-5xl md:text-7xl font-serif font-bold mb-6 text-white">
                {content.subtitle}
              </h2>
            )}
            {content.description && (
              <p className="text-lg mb-8 font-light text-white">
                {content.description}
              </p>
            )}
            {content.buttonText && content.buttonLink && (
              <a
                href={content.buttonLink}
                className="inline-block px-8 py-4 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg"
                style={{backgroundColor: '#1B4965'}}
              >
                {content.buttonText}
              </a>
            )}
          </div>
          {content.images && content.images.length > 0 && (
            <div className="relative">
              <img 
                src={content.images[0]} 
                alt={content.title || 'Hero'}
                className="w-full h-96 object-cover rounded-lg shadow-2xl"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// Text Section Component
function TextSection({ content }: { content: any }) {
  return (
    <section className="py-16" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-7xl px-4">
        {content.title && (
          <h2 className="text-3xl font-serif mb-4 text-center" style={{color: '#1B4965'}}>
            {content.title}
          </h2>
        )}
        {content.description && (
          <p className="text-lg text-center max-w-3xl mx-auto" style={{color: '#9DB4C0'}}>
            {content.description}
          </p>
        )}
      </div>
    </section>
  )
}

// Grid Section Component (Categories, Products, etc.)
function GridSection({ content }: { content: any }) {
  const items = content.categories || content.items || []
  
  return (
    <section className="py-16" style={{backgroundColor: '#D0E8F2'}}>
      <div className="mx-auto max-w-7xl px-4">
        {content.title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif mb-4" style={{color: '#1B4965'}}>
              {content.title}
            </h2>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {items.map((item: any, index: number) => (
            <div 
              key={index} 
              className="text-center group cursor-pointer"
              onClick={() => item.link && (window.location.hash = item.link)}
            >
              {item.image && (
                <div className="mx-auto mb-4 flex items-center justify-center w-full max-w-[280px] md:max-w-[360px] aspect-square">
                  <img
                    src={item.image}
                    alt={item.name || item.title}
                    className="block w-full h-full object-contain rounded-full"
                    style={{ filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.28))' }}
                  />
                </div>
              )}
              <h3 className="text-sm font-medium tracking-wide" style={{color: '#1B4965'}}>
                {item.name || item.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// List Section Component (Blog Posts, etc.)
function ListSection({ content }: { content: any }) {
  const items = content.posts || content.items || []
  const featured = items.filter((item: any) => item.featured)
  const regular = items.filter((item: any) => !item.featured)
  
  return (
    <section className="py-16" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-7xl px-4">
        {content.title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif mb-4" style={{color: '#1B4965'}}>
              {content.title}
            </h2>
            {content.subtitle && (
              <p className="text-lg font-light max-w-2xl mx-auto" style={{color: '#9DB4C0'}}>
                {content.subtitle}
              </p>
            )}
          </div>
        )}
        
        {/* Featured Items */}
        {featured.map((item: any, index: number) => (
          <div key={index} className="mb-16 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {item.image && (
                <div className="relative">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-96 lg:h-full object-cover"
                  />
                </div>
              )}
              <div className="p-8 flex flex-col justify-center">
                {item.date && (
                  <div className="mb-4">
                    <span className="text-sm font-light" style={{color: '#9DB4C0'}}>{item.date}</span>
                  </div>
                )}
                <h2 className="text-3xl font-serif mb-4" style={{color: '#1B4965'}}>
                  {item.title}
                </h2>
                {item.excerpt && (
                  <p className="text-lg font-light mb-6 leading-relaxed" style={{color: '#9DB4C0'}}>
                    {item.excerpt}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Regular Items Grid */}
        {regular.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regular.map((item: any, index: number) => (
              <article key={index} className="bg-white rounded-lg shadow-sm group overflow-hidden">
                {item.image && (
                  <div className="relative overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-6">
                  {item.date && (
                    <div className="mb-3">
                      <span className="text-sm font-light" style={{color: '#9DB4C0'}}>{item.date}</span>
                    </div>
                  )}
                  <h3 className="text-xl font-serif mb-3" style={{color: '#1B4965'}}>
                    {item.title}
                  </h3>
                  {item.excerpt && (
                    <p className="text-sm font-light mb-4 leading-relaxed" style={{color: '#9DB4C0'}}>
                      {item.excerpt}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// Features Section Component
function FeaturesSection({ content }: { content: any }) {
  const features = content.features || []
  const badges = content.badges || []
  
  return (
    <section className="py-16" style={{backgroundColor: '#9DB4C0'}}>
      <div className="mx-auto max-w-7xl px-4">
        {content.title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif mb-4 text-white">
              {content.title}
            </h2>
            {content.description && (
              <p className="text-lg font-light max-w-2xl mx-auto text-white">
                {content.description}
              </p>
            )}
          </div>
        )}
        
        {/* Badges/Certifications */}
        {badges.length > 0 && (
          <div className="flex flex-wrap justify-center items-center gap-8">
            {badges.map((badge: any, index: number) => (
              <div key={index} className="text-center">
                <div className="w-48 h-36 mx-auto mb-4 flex items-center justify-center">
                  <img 
                    src={badge.image} 
                    alt={badge.alt || ''}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Features Grid */}
        {features.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature: any, index: number) => (
              <div key={index} className="bg-white rounded-xl p-6 text-center">
                <h3 className="text-lg font-bold mb-3" style={{color: '#1B4965'}}>
                  {feature.title}
                </h3>
                {feature.description && (
                  <p className="text-sm" style={{color: '#9DB4C0'}}>
                    {feature.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// CTA Section Component
function CTASection({ content }: { content: any }) {
  return (
    <section className="py-16" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-xl border border-gray-200 p-8" style={{backgroundColor: '#D0E8F2'}}>
          {content.icon && (
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{backgroundColor: '#4B97C9'}}>
              <span className="text-xl text-white">{content.icon}</span>
            </div>
          )}
          {content.title && (
            <h3 className="mb-4 text-2xl font-serif" style={{color: '#1B4965'}}>
              {content.title}
            </h3>
          )}
          {content.description && (
            <p className="mb-6 font-light" style={{color: '#9DB4C0'}}>
              {content.description}
            </p>
          )}
          {content.features && content.features.length > 0 && (
            <div className="space-y-3 mb-6">
              {content.features.map((feature: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <span style={{color: '#4B97C9'}}>✓</span>
                  <span className="text-sm font-light" style={{color: '#1B4965'}}>{feature}</span>
                </div>
              ))}
            </div>
          )}
          {content.buttonText && content.buttonLink && (
            <a 
              href={content.buttonLink} 
              className="inline-block px-8 py-4 text-white font-medium transition-all duration-300 text-sm tracking-wide uppercase shadow-lg rounded-lg"
              style={{backgroundColor: '#1B4965'}}
            >
              {content.buttonText}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

// Contact Section Component
function ContactSection({ content }: { content: any }) {
  return (
    <section className="py-16" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-7xl px-4">
        {content.title && (
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif mb-4" style={{color: '#1B4965'}}>
              {content.title}
            </h2>
            {content.subtitle && (
              <p className="text-lg max-w-3xl mx-auto" style={{color: '#9DB4C0'}}>
                {content.subtitle}
              </p>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Office Information */}
          {content.offices && content.offices.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4" style={{color: '#1B4965'}}>Office Addresses</h3>
              {content.offices.map((office: any, index: number) => (
                <div key={index} className="rounded-lg border border-gray-200 p-4" style={{backgroundColor: '#D0E8F2'}}>
                  <h4 className="font-medium mb-2" style={{color: '#1B4965'}}>{office.name}</h4>
                  <p className="font-light whitespace-pre-line" style={{color: '#9DB4C0'}}>
                    {office.address}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4" style={{color: '#1B4965'}}>Contact Details</h3>
            {content.phone && (
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{backgroundColor: '#D0E8F2'}}>
                  <span style={{color: '#4B97C9'}}>📞</span>
                </div>
                <div>
                  <p className="font-medium" style={{color: '#1B4965'}}>Phone</p>
                  <p className="font-light" style={{color: '#9DB4C0'}}>{content.phone}</p>
                </div>
              </div>
            )}
            {content.email && (
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{backgroundColor: '#D0E8F2'}}>
                  <span style={{color: '#4B97C9'}}>✉️</span>
                </div>
                <div>
                  <p className="font-medium" style={{color: '#1B4965'}}>Email</p>
                  <p className="font-light" style={{color: '#9DB4C0'}}>{content.email}</p>
                </div>
              </div>
            )}
            {content.whatsapp && (
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{backgroundColor: '#D0E8F2'}}>
                  <span style={{color: '#4B97C9'}}>💬</span>
                </div>
                <div>
                  <p className="font-medium" style={{color: '#1B4965'}}>WhatsApp</p>
                  <p className="font-light" style={{color: '#9DB4C0'}}>{content.whatsapp}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// Default Section Component (Fallback)
function DefaultSection({ content }: { content: any }) {
  return (
    <section className="py-16" style={{backgroundColor: '#F4F9F9'}}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <pre className="whitespace-pre-wrap font-mono text-sm">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  )
}

