/**
 * Product-page ingredient label → production IMAGES path (exact webp filenames).
 * Keep in sync with `ingredients` in Ingredients.tsx and files on the server.
 */
export const INGREDIENT_IMAGE_MAP: Record<string, string> = {
  'blue tea': '/IMAGES/blue pea.webp',
  aprajita: '/IMAGES/blue pea.webp',
  'blue pea': '/IMAGES/blue pea.webp',
  charcoal: '/IMAGES/charcoal.webp',
  'activated charcoal': '/IMAGES/charcoal.webp',
  yuja: '/IMAGES/yuja.webp',
  citron: '/IMAGES/yuja.webp',
  papaya: '/IMAGES/papaya.webp',
  'shea butter': '/IMAGES/shea butter.webp',
  'coconut oil': '/IMAGES/coconut-oil.webp',
  coconut: '/IMAGES/coconut-oil.webp',
  mulberry: '/IMAGES/mulberry.webp',
  grapeseed: '/IMAGES/grapeseed.webp',
  'grape seed': '/IMAGES/grapeseed.webp',
  'aha & bha': '/IMAGES/AHA & BHA.webp',
  aha: '/IMAGES/AHA & BHA.webp',
  bha: '/IMAGES/AHA & BHA.webp',
  'alpha hydroxy acid': '/IMAGES/AHA & BHA.webp',
  'beta hydroxy acid': '/IMAGES/AHA & BHA.webp',
  amla: '/IMAGES/Amla.webp',
  'indian gooseberry': '/IMAGES/Amla.webp',
  'argan oil': '/IMAGES/Argan Oils.webp',
  'argan oils': '/IMAGES/Argan Oils.webp',
  biotin: '/IMAGES/Biotin.webp',
  blueberry: '/IMAGES/Blueberry.webp',
  brahmi: '/IMAGES/Brahmi.webp',
  flaxseed: '/IMAGES/Flaxseed.webp',
  'flax seed': '/IMAGES/Flaxseed.webp',
  'green tea': '/IMAGES/Green Tea.webp',
  'juniper berry': '/IMAGES/Juniper Berry.webp',
  'kakadu plum': '/IMAGES/Kakadu Plum.webp',
  'kale leaf': '/IMAGES/Kale Leaf.webp',
  kale: '/IMAGES/Kale Leaf.webp',
  'kaolin clay': '/IMAGES/Kaolin Clay.webp',
  kaolin: '/IMAGES/Kaolin Clay.webp',
  mustard: '/IMAGES/Mustard.webp',
  'olive squalane': '/IMAGES/Olive Squalane.webp',
  squalane: '/IMAGES/Olive Squalane.webp',
  'saw palmetto': '/IMAGES/saw palmetto.webp',
  palmetto: '/IMAGES/saw palmetto.webp',
  quinoa: '/IMAGES/Quinoa.webp',
  'rice powder': '/IMAGES/Rice Powder.webp',
  saffron: '/IMAGES/Saffron.webp',
  sesame: '/IMAGES/Sesame.webp',
  'sesame seed': '/IMAGES/Sesame.webp',
  'tapioca starch': '/IMAGES/Tapioca Starch.webp',
  tapioca: '/IMAGES/Tapioca Starch.webp',
  'tea tree': '/IMAGES/Tea Tree.webp',
  'tea tree oil': '/IMAGES/Tea Tree.webp',
  'vitamin c & b5': '/IMAGES/Vitamin C & B5.webp',
  'vitamin c': '/IMAGES/Vitamin C & B5.webp',
  'vitamin b5': '/IMAGES/Vitamin C & B5.webp',
  'pantothenic acid': '/IMAGES/Vitamin C & B5.webp',
  'white tea': '/IMAGES/white tea.webp',
  'yellow dragon': '/IMAGES/Yellow Dragon.webp',
  'c13-14 isoparaffin': '/IMAGES/C13-14 Isoparaffin.webp',
  isoparaffin: '/IMAGES/C13-14 Isoparaffin.webp',
  'rose extract': '/IMAGES/rose extract ROS.webp',
  'rose extract ros': '/IMAGES/rose extract ROS.webp',
  'almond oil': '/IMAGES/almond oil.webp',
  almond: '/IMAGES/almond oil.webp',
  'centella asiatica': '/IMAGES/centella asiatica.webp',
  centella: '/IMAGES/centella asiatica.webp',
  cica: '/IMAGES/centella asiatica.webp',
  'fenugreek oil': '/IMAGES/fenugreek oil.webp',
  fenugreek: '/IMAGES/fenugreek oil.webp',
  chamomile: '/IMAGES/Chamomile.webp',
  'ylang ylang': '/IMAGES/ylang ylang.webp',
  ylang: '/IMAGES/ylang ylang.webp',
  glycerin: '/IMAGES/Glycerin.webp',
  glycerol: '/IMAGES/Glycerin.webp',
}

const normalizeIngredientName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // drop "(Blue Tea)", "(Vitis Vinifera Seed Extract)" etc.
    .replace(/\s+/g, ' ')
    .trim()

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Longest keys first so "tea tree oil" wins over "tea tree", "argan oils" over "argan oil".
const KEY_MATCHERS = Object.keys(INGREDIENT_IMAGE_MAP)
  .sort((a, b) => b.length - a.length)
  .map((key) => ({ key, re: new RegExp(`(^|[^a-z0-9])${escapeRegExp(key)}(?=[^a-z0-9]|$)`) }))

const UPPER_TOKENS = new Set(['aha', 'bha', 'b5', 'c13-14'])
const titleCase = (s: string) =>
  s.replace(/[^\s&]+/g, (w) => (UPPER_TOKENS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))

// One display name per image: the first key listed for it above ("Blue Tea", "Saw Palmetto", "AHA & BHA").
const IMAGE_LABELS: Record<string, string> = {}
for (const [key, image] of Object.entries(INGREDIENT_IMAGE_MAP)) {
  if (!IMAGE_LABELS[image]) IMAGE_LABELS[image] = titleCase(key)
}

/** Hard-coded ingredients named in one CSV entry, as whole words, in the order they appear. */
function findHardcodedIngredients(entry: string): { key: string; image: string; index: number }[] {
  let s = normalizeIngredientName(entry || '')
  const found: { key: string; image: string; index: number }[] = []
  for (const { key, re } of KEY_MATCHERS) {
    let m: RegExpExecArray | null
    while ((m = re.exec(s))) {
      const start = m.index + m[1].length
      found.push({ key, image: INGREDIENT_IMAGE_MAP[key], index: start })
      s = s.slice(0, start) + '|'.repeat(key.length) + s.slice(start + key.length) // so shorter keys can't re-match it
    }
  }
  return found.sort((a, b) => a.index - b.index)
}

/**
 * Image path for an ingredient name from the product CSV, or null when it names none of the
 * hard-coded ingredients above. Only whole words match, so generic names like "Oil", "Tea" or
 * "Vitamin E" never borrow another ingredient's picture.
 */
export function getIngredientImagePath(ingredientName: string): string | null {
  return findHardcodedIngredients(ingredientName)[0]?.image ?? null
}

const DESCRIPTOR_WORDS = new Set([
  'extract', 'extracts', 'oil', 'oils', 'fruit', 'leaf', 'leaves', 'seed', 'seeds', 'powder', 'butter',
  'flower', 'root', 'hair', 'essential', 'berry', 'juice', 'starch', 'natural', 'pure', 'organic',
])

export type IngredientTile = { name: string; benefit: string; image: string }

/**
 * Split an "Ingredient Benefits" cell into its statements. The CSV writes them as
 * "Name: benefit; Name: benefit" or "Name – benefit. Name – benefit", or as one plain sentence.
 */
export function splitBenefitSegments(value: unknown): string[] {
  if (typeof value !== 'string') return []
  return value
    .split(/;|\n|\.+(?=\s*[A-Z])/)
    .map((s) => s.replace(/^[\s.]+|[\s.]+$/g, ''))
    .filter(Boolean)
}

/** "Name: text" / "Name – text" → the benefit text for the hard-coded ingredient `image`, if named. */
function benefitFor(image: string, segments: string[]): string {
  for (const seg of segments) {
    const m = seg.match(/^(.{1,60}?)\s*(?::|\s[–—-])\s*(.+)$/)
    if (!m || !findHardcodedIngredients(m[1]).some((f) => f.image === image)) continue
    // A glued "…revitalizes:Aprajita (Blue Tea): …" or a run-on "…nourishes scalp Almond oil, argan oil
    // strengthens roots" starts the next ingredient's text; cut the benefit off there.
    let text = m[2].split(/:(?=\s*[A-Z])/)[0]
    const lower = text.toLowerCase()
    let cut = text.length
    for (const { key, re } of KEY_MATCHERS) {
      if (INGREDIENT_IMAGE_MAP[key] === image) continue
      const hit = re.exec(lower)
      if (hit) cut = Math.min(cut, hit.index + hit[1].length)
    }
    text = text.slice(0, cut).replace(/[\s,;&–—-]+$/, '').trim()
    if (text) return text
  }
  return ''
}

/**
 * Product-page ingredient tiles: only the hard-coded ingredients named in the CSV list, each once.
 * A clean single entry keeps its CSV wording ("Papaya Extract", "Aprajita (Blue Tea)"); entries that
 * glue several ingredients or INCI text together ("Saw Palmetto & Aprajita (Blue Tea)") become one
 * tile per hard-coded ingredient under its standard name. Everything else is left for the text list.
 * Each tile's benefit is the statement that names that ingredient in the benefits cell.
 */
export function getIngredientTiles(names: string[], benefitsText = ''): IngredientTile[] {
  const segments = splitBenefitSegments(benefitsText)
  const tiles: IngredientTile[] = []
  const seen = new Set<string>()
  names.forEach((entry) => {
    const matches = findHardcodedIngredients(entry)
    if (matches.length === 0) return
    // Keep the CSV wording only when the extra words are plain descriptors ("Papaya Extract",
    // "Yellow Dragon Fruit"); typos and glued text ("Tapioca StarchAprajita") get the standard name.
    const extraWords = normalizeIngredientName(entry).replace(matches[0].key, ' ').split(/\s+/).filter(Boolean)
    const isSingleClean = matches.length === 1 && extraWords.every((w) => DESCRIPTOR_WORDS.has(w))
    for (const match of matches) {
      if (seen.has(match.image)) continue
      seen.add(match.image)
      let name = IMAGE_LABELS[match.image]
      if (isSingleClean) {
        name = entry.replace(/\s*\([^)]{21,}\)/g, '').replace(/[.\s]+$/, '').trim() // drop long INCI notes
        if (name === name.toLowerCase()) name = titleCase(name)
      }
      tiles.push({ name, benefit: benefitFor(match.image, segments), image: match.image })
    }
  })
  return tiles
}

/** Split a CSV "a, b, c" cell into trimmed, non-empty entries. */
export function splitIngredientList(value: unknown): string[] {
  if (typeof value !== 'string') return []
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}
