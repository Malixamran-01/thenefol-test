const fs = require('fs');
const path = require('path');

// Seed random for consistency
let seed = 123;
function seededRandom() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

// Products list with categories
const products = [
  { name: "Nefol Deep Clean Combo", slug: "nefol-deep-clean-combo", category: "combo", type: "face" },
  { name: "Anytime cream", slug: "nefol-anytime-cream", category: "face", type: "cream" },
  { name: "Face Serum", slug: "nefol-face-serum", category: "face", type: "serum" },
  { name: "Furbish Scrub", slug: "nefol-furbish-scrub", category: "face", type: "scrub" },
  { name: "Hair Lather Shampoo", slug: "nefol-hair-lather-shampoo", category: "hair", type: "shampoo" },
  { name: "Hair Mask", slug: "nefol-hair-mask", category: "hair", type: "mask" },
  { name: "Hair Oil", slug: "nefol-hair-oil", category: "hair", type: "oil" },
  { name: "Hydrating moisturizer", slug: "nefol-hydrating-moisturizer", category: "face", type: "moisturizer" },
  { name: "Nefol Acne Control Duo", slug: "nefol-acne-control-duo", category: "combo", type: "acne" },
  { name: "Nefol Facewash/Cleanser", slug: "nefol-face-cleanser", category: "face", type: "cleanser" },
  { name: "Nefol Glow Care combo", slug: "nefol-glow-care-combo", category: "combo", type: "face" },
  { name: "Nefol Hair Care", slug: "nefol-hair-care-combo", category: "combo", type: "hair" },
  { name: "Nefol Hydration Duo", slug: "nefol-hydration-duo", category: "combo", type: "face" },
  { name: "Nefol Radiance Routine", slug: "nefol-radiance-routine", category: "combo", type: "face" },
  { name: "Revitalizing Face Mask", slug: "nefol-revitalizing-face-mask", category: "face", type: "mask" },
  { name: "Wine Lotion", slug: "nefol-wine-lotion", category: "body", type: "lotion" },
];

const names = [
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
];

// Product-specific comments
const faceCommentsShort = [
  "Amazing product! My skin feels so much better after just one week.",
  "Works well, will buy again.",
  "बहुत बढ़िया प्रोडक्ट! मेरी त्वचा नरम हुई।",
  "सेंट कम और असरदार।",
  "Kaafi acha laga, texture smooth hai.",
  "Skin glow badh gaya hai.",
  "Acne kam ho rahe hain.",
  "Moisturization perfect hai.",
];

const faceCommentsLong = [
  "I've been using this for a month. The texture is light and it absorbed well. Saw noticeable improvement in hydration and glow.",
  "Detailed results: reduced oiliness, fewer breakouts, skin tone more even. Packaging is neat and travel-friendly.",
  "मैंने 3 सप्ताह से इस्तेमाल किया है। झुर्रियाँ थोड़ी कम दिख रही हैं और नमी बनी रहती है। खुश हूँ।",
  "Use karne ke baad breakouts kam hue, aur skin hydrated lagti hai. Fragrance mild hai.",
  "My skin feels cleaner and brighter. The product is gentle and doesn't cause any irritation.",
  "Noticed improvement in skin texture and reduced fine lines. Great value for money.",
  "त्वचा में चमक आ गई है और नमी बनी रहती है। बहुत अच्छा लग रहा है।",
];

const hairCommentsShort = [
  "Hair fall kam ho raha hai, good product!",
  "Hair soft aur shiny ho gaye hain.",
  "बाल मजबूत हुए हैं और झड़ने कम हो गए।",
  "Hair texture improve hua hai.",
  "Dandruff control mein helpful hai.",
  "बालों में चमक आ गई है।",
];

const hairCommentsLong = [
  "Using this for 2 months, hair fall reduced significantly. Hair feels stronger and shinier.",
  "Great results! Hair became soft, manageable and less frizzy. Will definitely repurchase.",
  "मैंने 6 सप्ताह से इस्तेमाल किया है। बाल मजबूत हुए हैं और रूखापन कम हुआ है।",
  "Hair growth noticeable hai aur scalp bhi healthy feel hota hai. Recommended!",
  "Hair volume badh gaya hai aur dandruff problem bhi solve ho gayi.",
  "बालों में चमक और मजबूती आई है। नियमित उपयोग से फायदा दिख रहा है।",
];

const bodyCommentsShort = [
  "Skin soft ho gayi hai, good moisturization.",
  "Body par apply karne se smooth feel hota hai.",
  "त्वचा कोमल हो गई है।",
  "Absorption quick hai, sticky feel nahi hota.",
];

const bodyCommentsLong = [
  "Great moisturizer for body. Skin feels soft and hydrated all day. Non-greasy formula.",
  "Using daily after bath, skin texture improved significantly. Light fragrance is pleasant.",
  "शरीर की त्वचा में नमी बनी रहती है और कोमलता आई है। रोजाना उपयोग करने से फायदा दिख रहा है।",
];

const comboCommentsShort = [
  "Complete routine, sab kuch ek saath!",
  "Value for money, all products work well together.",
  "पूरा सेट बहुत अच्छा है, हर प्रोडक्ट अच्छी तरह काम कर रहा है।",
  "Combination perfect hai, results dikh rahe hain.",
];

const comboCommentsLong = [
  "Great combo pack! All products complement each other. Using the complete routine has given amazing results.",
  "Value for money! The combination works really well. My skin/hair improved noticeably with regular use of the full routine.",
  "सभी प्रोडक्ट एक साथ बहुत अच्छा काम कर रहे हैं। नियमित उपयोग से परिणाम दिख रहे हैं।",
];

const scrubComments = [
  "Gentle exfoliation, skin feels smooth after use.",
  "Dead skin cells remove ho rahe hain, texture better hai.",
  "बहुत ही नरम स्क्रब है, रोम छिद्र साफ हो गए हैं।",
  "Regular use se skin glow badh gaya hai.",
];

const maskComments = [
  "Deep cleansing, pores clear ho gaye hain.",
  "Detox effect achha hai, skin fresh feel hoti hai.",
  "मास्क लगाने के बाद त्वचा साफ और चमकदार लगती है।",
  "Weekly use se skin texture improve hua hai.",
];

const serumComments = [
  "Lightweight serum, absorbs quickly without feeling sticky.",
  "Fine lines kam ho rahe hain, skin hydrated hai.",
  "सीरम हल्का है और जल्दी अवशोषित हो जाता है। त्वचा में नमी बनी रहती है।",
  "Antioxidant benefits noticeable hain, skin healthy lagti hai.",
];

const cleanserComments = [
  "Gentle cleansing, removes dirt without stripping moisture.",
  "Daily use karne se skin clean aur fresh rehti hai.",
  "फेश वॉश बहुत नरम है, त्वचा को साफ करता है बिना रूखापन लाए।",
  "Foam achha hai aur rinse easily hota hai.",
];

const creamComments = [
  "Non-greasy cream, perfect for daily use.",
  "Moisturization all day rehti hai, texture smooth hai.",
  "क्रीम हल्की है और त्वचा में जल्दी अवशोषित हो जाती है।",
  "SPF wala cream hai, daily protection milti hai.",
];

const oilComments = [
  "Hair growth ke liye perfect, regular massage se fayda.",
  "Oil non-sticky hai, hair nourished feel hoti hain.",
  "बालों में तेल लगाने से मजबूती आई है और झड़ना कम हुआ है।",
  "Scalp health improve hua hai, dandruff kam hui.",
];

const lotionComments = [
  "Anti-aging benefits noticeable hain, skin firm lagti hai.",
  "Wine extract se skin bright aur smooth ho gayi.",
  "लोशन लगाने से त्वचा में कसावट आई है और चमक बढ़ी है।",
  "Lightweight formula, perfect for face and body.",
];

const shampooComments = [
  "Hair fall control mein effective hai.",
  "Lather good hai, hair clean aur soft ho jaati hain.",
  "शैंपू बालों को अच्छी तरह साफ करता है और चमक देता है।",
  "Regular use se scalp healthy hai aur dandruff free.",
];

const acneComments = [
  "Acne control mein bahut effective, breakouts kam ho gaye.",
  "Oily skin ke liye perfect, oil control achha hai.",
  "मुँहासे कम हो रहे हैं और त्वचा साफ हो रही है।",
  "Inflammation reduce hua hai, skin calming feel hoti hai.",
];

function getCommentsForProduct(product) {
  const category = product.category;
  const type = product.type;
  
  let commentsShort = [];
  let commentsLong = [];
  
  if (category === "face") {
    commentsShort = [...faceCommentsShort];
    commentsLong = [...faceCommentsLong];
    
    if (type === "scrub") {
      commentsShort.push(...scrubComments);
    } else if (type === "mask") {
      commentsShort.push(...maskComments);
    } else if (type === "serum") {
      commentsShort.push(...serumComments);
    } else if (type === "cleanser") {
      commentsShort.push(...cleanserComments);
    } else if (type === "cream") {
      commentsShort.push(...creamComments);
    } else if (type === "acne") {
      commentsShort.push(...acneComments);
    }
  } else if (category === "hair") {
    commentsShort = [...hairCommentsShort];
    commentsLong = [...hairCommentsLong];
    
    if (type === "oil") {
      commentsShort.push(...oilComments);
    } else if (type === "shampoo") {
      commentsShort.push(...shampooComments);
    } else if (type === "mask") {
      commentsShort.push(...hairCommentsShort);
    }
  } else if (category === "body") {
    commentsShort = [...bodyCommentsShort];
    commentsLong = [...bodyCommentsLong];
    if (type === "lotion") {
      commentsShort.push(...lotionComments);
    }
  } else if (category === "combo") {
    commentsShort = [...comboCommentsShort];
    commentsLong = [...comboCommentsLong];
    if (type === "acne") {
      commentsShort.push(...acneComments);
    } else if (type === "face") {
      commentsShort.push(...faceCommentsShort.slice(0, 4));
    } else if (type === "hair") {
      commentsShort.push(...hairCommentsShort.slice(0, 4));
    }
  }
  
  return { commentsShort, commentsLong };
}

function relDatePhrase() {
  const days = Math.floor(seededRandom() * 363) + 2;
  if (days <= 7) {
    return days > 1 ? `${days} days ago` : "1 day ago";
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  } else {
    return "1 year ago";
  }
}

const suffixes = [
  " Will repurchase.", " फिर खरीदूंगी।", " Definitely recommend!",
  " नक्की परत घेतले जाईल.", " ફરીથી ખરીદીશું.", " আবার কিনব।",
  " मैं दोबारा जरूर खरीदूंगी।", " Definitely worth it!",
];

// Generate reviews for each product
const allProductReviews = {};

for (const product of products) {
  const { commentsShort, commentsLong } = getCommentsForProduct(product);
  
  // Generate 40-100 reviews per product
  const numReviews = Math.floor(seededRandom() * 61) + 40;
  const productReviews = [];
  
  for (let i = 0; i < numReviews; i++) {
    const name = names[Math.floor(seededRandom() * names.length)];
    // Higher ratings are more common - 1,2,3 stars should be less than 2% combined
    // 5 stars: 73%, 4 stars: 26.5%, 3 stars: 0.3%, 2 stars: 0.1%, 1 star: 0.1%
    // Total low ratings (1+2+3): 0.5% (< 2%)
    const weights = [0.73, 0.265, 0.003, 0.001, 0.001];
    let rand = seededRandom();
    let selectedRating = 5;
    let cumulative = 0;
    for (let j = 0; j < weights.length; j++) {
      cumulative += weights[j];
      if (rand < cumulative) {
        selectedRating = [5, 4, 3, 2, 1][j];
        break;
      }
    }
    
    const date = relDatePhrase();
    
    // Choose short or long comment
    let comment;
    if (seededRandom() > 0.5) {
      comment = commentsLong[Math.floor(seededRandom() * commentsLong.length)];
    } else {
      comment = commentsShort[Math.floor(seededRandom() * commentsShort.length)];
    }
    
    // Sometimes add suffix
    if (seededRandom() < 0.25) {
      comment += " " + suffixes[Math.floor(seededRandom() * suffixes.length)];
    }
    
    productReviews.push({
      name,
      rating: selectedRating,
      date,
      comment
    });
  }
  
  allProductReviews[product.slug] = productReviews;
  console.log(`Generated ${numReviews} reviews for ${product.name} (${product.slug})`);
}

// Write JSON file
const jsonPath = "product_reviews.json";
fs.writeFileSync(jsonPath, JSON.stringify(allProductReviews, null, 2), 'utf8');

// Write JS file for frontend use
const jsPath = "product_reviews.js";
let jsContent = "// Product Reviews Data\n";
jsContent += "// Generated reviews for all NEFOL products\n\n";
jsContent += "export const productReviews = " + JSON.stringify(allProductReviews, null, 2) + ";\n\n";
jsContent += "// Helper function to get reviews for a product by slug\n";
jsContent += "export function getProductReviews(slug) {\n";
jsContent += "  return productReviews[slug] || [];\n";
jsContent += "}\n";
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log(`\n✅ Generated reviews for ${products.length} products`);
console.log(`📄 JSON file saved: ${jsonPath}`);
console.log(`📄 JS file saved: ${jsPath}`);

const totalReviews = Object.values(allProductReviews).reduce((sum, reviews) => sum + reviews.length, 0);
console.log(`📊 Total reviews generated: ${totalReviews}`);

// Print summary
console.log("\n📋 Review Summary per Product:");
for (const product of products) {
  const reviews = allProductReviews[product.slug];
  const count = reviews.length;
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / count;
  console.log(`  ${product.name}: ${count} reviews (avg rating: ${avgRating.toFixed(2)})`);
}

