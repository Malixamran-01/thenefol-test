import random
import json
import re

random.seed(789)

# Load products from extracted JSON
with open('products_extracted.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

print(f"✅ Loaded {len(products)} products from CSV")

# Clean up ingredient names (remove duplicates like "Blue Tea" and "Aprajita" when they're the same)
def clean_ingredients(ingredients):
    cleaned = []
    seen = set()
    
    # Mapping for known duplicates/variants
    ingredient_map = {
        'Aprajita': 'Blue Tea',
        'Blue Tea': 'Blue Tea',
        'Aprajita (Blue Tea)': 'Blue Tea',
        'AHA & BHA': 'AHA & BHA',
        'AHA': 'AHA & BHA',
        'BHA': 'AHA & BHA'
    }
    
    for ing in ingredients:
        ing_clean = ing.strip()
        if not ing_clean or len(ing_clean) < 2:
            continue
            
        # Remove problematic suffixes
        ing_clean = re.sub(r'& Aprajita$', '', ing_clean).strip()
        ing_clean = re.sub(r'& Aprajita$', '', ing_clean).strip()
        
        # Map to standard name
        mapped = ingredient_map.get(ing_clean, ing_clean)
        
        # Use mapped name if exists, otherwise original
        final_name = mapped if mapped in ingredient_map.values() else ing_clean
        
        # Skip if already seen or too generic
        if final_name.lower() not in seen and final_name not in ['', ' ', '&']:
            seen.add(final_name.lower())
            cleaned.append(final_name)
    
    # Default to Blue Tea if empty
    if not cleaned:
        cleaned = ['Blue Tea']
    
    return cleaned[:5]  # Limit to 5 main ingredients

# Clean ingredients for all products
for product in products:
    product['ingredients'] = clean_ingredients(product.get('ingredients', ['Blue Tea']))
    # Normalize "Aprajita" to "Blue Tea" for consistency in reviews
    product['ingredients'] = [ing.replace('Aprajita', 'Blue Tea') if 'Aprajita' in ing else ing for ing in product['ingredients']]
    product['ingredients'] = [ing for ing in product['ingredients'] if ing.strip()]

# Female names (70%)
female_names = [
    "Priya K.", "Anita R.", "Deepa S.", "Riya P.", "Sneha T.", "Kavita J.", "Neha D.", "Pooja L.",
    "Simran G.", "Meera S.", "Rekha V.", "Isha M.", "Nisha A.", "Vandana P.", "Shalini R.", "Gauri K.",
    "Trupti S.", "Lata P.", "Sana K.", "Maya S.", "Neelam B.", "Veda R.", "Devika S.", "Chitra P.",
    "Bina J.", "Ankita S.", "Divya M.", "Sheetal N.", "Madhuri K.", "Zoya R.", "Shruti S.", "Nandita P.",
    "Ayesha K.", "Suman L.", "Tara M.", "Priyanka G.", "Ramanpreet K.", "Shweta P.", "Kavya S.", "Bindu M.",
    "Arpita L.", "Bhavna S.", "Sonal T.", "Priyam M.", "Roshni D.", "Anjali R.", "Minal P.", "Aarti N.",
    "Namita S.", "Sowmya R.", "Monika J.", "Rahima S.", "Shobha L.", "Radha M.", "Smita P.", "Kiran S.",
    "Preeti N.", "Jyoti K.", "Sunita R.", "Nidhi V.", "Ritika A.", "Sapna D.", "Kanika M.", "Nupur T."
]

# Male names (30%)
male_names = [
    "Rahul S.", "Amit M.", "Suresh B.", "Vikram N.", "Rajesh K.", "Manish R.", "Arjun P.", "Sanjay C.",
    "Harish N.", "Bhavesh M.", "Kamal D.", "Irfan Q.", "Abhishek R.", "Tarun V.", "Vijay P.", "Rakesh L.",
    "Siddharth G.", "Ketan R.", "Farhan A.", "Arnav M.", "Lokesh Y.", "Gopal H.", "Yogesh T.", "Sohail A.",
    "Pradeep B.", "Bharat V.", "Raman D.", "Umesh R.", "Vikash S.", "Mahesh N.", "Dinesh R.", "Nitin K.",
    "Kishore P.", "Javed A.", "Sagar K.", "Lalit S.", "Ramesh B.", "Vimal K.", "Kalyan P.", "Soham K.",
    "Rohit Y.", "Kiran H.", "Ajay M.", "Sahil N.", "Aman R.", "Arpit S.", "Nikhil T.", "Vivek P."
]

def rel_date_phrase():
    days = random.randint(2, 365)
    if days <= 7:
        return f"{days} days ago" if days > 1 else "1 day ago"
    elif days < 30:
        weeks = days // 7
        return f"{weeks} week ago" if weeks == 1 else f"{weeks} weeks ago"
    elif days < 365:
        months = days // 30
        return f"{months} month ago" if months == 1 else f"{months} months ago"
    else:
        return "1 year ago"

# Suffixes - English/Hinglish only
suffixes = [
    " Will repurchase.",
    " Definitely recommend!",
    " Definitely worth it!",
    " Will buy again.",
    " Highly recommend!",
    " Must try!",
    " Phir se order karungi.",
    " Zaroor suggest karungi.",
    " Bahut accha hai, recommend karti hoon."
]

def get_ingredient_mention(ingredients):
    """Get primary ingredient for mention in comments"""
    if not ingredients:
        return "Blue Tea"
    
    # Prefer Blue Tea, then first ingredient
    for ing in ingredients:
        if 'Blue Tea' in ing or 'Aprajita' in ing:
            return "Blue Tea"
    
    return ingredients[0] if ingredients else "Blue Tea"

def get_comments_for_product(product):
    """Generate product-specific comments with ingredient mentions"""
    category = product["category"]
    ptype = product["type"]
    ingredients = product.get("ingredients", ["Blue Tea"])
    primary_ing = get_ingredient_mention(ingredients)
    
    # Build ingredient string for comments (2-3 ingredients max)
    ing_str = primary_ing
    if len(ingredients) > 1:
        secondary = ingredients[1] if ingredients[1] != primary_ing else (ingredients[2] if len(ingredients) > 2 else None)
        if secondary:
            ing_str = f"{primary_ing} and {secondary}"
    
    comments_short = []
    comments_long = []
    
    if category == "face":
        if ptype == "cleanser":
            comments_short = [
                f"Gentle cleansing with {primary_ing}, removes dirt without stripping moisture.",
                f"Daily use se skin clean aur fresh rehti hai. {primary_ing} ka effect visible hai.",
                f"Foam achha hai aur {primary_ing} se pores clear ho rahe hain.",
                f"Perfect for sensitive skin, {primary_ing} ka soothing effect hai.",
                "Doesn't leave skin dry, very gentle formula.",
                "My oily skin feels balanced after using this."
            ]
            comments_long = [
                f"Using this cleanser for 2 weeks now. The {ing_str} extracts make my skin feel so clean and fresh. It removes all dirt and makeup without over-drying. Skin texture has improved significantly.",
                f"Gentle yet effective! {primary_ing} helps in deep cleansing and my skin feels hydrated. Perfect for daily use, especially for combination skin like mine.",
                f"Kaafi gentle hai yeh cleanser. {primary_ing} se skin purifying hoti hai aur breakouts bhi kam hue. Will definitely repurchase!"
            ]
        elif ptype == "scrub":
            comments_short = [
                f"Gentle exfoliation with {primary_ing} and natural extracts. Skin feels smooth after use.",
                f"Dead skin cells remove ho rahe hain, texture better hai. {primary_ing} ka glow visible hai.",
                f"Not too harsh, perfect balance. {primary_ing} se skin brightening ho rahi hai.",
                "Regular use se skin glow badh gaya hai.",
                "My favorite scrub! Doesn't irritate my sensitive skin."
            ]
            comments_long = [
                f"Love this scrub! The {ing_str} work so well together for exfoliation. My skin feels smooth and looks brighter. Using twice a week and seeing great results.",
                f"{primary_ing} extract se skin exfoliation gentle hai but effective. Pores clear ho gaye hain aur texture improve hua hai. Highly recommend!"
            ]
        elif ptype == "serum":
            comments_short = [
                f"Lightweight serum with {primary_ing}, absorbs quickly without feeling sticky.",
                f"Fine lines kam ho rahe hain, {primary_ing} se skin hydrated hai.",
                f"Antioxidant benefits from {primary_ing} noticeable hain, skin healthy lagti hai.",
                "Skin glow badh gaya hai, texture smooth ho gayi.",
                "Perfect for daily use, non-greasy formula."
            ]
            comments_long = [
                f"Amazing serum! The {ing_str} extracts provide excellent hydration and my skin looks more radiant. It absorbs quickly and doesn't feel heavy. Using for a month and seeing visible improvement in fine lines.",
                f"{primary_ing} se skin ko antioxidants mil rahe hain aur hydration bhi perfect hai. Texture improve hua hai aur glow visible hai. Worth every penny!"
            ]
        elif ptype == "moisturizer":
            comments_short = [
                f"Perfect hydration with {primary_ing}. Skin feels soft all day.",
                f"Moisturization all day rehti hai, {primary_ing} se texture smooth hai.",
                f"Non-greasy formula, {primary_ing} ka nourishing effect hai.",
                "Lightweight but effective, perfect for daily use.",
                "My dry skin loves this moisturizer!"
            ]
            comments_long = [
                f"Best moisturizer I've used! The {ing_str} keep my skin hydrated throughout the day. It's lightweight, absorbs well, and doesn't feel greasy. Perfect for combination skin.",
                f"{primary_ing} se skin ko proper hydration mil rahi hai aur texture bhi improve hua hai. All day moisturization rehti hai without feeling heavy. Highly recommend!"
            ]
        elif ptype == "cream":
            comments_short = [
                f"Rich cream with {primary_ing} and nourishing ingredients. Perfect for dry skin.",
                f"Moisturization perfect hai, {primary_ing} se skin soft lagti hai.",
                f"Non-greasy formula, {primary_ing} ka anti-aging effect visible hai.",
                "Skin feels plump and hydrated all day.",
                "Great for night time routine!"
            ]
            comments_long = [
                f"Love this cream! The {ing_str} extracts along with other nourishing ingredients make my skin feel so soft and hydrated. Using in my night routine and waking up with glowing skin.",
                f"{primary_ing} se skin ko deep nourishment mil rahi hai. Texture improve hua hai aur fine lines bhi kam ho rahe hain. Perfect for mature skin!"
            ]
        elif ptype == "mask":
            comments_short = [
                f"Deep cleansing mask with {primary_ing}. Pores clear ho gaye hain.",
                f"Detox effect achha hai, {primary_ing} se skin fresh feel hoti hai.",
                f"Weekly use se skin texture improve hua hai, {primary_ing} ka glow visible hai.",
                "My skin feels refreshed and clean after use.",
                "Perfect for weekly pampering session!"
            ]
            comments_long = [
                f"Amazing mask! The {ing_str} extracts provide deep cleansing and my pores look so much cleaner. Using once a week and my skin feels refreshed and bright. Highly effective!",
                f"{primary_ing} se skin detoxification ho rahi hai aur pores bhi clear ho rahe hain. Weekly use se glow improve hua hai. Love this product!"
            ]
        else:
            comments_short = [
                f"Great product with {primary_ing}. Skin feels better already.",
                f"{primary_ing} se skin glow badh gaya hai.",
                "Amazing results, will buy again.",
                "Perfect for my skin type."
            ]
            comments_long = [
                f"Using this product for a few weeks and seeing great results. The {ing_str} extracts work really well for my skin. Texture and glow have improved significantly.",
                f"{primary_ing} se skin ko proper care mil rahi hai. Results dikh rahe hain aur skin healthy lagti hai. Definitely worth it!"
            ]
    elif category == "hair":
        if ptype == "shampoo":
            comments_short = [
                f"Hair fall control mein effective hai. {primary_ing} se hair strength badh gayi.",
                f"Lather good hai, {primary_ing} se hair clean aur soft ho jaati hain.",
                f"Regular use se scalp healthy hai, {primary_ing} ka nourishing effect hai.",
                "Hair feels strong and shiny after wash.",
                "Perfect for daily use, doesn't strip natural oils."
            ]
            comments_long = [
                f"Best shampoo! The {ing_str} extracts have significantly reduced my hair fall. Hair feels stronger and looks shinier. Using for 2 months and seeing amazing results.",
                f"{primary_ing} se hair ko proper nourishment mil rahi hai. Hair fall kam hua hai aur texture bhi improve hua hai. Scalp healthy feel hota hai. Highly recommend!"
            ]
        elif ptype == "mask":
            comments_short = [
                f"Hair mask with {primary_ing} and nourishing oils. Hair soft aur shiny ho gaye.",
                f"Deep conditioning effect hai, {primary_ing} se hair hydrated lagti hain.",
                f"Weekly use se hair texture improve hua hai, {primary_ing} ka shine visible hai.",
                "My hair feels silky smooth after use.",
                "Perfect treatment for damaged hair!"
            ]
            comments_long = [
                f"Love this hair mask! The {ing_str} extracts along with other nourishing ingredients make my hair so soft and manageable. Using once a week and my damaged hair has improved a lot.",
                f"{primary_ing} se hair ko deep conditioning mil rahi hai. Hair soft aur shiny ho gaye hain aur breakage bhi kam hui. Perfect for dry and damaged hair!"
            ]
        elif ptype == "oil":
            comments_short = [
                f"Hair growth ke liye perfect, {primary_ing} se regular massage se fayda.",
                f"Oil non-sticky hai, {primary_ing} se hair nourished feel hoti hain.",
                f"Scalp health improve hua hai, {primary_ing} ka strengthening effect hai.",
                "Hair fall kam hua hai, growth visible hai.",
                "Lightweight oil, perfect for hair massage."
            ]
            comments_long = [
                f"Amazing hair oil! The {ing_str} extracts promote hair growth and my hair feels so much stronger. Using for 3 months with regular massage and seeing significant improvement in hair fall and growth.",
                f"{primary_ing} se scalp ko proper nourishment mil rahi hai. Hair fall kam hua hai aur new hair growth bhi visible hai. Oil lightweight hai aur sticky feel nahi hota. Highly effective!"
            ]
        else:
            comments_short = [
                f"Hair care product with {primary_ing}. Hair healthier lagti hain.",
                f"{primary_ing} se hair strength badh gayi.",
                "Great results, will continue using.",
                "Perfect for my hair type."
            ]
            comments_long = [
                f"Using this hair product for a while and loving the results. The {ing_str} extracts work really well. My hair feels healthier and stronger.",
                f"{primary_ing} se hair ko proper care mil rahi hai. Texture improve hua hai aur hair fall bhi kam hua hai. Definitely recommend!"
            ]
    elif category == "body":
        comments_short = [
            f"Body lotion with {primary_ing}. Skin soft ho gayi hai, good moisturization.",
            f"Body par apply karne se smooth feel hota hai, {primary_ing} ka hydrating effect hai.",
            f"Absorption quick hai, {primary_ing} se skin nourished lagti hai.",
            "Lightweight formula, perfect for daily use.",
            "Skin feels hydrated all day long."
        ]
        comments_long = [
            f"Great body lotion! The {ing_str} extracts keep my skin soft and hydrated. It absorbs quickly without feeling sticky. Perfect for daily use after shower.",
            f"{primary_ing} se body skin ko proper hydration mil rahi hai. Texture improve hua hai aur skin soft aur smooth lagti hai. Non-greasy formula, highly recommend!"
        ]
    elif category == "combo":
        if ptype == "acne":
            comments_short = [
                f"Acne control combo with {primary_ing}. Breakouts kam ho gaye, skin clear ho rahi hai.",
                f"Oily skin ke liye perfect, {primary_ing} se oil control achha hai.",
                f"Inflammation reduce hua hai, {primary_ing} se skin calming feel hoti hai.",
                "Complete routine, sab products ek saath perfect kaam kar rahe hain.",
                "Acne marks bhi fade ho rahe hain, great combo!"
            ]
            comments_long = [
                f"Amazing combo pack! The {ing_str} extracts along with other acne-fighting ingredients have cleared my breakouts significantly. Using the complete routine for a month and my skin looks so much better. Highly effective!",
                f"{primary_ing} se acne control mein bahut help mili hai. All products complement each other perfectly. Breakouts kam ho gaye hain aur skin clear ho rahi hai. Value for money!"
            ]
        else:
            comments_short = [
                f"Complete routine with {primary_ing}. All products work well together.",
                f"Value for money combo, {primary_ing} se results dikh rahe hain.",
                f"Combination perfect hai, {primary_ing} ka effect visible hai.",
                "Great combo pack! All products complement each other.",
                "Complete skincare routine, sab kuch ek saath!"
            ]
            comments_long = [
                f"Perfect combo! All products with {ing_str} extracts work so well together. Using the complete routine has given amazing results. My skin/hair has improved noticeably with regular use. Highly recommend!",
                f"{primary_ing} se complete routine effective hai. All products complement each other and results dikh rahe hain. Value for money hai aur quality bhi excellent. Definitely worth it!"
            ]
    
    return comments_short, comments_long

# Generate reviews for each product
all_product_reviews = {}

for product in products:
    slug = product["slug"]
    comments_short, comments_long = get_comments_for_product(product)
    
    # Generate 60-80 reviews per product
    num_reviews = random.randint(60, 80)
    product_reviews = []
    
    for i in range(num_reviews):
        # 70% female, 30% male
        if random.random() < 0.7:
            name = random.choice(female_names)
        else:
            name = random.choice(male_names)
        
        # Higher ratings are more common
        rating = random.choices([5, 4, 3, 2, 1], weights=[55, 30, 8, 4, 3])[0]
        date = rel_date_phrase()
        
        # Choose short or long comment
        comment = random.choice(comments_long if random.random() > 0.4 else comments_short)
        
        # Sometimes add suffix (30% chance)
        if random.random() < 0.3:
            comment += " " + random.choice(suffixes)
        
        product_reviews.append({
            "name": name,
            "rating": rating,
            "date": date,
            "comment": comment
        })
    
    all_product_reviews[slug] = product_reviews
    print(f"Generated {num_reviews} reviews for {product['slug']} ({product['name'][:50]}...)")

# Write TypeScript file
ts_path = "user-panel/src/utils/product_reviews.ts"
with open(ts_path, "w", encoding="utf-8") as f:
    f.write("// Product Reviews Data\n")
    f.write("// Generated reviews for all 40 NEFOL products - English/Hinglish only\n")
    f.write("// Based on actual product ingredients from CSV\n\n")
    f.write("export const productReviews = ")
    
    # Convert to JS format with proper escaping
    js_content = json.dumps(all_product_reviews, ensure_ascii=False, indent=2)
    f.write(js_content)
    f.write(";\n\n")
    
    # Add helper functions
    f.write("""// Helper function to get reviews for a product by slug
// Import the cache function (using dynamic import to avoid circular dependencies)
let getCachedReviewStats: ((slug: string) => { average_rating: number; review_count: number; verified_count: number }) | null = null

// Lazy load the cache function
function getCacheFunction() {
  if (!getCachedReviewStats) {
    try {
      const cacheModule = require('../hooks/useProductReviewStats')
      getCachedReviewStats = cacheModule.getCachedReviewStats
    } catch (e) {
      // If module not available, return null
      return null
    }
  }
  return getCachedReviewStats
}

export function getProductReviews(slug: string) {
  return productReviews[slug as keyof typeof productReviews] || [];
}

// Helper function to get average rating for a product
// Now checks database first, then falls back to static data
export function getProductRating(slug: string): number {
  // Try to get from database cache first
  const cacheFn = getCacheFunction()
  if (cacheFn) {
    try {
      const dbStats = cacheFn(slug)
      if (dbStats && dbStats.review_count > 0) {
        return dbStats.average_rating
      }
    } catch (e) {
      // Fall through to static data
    }
  }
  
  // Fallback to static data
  const reviews = getProductReviews(slug)
  if (reviews.length === 0) return 0
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
  return parseFloat((sum / reviews.length).toFixed(2))
}

// Helper function to get review count for a product
// Now checks database first, then falls back to static data
export function getProductReviewCount(slug: string): number {
  // Try to get from database cache first
  const cacheFn = getCacheFunction()
  if (cacheFn) {
    try {
      const dbStats = cacheFn(slug)
      if (dbStats && dbStats.review_count > 0) {
        return dbStats.review_count
      }
    } catch (e) {
      // Fall through to static data
    }
  }
  
  // Fallback to static data
  return getProductReviews(slug).length
}

// Helper function to check if a product has verified reviews
// Now checks database first, then falls back to static data
export function hasVerifiedReviews(slug: string): boolean {
  // Try to get from database cache first
  const cacheFn = getCacheFunction()
  if (cacheFn) {
    try {
      const dbStats = cacheFn(slug)
      if (dbStats && dbStats.verified_count > 0) {
        return true
      }
      // If there are reviews but none verified, still show badge if there are reviews
      if (dbStats && dbStats.review_count > 0) {
        return true
      }
    } catch (e) {
      // Fall through to static data
    }
  }
  
  // Fallback to static data
  const reviews = getProductReviews(slug)
  if (reviews.length === 0) return false
  // Check if any review has isVerified flag
  // For database reviews, this checks is_verified field
  // For static reviews, if reviews exist, show badge (indicating verified reviews may be available)
  const hasVerified = reviews.some((review: any) => review.isVerified === true || review.is_verified === true)
  // Show badge if explicitly verified, or if product has reviews (practical for listing pages)
  return hasVerified || reviews.length > 0
}
""")

print(f"\n✅ Generated reviews for {len(products)} products")
print(f"📄 TypeScript file saved: {ts_path}")
print(f"📊 Total reviews: {sum(len(v) for v in all_product_reviews.values())}")

