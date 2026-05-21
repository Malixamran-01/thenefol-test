/** Ten ingredients that ship as webp assets on production (exact filenames). */

export type AdditionalIngredient = {
  id: string
  name: string
  image: string
  description: string
  detailedInfo: string
}

export type AdditionalIngredientMeta = {
  sci: string
  tag: string
  origin: string
  snippet: string
  benefits: string[]
  bars: [string, number][]
  stats: [string, string][]
}

export const additionalIngredients: AdditionalIngredient[] = [
  {
    id: 'c13-14-isoparaffin',
    name: 'C13-14 Isoparaffin',
    image: '/IMAGES/C13-14 Isoparaffin.webp',
    description: `C13-14 Isoparaffin is a lightweight, branched hydrocarbon emollient widely used in modern skincare. It spreads easily, leaves a silky dry-touch finish, and helps formulas glide on skin without a greasy residue.

**Silky Texture**
It improves product spreadability and gives creams and serums a luxurious, non-sticky feel after application.

**Barrier Support**
As an occlusive-emollient, it helps reduce transepidermal water loss and keeps moisture locked in when paired with humectants.

**Gentle on Skin**
Typically well tolerated and suitable for most skin types when used at cosmetic-grade concentrations.`,
    detailedInfo: `**C13-14 ISOPARAFFIN — DETAILED INFORMATION**

**SCIENTIFIC CLASSIFICATION**
C13-14 Isoparaffin is a mixture of branched-chain hydrocarbons (isoparaffins) in the C13–C14 carbon range, produced by petroleum refining and further processing for cosmetic purity.

**SKINCARE ROLE**
Used as an emollient, solvent, and texture enhancer in lotions, serums, sunscreens, and cleansers. It improves spreadability, reduces greasiness, and can help suspend or dissolve other cosmetic actives.

**BENEFITS**
Lightweight hydration feel, improved formula elegance, reduced TEWL when combined with moisturizers, non-comedogenic profile in typical use levels.

**USAGE**
Found at low to moderate percentages in leave-on products. Patch test if you have very reactive skin.`,
  },
  {
    id: 'grapeseed',
    name: 'Grapeseed',
    image: '/IMAGES/grapeseed.webp',
    description: `Grapeseed oil is pressed from Vitis vinifera seeds and is rich in linoleic acid, vitamin E, and polyphenols. It is a popular lightweight facial oil for oily and combination skin.

**Antioxidant Support**
Proanthocyanidins and vitamin E help defend skin against oxidative stress from UV and pollution.

**Non-Greasy Moisture**
High linoleic acid content absorbs quickly and supports a balanced, comfortable skin feel.

**Barrier & Tone**
Regular use can help maintain suppleness and support an even-looking complexion.`,
    detailedInfo: `**GRAPESEED (VITIS VINIFERA) — DETAILED INFORMATION**

**SCIENTIFIC NAME**
Vitis vinifera seed oil.

**COMPOSITION**
Rich in linoleic acid (omega-6), oleic acid, vitamin E (tocopherols), and polyphenols including proanthocyanidins.

**DERMATOLOGICAL USE**
Lightweight emollient for serums, facial oils, and moisturizers; often chosen for acne-prone skin due to low comedogenic rating.

**BENEFITS**
Antioxidant protection, moisture without heaviness, soothing support for stressed skin.`,
  },
  {
    id: 'rose-extract-ros',
    name: 'Rose Extract ROS',
    image: '/IMAGES/rose extract ROS.webp',
    description: `Rose extract (often from Rosa damascena or centifolia) is valued in skincare for its delicate fragrance, soothing polyphenols, and traditional use in toners and hydrating mists.

**Soothing & Calming**
Helps comfort sensitive or stressed skin and reduces the appearance of temporary redness.

**Hydration Boost**
Often used in aqueous extracts to support moisture retention in water-based formulas.

**Antioxidant Polyphenols**
Flavonoids and phenolic acids contribute to protection against environmental oxidative stress.`,
    detailedInfo: `**ROSE EXTRACT — DETAILED INFORMATION**

**BOTANICAL SOURCE**
Typically Rosa damascena or Rosa centifolia; ROS denotes rose extract used in cosmetic specifications.

**ACTIVE COMPOUNDS**
Phenylethyl alcohol, geraniol, citronellol (aromatics), plus flavonoids and tannins with antioxidant and soothing activity.

**APPLICATIONS**
Toners, mists, serums, and creams targeting sensitive, dry, or mature skin.

**TRADITION**
Used for centuries in Persian, Ayurvedic, and European apothecary traditions for skin softening and fragrance.`,
  },
  {
    id: 'almond-oil',
    name: 'Almond Oil',
    image: '/IMAGES/almond oil.webp',
    description: `Sweet almond oil (Prunus amygdalus dulcis) is a classic emollient rich in oleic acid, vitamin E, and phytosterols. It softens skin and supports the lipid barrier.

**Deep Softening**
Leaves skin feeling smooth and nourished without harsh surfactants.

**Vitamin E**
Natural tocopherols help protect against free radical damage.

**Gentle Cleansing & Massage**
Common in cleansing balms, body oils, and baby-care formulations.`,
    detailedInfo: `**ALMOND OIL (PRUNUS AMYGDALUS DULCIS) — DETAILED INFORMATION**

**COMPOSITION**
Oleic acid dominant, with linoleic acid, palmitic acid, squalene, and vitamin E.

**SKIN BENEFITS**
Emollient, barrier support, improved elasticity feel, suitable for dry and sensitive skin types.

**CAUTION**
Avoid if you have tree nut allergies; use bitter almond–free cosmetic-grade sweet almond oil only.`,
  },
  {
    id: 'centella-asiatica',
    name: 'Centella Asiatica',
    image: '/IMAGES/centella asiatica.webp',
    description: `Centella asiatica (Cica, Gotu Kola) is a staple in K-beauty for barrier repair, calming irritation, and supporting collagen-related pathways.

**Madecassoside & Asiaticoside**
Key triterpenes associated with wound-healing and anti-inflammatory research.

**Barrier Recovery**
Helps stressed, post-treatment, or sensitized skin regain comfort.

**Redness & Irritation**
Widely used to soothe acne, eczema-prone, and reactive skin.`,
    detailedInfo: `**CENTELLA ASIATICA — DETAILED INFORMATION**

**SCIENTIFIC NAME**
Centella asiatica (Apiaceae).

**KEY ACTIVES**
Madecassoside, asiaticoside, asiatic acid, madecassic acid.

**EVIDENCE**
Clinical and in vitro studies support wound healing, anti-inflammatory, and collagen-stimulating effects.

**PRODUCT TYPES**
Cica creams, ampoules, masks, and post-procedure recovery formulas.`,
  },
  {
    id: 'fenugreek-oil',
    name: 'Fenugreek Oil',
    image: '/IMAGES/fenugreek oil.webp',
    description: `Fenugreek seed oil (Trigonella foenum-graecum) is used in hair and skin care traditions for conditioning, soothing, and supporting a healthy scalp environment.

**Hair & Scalp**
Believed to nourish follicles and improve hair manageability in Ayurvedic practice.

**Anti-inflammatory Potential**
Diosgenin and other saponins may help calm irritated scalp or skin.

**Emollient Properties**
Softens and conditions dry areas when used in oil blends.`,
    detailedInfo: `**FENUGREEK OIL — DETAILED INFORMATION**

**SCIENTIFIC NAME**
Trigonella foenum-graecum seed oil.

**TRADITIONAL USE**
Ayurvedic and Middle Eastern hair oils; used for shine, scalp comfort, and conditioning.

**COMPOSITION**
Fatty acids, phospholipids, flavonoids, and saponins including diosgenin.

**APPLICATION**
Hair oils, scalp serums, and rich body treatments; patch test before widespread use.`,
  },
  {
    id: 'chamomile',
    name: 'Chamomile',
    image: '/IMAGES/Chamomile.webp',
    description: `Chamomile (Matricaria chamomilla / Chamaemelum nobile) is renowned for calming sensitive skin. Bisabolol and chamazulene are its signature soothing compounds.

**Anti-inflammatory**
Reduces visible redness and discomfort in reactive skin.

**Antioxidant**
Flavonoids help protect against environmental stress.

**Baby-Safe Tradition**
Long history in gentle cleansers and creams for delicate skin.`,
    detailedInfo: `**CHAMOMILE — DETAILED INFORMATION**

**SPECIES**
German chamomile (Matricaria recutita) and Roman chamomile (Chamaemelum nobile).

**ACTIVES**
Bisabolol, chamazulene, apigenin, and other flavonoids.

**USES**
Toners, creams, after-sun products, and treatments for sensitive or acne-prone skin.

**SAFETY**
Generally gentle; rare allergy in individuals sensitive to Asteraceae plants.`,
  },
  {
    id: 'mulberry',
    name: 'Mulberry',
    image: '/IMAGES/mulberry.webp',
    description: `Mulberry extract (Morus alba) is prized in Asian brightening traditions for inhibiting tyrosinase and promoting a more even skin tone.

**Brightening**
Mulberroside F and related compounds help fade the look of dark spots.

**Antioxidant**
Polyphenols defend against UV-related oxidative damage.

**Soothing**
Supports calm, balanced skin when used in balanced formulations.`,
    detailedInfo: `**MULBERRY (MORUS ALBA) — DETAILED INFORMATION**

**KEY COMPOUNDS**
Mulberroside F, resveratrol analogs, flavonoids, and arbutin-related phenolics.

**MECHANISM**
Tyrosinase inhibition and antioxidant activity support brightening and anti-aging goals.

**HISTORY**
Used in Chinese and Korean skincare for centuries for complexion clarity.`,
  },
  {
    id: 'ylang-ylang',
    name: 'Ylang Ylang',
    image: '/IMAGES/ylang ylang.webp',
    description: `Ylang ylang (Cananga odorata) flower extract and oil balance sebum, offer aromatherapeutic relaxation, and add antimicrobial support in natural formulations.

**Sebum Balance**
Helps oily skin types without over-stripping.

**Antimicrobial**
Traditional use against blemish-causing bacteria on skin.

**Aromatherapy**
Floral notes promote a spa-like sensorial experience.`,
    detailedInfo: `**YLANG YLANG — DETAILED INFORMATION**

**SCIENTIFIC NAME**
Cananga odorata.

**COMPOSITION**
Linalool, geranyl acetate, benzyl acetate, and other terpenes.

**SKINCARE**
Facial oils, perfumes, and balancing tonics for combination skin.

**NOTE**
Essential oil forms should be diluted; cosmetic extracts are pre-formulated for safe topical use.`,
  },
  {
    id: 'glycerin',
    name: 'Glycerin',
    image: '/IMAGES/Glycerin.webp',
    description: `Glycerin (glycerol) is one of the most effective humectants in skincare. It draws water into the stratum corneum and keeps skin plump and hydrated.

**Humectant Power**
Binds water from the environment and deeper skin layers to the surface.

**Barrier Support**
Improves skin softness and reduces flaking in dry conditions.

**Universal Ingredient**
Found in cleansers, serums, and creams across all skin types.`,
    detailedInfo: `**GLYCERIN — DETAILED INFORMATION**

**CHEMICAL NAME**
Glycerol (propane-1,2,3-triol).

**FUNCTION**
Humectant, solvent, and skin-conditioning agent at 2–15% in typical formulas.

**BENEFITS**
Immediate hydration boost, improved elasticity feel, compatibility with nearly all actives.

**TIP**
In very dry climates, pair with occlusives so glycerin-drawn moisture does not evaporate.`,
  },
]

export const additionalIngredientMeta: Record<string, AdditionalIngredientMeta> = {
  'c13-14-isoparaffin': {
    sci: 'C13-14 Isoparaffin', tag: 'hydrating', origin: 'Refined mineral source',
    snippet: 'Silky hydrocarbon emollient — spreads effortlessly and seals moisture without greasiness.',
    benefits: ['Lightweight feel', 'Moisture sealing', 'Silky texture', 'Formula stability'],
    bars: [['Spreadability', 95], ['Moisture seal', 85], ['Gentleness', 90], ['Non-greasy', 92]],
    stats: [['Dry-touch', 'Finish'], ['Emollient', 'Class'], ['Cosmetic', 'Grade']],
  },
  grapeseed: {
    sci: 'Vitis vinifera', tag: 'antioxidant', origin: 'Mediterranean / Wine regions',
    snippet: 'Linoleic-rich seed oil with vitamin E — lightweight moisture for combination skin.',
    benefits: ['Antioxidant', 'Lightweight oil', 'Barrier support', 'Non-comedogenic'],
    bars: [['Antioxidant', 82], ['Lightweight', 90], ['Moisture', 78], ['Soothing', 72]],
    stats: [['Linoleic', 'Dominant FA'], ['Vit E', 'Present'], ['Low', 'Comedogenic']],
  },
  'rose-extract-ros': {
    sci: 'Rosa damascena', tag: 'soothing', origin: 'Bulgaria / Turkey / India',
    snippet: 'Classic floral extract that calms sensitivity and elevates hydration in mists and serums.',
    benefits: ['Soothing', 'Hydrating', 'Antioxidant', 'Sensory calm'],
    bars: [['Soothing', 88], ['Hydration', 80], ['Antioxidant', 75], ['Comfort', 85]],
    stats: [['Polyphenols', 'Active'], ['Traditional', 'Distillate'], ['Sensitive', 'Skin ally']],
  },
  'almond-oil': {
    sci: 'Prunus amygdalus dulcis', tag: 'moisturizing', origin: 'Mediterranean / California',
    snippet: 'Vitamin E–rich emollient that softens and protects the skin lipid barrier.',
    benefits: ['Softening', 'Vitamin E', 'Barrier care', 'Gentle'],
    bars: [['Moisture', 88], ['Softening', 90], ['Antioxidant', 72], ['Gentleness', 92]],
    stats: [['Oleic acid', 'Rich'], ['Tocopherols', 'Natural'], ['Classic', 'Emollient']],
  },
  'centella-asiatica': {
    sci: 'Centella asiatica', tag: 'soothing', origin: 'Asia / Madagascar',
    snippet: 'Cica hero — madecassoside-driven repair for barrier damage and reactive skin.',
    benefits: ['Barrier repair', 'Anti-inflammatory', 'Collagen support', 'Calming'],
    bars: [['Soothing', 94], ['Barrier', 92], ['Healing', 88], ['Redness', 85]],
    stats: [['Cica', 'K-beauty staple'], ['Triterpenes', 'Key actives'], ['Post-care', 'Favorite']],
  },
  'fenugreek-oil': {
    sci: 'Trigonella foenum-graecum', tag: 'strengthening', origin: 'India / Mediterranean',
    snippet: 'Ayurvedic seed oil for scalp conditioning, hair strength, and dry-skin comfort.',
    benefits: ['Hair conditioning', 'Scalp comfort', 'Emollient', 'Traditional tonic'],
    bars: [['Hair care', 85], ['Scalp', 80], ['Nourishment', 82], ['Softening', 78]],
    stats: [['Ayurvedic', 'Heritage'], ['Saponins', 'Present'], ['Hair + skin', 'Use']],
  },
  chamomile: {
    sci: 'Matricaria chamomilla', tag: 'soothing', origin: 'Europe / Western Asia',
    snippet: 'Bisabolol-rich botanical that tames redness and comforts the most sensitive skin.',
    benefits: ['Anti-inflammatory', 'Soothing', 'Antioxidant', 'Gentle'],
    bars: [['Soothing', 92], ['Redness', 85], ['Antioxidant', 78], ['Gentleness', 96]],
    stats: [['Bisabolol', 'Signature'], ['Baby care', 'Safe choice'], ['Asteraceae', 'Family']],
  },
  mulberry: {
    sci: 'Morus alba', tag: 'brightening', origin: 'China / Korea',
    snippet: 'Mulberroside-powered brightener — targets dark spots and uneven tone.',
    benefits: ['Brightening', 'Tyrosinase inhibit', 'Antioxidant', 'Even tone'],
    bars: [['Brightening', 90], ['Spot care', 85], ['Antioxidant', 80], ['Even tone', 82]],
    stats: [['Mulberroside F', 'Active'], ['K-beauty', 'Brightener'], ['Traditional', 'Use']],
  },
  'ylang-ylang': {
    sci: 'Cananga odorata', tag: 'cleansing', origin: 'Southeast Asia / Pacific',
    snippet: 'Floral balancer — helps regulate sebum while adding natural antimicrobial support.',
    benefits: ['Sebum balance', 'Antimicrobial', 'Aromatherapy', 'Sensory'],
    bars: [['Sebum balance', 82], ['Antimicrobial', 78], ['Calming', 80], ['Texture', 75]],
    stats: [['Linalool', 'Key terpene'], ['Aromatherapeutic', 'Profile'], ['Oily skin', 'Ally']],
  },
  glycerin: {
    sci: 'Glycerol', tag: 'hydrating', origin: 'Plant / synthetic cosmetic grade',
    snippet: 'Gold-standard humectant — pulls water into skin for instant plump hydration.',
    benefits: ['Humectant', 'Hydration', 'Barrier comfort', 'Universal'],
    bars: [['Hydration', 98], ['Humectant', 99], ['Compatibility', 97], ['Gentleness', 95]],
    stats: [['2–15%', 'Typical range'], ['TEWL', 'Reduction'], ['Every formula', 'Staple']],
  },
}
