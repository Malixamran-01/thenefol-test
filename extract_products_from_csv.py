import csv
import json

# Read CSV and extract products
products = []

with open('product description page.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        slug = row.get('Slug', '').strip()
        product_name = row.get('Product Name', '').strip()
        key_ingredients = row.get('Key Ingredients', '').strip()
        product_type = row.get('Product Type', '').strip()
        category = row.get('Product Category', '').strip()
        
        if slug and slug != '':
            # Parse ingredients from CSV
            ingredients_str = key_ingredients
            
            # Extract individual ingredients (split by comma, handle various formats)
            ingredients = []
            if ingredients_str:
                # Split by comma first
                parts = ingredients_str.split(',')
                for part in parts:
                    part = part.strip()
                    # Remove common prefixes like "Face Cleanser," etc.
                    if part and len(part) > 3:
                        # Extract ingredient names (often formatted like "Ingredient: benefit")
                        ingredient_name = part.split(':')[0].split('(')[0].strip()
                        if ingredient_name and ingredient_name not in ['Face Cleanser', 'Furbish Scrub', 'Revitalizing Face Mask', 'Wine Lotion', 'Face Cleanser +', 'Anytime Cream', 'Hair Oil', 'Hair Lather Shampoo', 'Hair Mask', 'Hydrating Moisturizer', 'Face Serum']:
                            # Handle compound ingredients like "Aprajita (Blue Tea)"
                            if '(' in part:
                                # Extract both names
                                base = part.split('(')[0].strip()
                                alt = part.split('(')[1].split(')')[0].strip()
                                if base:
                                    ingredients.append(base)
                                if alt and alt != base:
                                    ingredients.append(alt)
                            else:
                                if ingredient_name:
                                    ingredients.append(ingredient_name)
            
            # Determine category type
            if 'combo' in slug or 'Combo' in product_name or category == 'combo packs':
                cat = 'combo'
            elif 'Hair' in product_type or 'hair' in category.lower():
                cat = 'hair'
            elif 'Body' in product_type or 'body' in category.lower():
                cat = 'body'
            else:
                cat = 'face'
            
            # Determine product type
            ptype = 'combo'
            if 'serum' in slug.lower() or 'Serum' in product_name:
                ptype = 'serum'
            elif 'scrub' in slug.lower() or 'Scrub' in product_name:
                ptype = 'scrub'
            elif 'mask' in slug.lower() or 'Mask' in product_name:
                ptype = 'mask'
            elif 'cleanser' in slug.lower() or 'Facewash' in product_name or 'Face Cleanser' in product_name:
                ptype = 'cleanser'
            elif 'cream' in slug.lower() or 'Cream' in product_name or 'Anytime' in product_name:
                ptype = 'cream'
            elif 'moisturizer' in slug.lower() or 'Moisturizer' in product_name:
                ptype = 'moisturizer'
            elif 'oil' in slug.lower() and 'hair' in slug.lower():
                ptype = 'oil'
            elif 'shampoo' in slug.lower() or 'Shampoo' in product_name:
                ptype = 'shampoo'
            elif 'lotion' in slug.lower() or 'Lotion' in product_name:
                ptype = 'lotion'
            elif 'acne' in slug.lower():
                ptype = 'acne'
            
            # Extract unique ingredients
            unique_ingredients = []
            seen = set()
            for ing in ingredients:
                ing_clean = ing.strip()
                if ing_clean and ing_clean not in seen and len(ing_clean) > 2:
                    seen.add(ing_clean)
                    unique_ingredients.append(ing_clean)
            
            # Default to Blue Tea if no ingredients found
            if not unique_ingredients:
                unique_ingredients = ['Blue Tea']
            
            products.append({
                "name": product_name,
                "slug": slug,
                "category": cat,
                "type": ptype,
                "ingredients": unique_ingredients[:5]  # Limit to 5 main ingredients
            })
            
            print(f"Added: {slug} - {product_name[:50]}... | Ingredients: {', '.join(unique_ingredients[:3])}")

print(f"\n✅ Extracted {len(products)} products")
print(f"\n📋 Product list:")
for i, p in enumerate(products, 1):
    print(f"{i:2d}. {p['slug']} | {p['category']}/{p['type']} | Ingredients: {', '.join(p['ingredients'][:3])}")

# Save to JSON for reference
with open('products_extracted.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, indent=2, ensure_ascii=False)

print(f"\n💾 Saved to products_extracted.json")

