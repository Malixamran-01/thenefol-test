// Script to import CSV products into database
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://nofol_users:Jhx82ndc9g@j@localhost:5432/nefol';
const pool = new Pool({ connectionString });

// Parse the whole CSV (RFC 4180): quoted fields may contain commas, "" and line breaks
function parseCSVRows(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  const endRow = () => {
    row.push(cur);
    if (row.some(c => c.trim() !== '')) rows.push(row);
    row = [];
    cur = '';
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') endRow();
    else if (ch === '\r') { if (text[i + 1] === '\n') i++; endRow(); }
    else cur += ch;
  }
  if (cur !== '' || row.length) endRow();
  return rows;
}

// "₹1,299.00" / "Rs. 1299" -> "1299.00"; '' when empty or not a number
function normalizeMoney(raw) {
  const cleaned = String(raw || '').replace(/₹|rs\.?|inr|\/-|,|\s/gi, '');
  return /^\d+(\.\d+)?$/.test(cleaned) && Number(cleaned) > 0 ? Number(cleaned).toFixed(2) : '';
}

// "30%" -> "30"
function normalizePercent(raw) {
  const cleaned = String(raw || '').replace(/%|\s/g, '');
  return /^\d+(\.\d+)?$/.test(cleaned) ? String(Number(cleaned)) : '';
}

// Same categories as the admin panel dropdown
function mapCategory(raw) {
  const c = String(raw || '').toLowerCase().trim();
  if (!c) return '';
  if (c.includes('combo') || c.includes('pack')) return 'Combo';
  if (c.includes('hair')) return 'Hair Care';
  if (c.includes('face') || c.includes('skin')) return 'Face Care';
  if (c.includes('body')) return 'Body Care';
  return String(raw).trim();
}

// Generate slug from product name
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

async function importProducts() {
  try {
    console.log('🚀 Starting CSV import...');
    
    // Read CSV file
    const csvPath = path.resolve(__dirname, '..', 'product description page.csv');
    console.log('📁 Reading CSV from:', csvPath);
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found at:', csvPath);
      process.exit(1);
    }
    
    const raw = fs.readFileSync(csvPath, 'utf8');
    const records = parseCSVRows(raw);

    console.log('📊 Total records in CSV:', records.length);

    if (records.length === 0) {
      console.error('❌ No lines found in CSV');
      process.exit(1);
    }

    // Parse headers
    const headers = records[0].map(h => h.trim());
    console.log('📋 Headers found:', headers.length);
    console.log('🏷️  First few headers:', headers.slice(0, 5).join(', '));

    // Parse products
    const products = [];
    for (let i = 1; i < records.length; i++) {
      const parts = records[i];
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = (parts[j] ?? '').trim();
      }
      products.push(obj);
    }
    
    console.log(`✅ Parsed ${products.length} products from CSV`);
    
    // Insert products into database
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      try {
        const productName = product['Product Name'] || '';
        const slug = product['Slug'] || slugify(productName);
        const brand = product['Brand Name'] || 'NEFOL';
        const sku = product['SKU'] || '';
        const category = mapCategory(product['Product Category']);
        const subCategory = product['Product Sub-Category'] || '';
        const mrp = normalizeMoney(product['MRP'] || product['MRP (₹)']);
        const csvWebsitePrice = normalizeMoney(product['WEBSITE price'] || product['Website Price']);
        const csvDiscount = normalizePercent(product['discount']);
        // Website price wins; otherwise derive it from MRP and discount
        const websitePrice = csvWebsitePrice ||
          (mrp && csvDiscount ? (Number(mrp) * (1 - Number(csvDiscount) / 100)).toFixed(2) : '');
        const discount = mrp && websitePrice
          ? String(Math.round((Number(mrp) - Number(websitePrice)) / Number(mrp) * 1000) / 10)
          : csvDiscount;
        const sellingPrice = websitePrice || mrp;
        const listImage = (product['Image Links'] || '').split(/[\s,]+/).find(Boolean) || '';
        
        // Store all CSV data in details JSON field
        const details = {
          productName: product['Product Name'] || '',
          slug: slug,
          brand: product['Brand Name'] || '',
          sku: product['SKU'] || '',
          hsn: product['HSN Code'] || '',
          productTitle: product['Product Title'] || '',
          subtitle: product['Subtitle / Tagline'] || '',
          category: product['Product Category'] || '',
          subCategory: product['Product Sub-Category'] || '',
          productType: product['Product Type'] || '',
          skinHairType: product['Skin/Hair Type'] || '',
          netQuantity: product['Net Quantity (Content)'] || '',
          unitCount: product['Unit Count (Pack of)'] || '',
          packageContent: product['Package Content Details'] || '',
          innerPackaging: product['Inner Packaging Type'] || '',
          outerPackaging: product['Outer Packaging Type'] || '',
          netWeight: product['Net Weight (Product Only)'] || '',
          deadWeight: product['Dead Weight (Packaging Only)'] || '',
          discount: discount,
          discountPercent: discount,
          mrp: mrp,
          websitePrice: websitePrice,
          gst: normalizePercent(product['GST %']),
          gstPercent: normalizePercent(product['GST %']),
          countryOfOrigin: product['Country of Origin'] || '',
          manufacturer: product['Manufacturer / Packer / Importer'] || '',
          keyIngredients: product['Key Ingredients'] || '',
          ingredientBenefits: product['Ingredient Benefits'] || '',
          howToUse: product['How to Use (Steps)'] || '',
          longDescription: product['Product Description (Long)'] || '',
          bulletHighlights: product['Bullet Highlights (Short Desc.)'] || '',
          imageLinks: product['Image Links'] || '',
          videoLinks: product['Video Links'] || '',
          platformCategoryMapping: product['Platform Category Mapping'] || '',
          hazardous: product['Hazardous / Fragile (Y/N)'] || '',
          badges: product['Special Attributes (Badges)'] || ''
        };
        
        if (!productName || !slug) {
          console.log(`⚠️  Skipping product with missing name or slug`);
          skipped++;
          continue;
        }

        if (!sellingPrice) {
          console.log(`⚠️  Skipping ${productName}: no valid MRP or website price`);
          skipped++;
          continue;
        }

        if (mrp && websitePrice && Number(websitePrice) > Number(mrp)) {
          console.log(`⚠️  Skipping ${productName}: website price ₹${websitePrice} is higher than MRP ₹${mrp}`);
          skipped++;
          continue;
        }

        if (csvDiscount && discount && Math.abs(Number(csvDiscount) - Number(discount)) > 0.5) {
          console.log(`⚠️  ${productName}: discount column says ${csvDiscount}% but prices give ${discount}%; using ${discount}%`);
        }

        // Check if product already exists
        const checkResult = await pool.query(
          'SELECT id FROM products WHERE slug = $1',
          [slug]
        );
        
        if (checkResult.rows.length > 0) {
          // Update existing product
          await pool.query(`
            UPDATE products 
            SET title = $1, category = $2, price = $3, list_image = $4, 
                description = $5, details = $6, brand = $7, 
                key_ingredients = $8, skin_type = $9, updated_at = NOW()
            WHERE slug = $10
          `, [
            productName,
            category,
            sellingPrice,
            listImage,
            details.longDescription,
            JSON.stringify(details),
            brand,
            details.keyIngredients,
            details.skinHairType,
            slug
          ]);
          updated++;
          console.log(`🔄 Updated: ${productName}`);
        } else {
          // Insert new product
          await pool.query(`
            INSERT INTO products (slug, title, category, price, list_image, description, details, brand, key_ingredients, skin_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            slug,
            productName,
            category,
            sellingPrice,
            listImage,
            details.longDescription,
            JSON.stringify(details),
            brand,
            details.keyIngredients,
            details.skinHairType
          ]);
          inserted++;
          console.log(`✅ Inserted: ${productName}`);
        }
        
      } catch (err) {
        console.error(`❌ Error processing product:`, err.message);
        skipped++;
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Inserted: ${inserted}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   📦 Total Processed: ${products.length}`);
    
  } catch (err) {
    console.error('❌ Import failed:', err);
  } finally {
    await pool.end();
  }
}

importProducts();

