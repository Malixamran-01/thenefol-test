import random
import json
import datetime

random.seed(123)

# Product list with categories
products = [
    {"name": "Nefol Deep Clean Combo", "slug": "nefol-deep-clean-combo", "category": "combo", "type": "face"},
    {"name": "Anytime cream", "slug": "nefol-anytime-cream", "category": "face", "type": "cream"},
    {"name": "Face Serum", "slug": "nefol-face-serum", "category": "face", "type": "serum"},
    {"name": "Furbish Scrub", "slug": "nefol-furbish-scrub", "category": "face", "type": "scrub"},
    {"name": "Hair Lather Shampoo", "slug": "nefol-hair-lather-shampoo", "category": "hair", "type": "shampoo"},
    {"name": "Hair Mask", "slug": "nefol-hair-mask", "category": "hair", "type": "mask"},
    {"name": "Hair Oil", "slug": "nefol-hair-oil", "category": "hair", "type": "oil"},
    {"name": "Hydrating moisturizer", "slug": "nefol-hydrating-moisturizer", "category": "face", "type": "moisturizer"},
    {"name": "Nefol Acne Control Duo", "slug": "nefol-acne-control-duo", "category": "combo", "type": "acne"},
    {"name": "Nefol Facewash/Cleanser", "slug": "nefol-face-cleanser", "category": "face", "type": "cleanser"},
    {"name": "Nefol Glow Care combo", "slug": "nefol-glow-care-combo", "category": "combo", "type": "face"},
    {"name": "Nefol Hair Care", "slug": "nefol-hair-care-combo", "category": "combo", "type": "hair"},
    {"name": "Nefol Hydration Duo", "slug": "nefol-hydration-duo", "category": "combo", "type": "face"},
    {"name": "Nefol Radiance Routine", "slug": "nefol-radiance-routine", "category": "combo", "type": "face"},
    {"name": "Revitalizing Face Mask", "slug": "nefol-revitalizing-face-mask", "category": "face", "type": "mask"},
    {"name": "Wine Lotion", "slug": "nefol-wine-lotion", "category": "body", "type": "lotion"},
]

names = [
    "Priya K.", "Rahul S.", "Anita R.", "Deepa S.", "Riya P.", "Amit M.", "Sneha T.", "Suresh B.",
    "Kavita J.", "Vikram N.", "Neha D.", "Rajesh K.", "Pooja L.", "Manish R.", "Simran G.", "Arjun P.",
    "Meera S.", "Sanjay C.", "Rekha V.", "Kiran H.", "Isha M.", "Rohit Y.", "Nisha A.", "Vandana P.",
    "Pankaj T.", "Shalini R.", "Harish N.", "Gauri K.", "Bhavesh M.", "Trupti S.", "Kamal D.", "Irfan Q.",
    "Lata P.", "Abhishek R.", "Sana K.", "Tarun V.", "Maya S.", "Vijay P.", "Rakesh L.", "Neelam B.",
    "Farhan A.", "Veda R.", "Devika S.", "Arnav M.", "Chitra P.", "Siddharth G.", "Bina J.", "Ketan R.",
    "Ankita S.", "Lokesh Y.", "Divya M.", "Sheetal N.", "Gopal H.", "Yogesh T.", "Ritu P.", "Sohail A.",
    "Madhuri K.", "Pradeep B.", "Zoya R.", "Shruti S.", "Bharat V.", "Nandita P.", "Ayesha K.", "Raman D.",
    "Suman L.", "Tara M.", "Umesh R.", "Vikash S.", "Priyanka G.", "Ramanpreet K.", "Mahesh N.", "Shweta P.",
    "Kavya S.", "Dinesh R.", "Bindu M.", "Arpita L.", "Nitin K.", "Bhavna S.", "Kishore P.", "Sonal T.",
    "Javed A.", "Priyam M.", "Roshni D.", "Sagar K.", "Anjali R.", "Lalit S.", "Minal P.", "Ramesh B.",
    "Aarti N.", "Vimal K.", "Namita S.", "Sowmya R.", "Kalyan P.", "Monika J.", "Rahima S.", "Shobha L."
]

# Product-specific comments
face_comments_short = [
    "Amazing product! My skin feels so much better after just one week.",
    "Works well, will buy again.",
    "बहुत बढ़िया प्रोडक्ट! मेरी त्वचा नरम हुई।",
    "सेंट कम और असरदार।",
    "Kaafi acha laga, texture smooth hai.",
    "Skin glow badh gaya hai.",
    "Acne kam ho rahe hain.",
    "Moisturization perfect hai.",
]

face_comments_long = [
    "I've been using this for a month. The texture is light and it absorbed well. Saw noticeable improvement in hydration and glow.",
    "Detailed results: reduced oiliness, fewer breakouts, skin tone more even. Packaging is neat and travel-friendly.",
    "मैंने 3 सप्ताह से इस्तेमाल किया है। झुर्रियाँ थोड़ी कम दिख रही हैं और नमी बनी रहती है। खुश हूँ।",
    "Use karne ke baad breakouts kam hue, aur skin hydrated lagti hai. Fragrance mild hai.",
    "My skin feels cleaner and brighter. The product is gentle and doesn't cause any irritation.",
    "Noticed improvement in skin texture and reduced fine lines. Great value for money.",
    "त्वचा में चमक आ गई है और नमी बनी रहती है। बहुत अच्छा लग रहा है।",
]

hair_comments_short = [
    "Hair fall kam ho raha hai, good product!",
    "Hair soft aur shiny ho gaye hain.",
    "बाल मजबूत हुए हैं और झड़ने कम हो गए।",
    "Hair texture improve hua hai.",
    "Dandruff control mein helpful hai.",
    "बालों में चमक आ गई है।",
]

hair_comments_long = [
    "Using this for 2 months, hair fall reduced significantly. Hair feels stronger and shinier.",
    "Great results! Hair became soft, manageable and less frizzy. Will definitely repurchase.",
    "मैंने 6 सप्ताह से इस्तेमाल किया है। बाल मजबूत हुए हैं और रूखापन कम हुआ है।",
    "Hair growth noticeable hai aur scalp bhi healthy feel hota hai. Recommended!",
    "Hair volume badh gaya hai aur dandruff problem bhi solve ho gayi.",
    "बालों में चमक और मजबूती आई है। नियमित उपयोग से फायदा दिख रहा है।",
]

body_comments_short = [
    "Skin soft ho gayi hai, good moisturization.",
    "Body par apply karne se smooth feel hota hai.",
    "त्वचा कोमल हो गई है।",
    "Absorption quick hai, sticky feel nahi hota.",
]

body_comments_long = [
    "Great moisturizer for body. Skin feels soft and hydrated all day. Non-greasy formula.",
    "Using daily after bath, skin texture improved significantly. Light fragrance is pleasant.",
    "शरीर की त्वचा में नमी बनी रहती है और कोमलता आई है। रोजाना उपयोग करने से फायदा दिख रहा है।",
]

combo_comments_short = [
    "Complete routine, sab kuch ek saath!",
    "Value for money, all products work well together.",
    "पूरा सेट बहुत अच्छा है, हर प्रोडक्ट अच्छी तरह काम कर रहा है।",
    "Combination perfect hai, results dikh rahe hain.",
]

combo_comments_long = [
    "Great combo pack! All products complement each other. Using the complete routine has given amazing results.",
    "Value for money! The combination works really well. My skin/hair improved noticeably with regular use of the full routine.",
    "सभी प्रोडक्ट एक साथ बहुत अच्छा काम कर रहे हैं। नियमित उपयोग से परिणाम दिख रहे हैं।",
]

scrub_comments = [
    "Gentle exfoliation, skin feels smooth after use.",
    "Dead skin cells remove ho rahe hain, texture better hai.",
    "बहुत ही नरम स्क्रब है, रोम छिद्र साफ हो गए हैं।",
    "Regular use se skin glow badh gaya hai.",
]

mask_comments = [
    "Deep cleansing, pores clear ho gaye hain.",
    "Detox effect achha hai, skin fresh feel hoti hai.",
    "मास्क लगाने के बाद त्वचा साफ और चमकदार लगती है।",
    "Weekly use se skin texture improve hua hai.",
]

serum_comments = [
    "Lightweight serum, absorbs quickly without feeling sticky.",
    "Fine lines kam ho rahe hain, skin hydrated hai.",
    "सीरम हल्का है और जल्दी अवशोषित हो जाता है। त्वचा में नमी बनी रहती है।",
    "Antioxidant benefits noticeable hain, skin healthy lagti hai.",
]

cleanser_comments = [
    "Gentle cleansing, removes dirt without stripping moisture.",
    "Daily use karne se skin clean aur fresh rehti hai.",
    "फेश वॉश बहुत नरम है, त्वचा को साफ करता है बिना रूखापन लाए।",
    "Foam achha hai aur rinse easily hota hai.",
]

cream_comments = [
    "Non-greasy cream, perfect for daily use.",
    "Moisturization all day rehti hai, texture smooth hai.",
    "क्रीम हल्की है और त्वचा में जल्दी अवशोषित हो जाती है।",
    "SPF wala cream hai, daily protection milti hai.",
]

oil_comments = [
    "Hair growth ke liye perfect, regular massage se fayda.",
    "Oil non-sticky hai, hair nourished feel hoti hain.",
    "बालों में तेल लगाने से मजबूती आई है और झड़ना कम हुआ है।",
    "Scalp health improve hua hai, dandruff kam hui.",
]

lotion_comments = [
    "Anti-aging benefits noticeable hain, skin firm lagti hai.",
    "Wine extract se skin bright aur smooth ho gayi.",
    "लोशन लगाने से त्वचा में कसावट आई है और चमक बढ़ी है।",
    "Lightweight formula, perfect for face and body.",
]

shampoo_comments = [
    "Hair fall control mein effective hai.",
    "Lather good hai, hair clean aur soft ho jaati hain.",
    "शैंपू बालों को अच्छी तरह साफ करता है और चमक देता है।",
    "Regular use se scalp healthy hai aur dandruff free.",
]

acne_comments = [
    "Acne control mein bahut effective, breakouts kam ho gaye.",
    "Oily skin ke liye perfect, oil control achha hai.",
    "मुँहासे कम हो रहे हैं और त्वचा साफ हो रही है।",
    "Inflammation reduce hua hai, skin calming feel hoti hai.",
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

suffixes = [
    " Will repurchase.", " फिर खरीदूंगी।", " Definitely recommend!",
    " नक्की परत घेतले जाईल.", " ફરીથી ખરીદીશું.", " আবার কিনব।",
    " मैं दोबारा जरूर खरीदूंगी।", " Definitely worth it!",
]

def get_comments_for_product(product):
    """Get product-specific comments based on category and type"""
    category = product["category"]
    ptype = product["type"]
    
    comments_short = []
    comments_long = []
    
    if category == "face":
        comments_short = face_comments_short.copy()
        comments_long = face_comments_long.copy()
        
        if ptype == "scrub":
            comments_short.extend(scrub_comments)
        elif ptype == "mask":
            comments_short.extend(mask_comments)
        elif ptype == "serum":
            comments_short.extend(serum_comments)
        elif ptype == "cleanser":
            comments_short.extend(cleanser_comments)
        elif ptype == "cream":
            comments_short.extend(cream_comments)
        elif ptype == "acne":
            comments_short.extend(acne_comments)
            
    elif category == "hair":
        comments_short = hair_comments_short.copy()
        comments_long = hair_comments_long.copy()
        
        if ptype == "oil":
            comments_short.extend(oil_comments)
        elif ptype == "shampoo":
            comments_short.extend(shampoo_comments)
        elif ptype == "mask":
            comments_short.extend(hair_comments_short)
            
    elif category == "body":
        comments_short = body_comments_short.copy()
        comments_long = body_comments_long.copy()
        if ptype == "lotion":
            comments_short.extend(lotion_comments)
            
    elif category == "combo":
        comments_short = combo_comments_short.copy()
        comments_long = combo_comments_long.copy()
        if ptype == "acne":
            comments_short.extend(acne_comments)
        elif ptype == "face":
            comments_short.extend(face_comments_short[:4])
        elif ptype == "hair":
            comments_short.extend(hair_comments_short[:4])
    
    return comments_short, comments_long

# Generate reviews for each product
all_product_reviews = {}

for product in products:
    slug = product["slug"]
    comments_short, comments_long = get_comments_for_product(product)
    
    # Generate 40-100 reviews per product
    num_reviews = random.randint(40, 100)
    product_reviews = []
    
    for _ in range(num_reviews):
        name = random.choice(names)
        # Higher ratings are more common
        rating = random.choices([5, 4, 3, 2, 1], weights=[55, 30, 8, 4, 3])[0]
        date = rel_date_phrase()
        
        # Choose short or long comment
        comment = random.choice(comments_long if random.random() > 0.5 else comments_short)
        
        # Sometimes add suffix
        if random.random() < 0.25:
            comment += " " + random.choice(suffixes)
        
        product_reviews.append({
            "name": name,
            "rating": rating,
            "date": date,
            "comment": comment
        })
    
    all_product_reviews[slug] = product_reviews
    print(f"Generated {num_reviews} reviews for {product['name']} ({slug})")

# Write JSON file
json_path = "product_reviews.json"
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(all_product_reviews, f, ensure_ascii=False, indent=2)

# Write JS file for frontend use
js_path = "product_reviews.js"
with open(js_path, "w", encoding="utf-8") as f:
    f.write("// Product Reviews Data\n")
    f.write("// Generated reviews for all NEFOL products\n\n")
    f.write("export const productReviews = ")
    
    # Convert to JS format with proper escaping
    js_content = json.dumps(all_product_reviews, ensure_ascii=False, indent=2)
    f.write(js_content)
    f.write(";\n\n")
    f.write("// Helper function to get reviews for a product by slug\n")
    f.write("export function getProductReviews(slug) {\n")
    f.write("  return productReviews[slug] || [];\n")
    f.write("}\n")

print(f"\n✅ Generated reviews for {len(products)} products")
print(f"📄 JSON file saved: {json_path}")
print(f"📄 JS file saved: {js_path}")

total_reviews = sum(len(reviews) for reviews in all_product_reviews.values())
print(f"📊 Total reviews generated: {total_reviews}")

# Print summary
print("\n📋 Review Summary per Product:")
for product in products:
    slug = product["slug"]
    count = len(all_product_reviews[slug])
    avg_rating = sum(r["rating"] for r in all_product_reviews[slug]) / count
    print(f"  {product['name']}: {count} reviews (avg rating: {avg_rating:.2f})")

