// Script to import CSV products into database
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://nofol_users:Jhx82ndc9g@j@localhost:5432/nefol';
const pool = new Pool({ connectionString });

// Parse CSV line with proper quote handling
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
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
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    
    console.log('📊 Total lines in CSV:', lines.length);
    
    if (lines.length === 0) {
      console.error('❌ No lines found in CSV');
      process.exit(1);
    }
    
    // Parse headers
    const headers = parseCSVLine(lines[0]);
    console.log('📋 Headers found:', headers.length);
    console.log('🏷️  First few headers:', headers.slice(0, 5).join(', '));
    
    // Parse products
    const products = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      if (parts.every(p => p.trim() === '')) continue;
      
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
        const category = product['Product Category'] || '';
        const subCategory = product['Product Sub-Category'] || '';
        const mrp = product['MRP'] || '0';
        const websitePrice = product['WEBSITE price'] || '0';
        const discount = product['discount'] || '0';
        const listImage = product['Image Links'] ? product['Image Links'].split(',')[0].trim() : '';
        
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
          discount: product['discount'] || '',
          mrp: product['MRP'] || '',
          websitePrice: product['WEBSITE price'] || '',
          gst: product['GST %'] || '',
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
            websitePrice,
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
            websitePrice,
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

