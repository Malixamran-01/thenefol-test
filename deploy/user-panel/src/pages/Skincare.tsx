export default function Skincare() {
  return (
    <main className="py-10" style={{ backgroundColor: '#F4F9F9' }}>
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="mb-2 text-3xl font-bold" style={{ color: '#1B4965' }}>Skincare</h1>
        <p className="mb-6" style={{ color: '#9DB4C0' }}>Clean, effective formulas designed for real results.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[
            {cat: 'Cleansers', src: '/IMAGES/FACE CLEANSER (4).jpg'},
            {cat: 'Serums', src: '/IMAGES/FACE SERUM (4).jpg'},
            {cat: 'Moisturizers', src: '/IMAGES/HYDRATING MOISTURIZER (4).jpg'},
            {cat: 'Masks', src: '/IMAGES/FACE MASK (4).jpg'},
            {cat: 'Treatments', src: '/IMAGES/ANYTIME CREAM (2).jpg'},
            {cat: 'Suncare', src: '/IMAGES/ANYTIME CREAM (5).jpg'}
          ].map((i) => (
            <div key={i.cat} className="rounded-xl border border-gray-200 bg-white p-5">
              <img src={i.src} alt={i.cat} className="mb-3 h-40 w-full rounded-lg border border-gray-200 object-cover" loading="lazy" />
              <h3 className="text-lg font-semibold" style={{ color: '#1B4965' }}>{i.cat}</h3>
              <p className="mt-1 text-sm" style={{ color: '#9DB4C0' }}>Explore {i.cat.toLowerCase()} tailored for your skin.</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}


