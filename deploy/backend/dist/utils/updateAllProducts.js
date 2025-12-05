"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAllProductsWithPricing = updateAllProductsWithPricing;
exports.addSampleProducts = addSampleProducts;
async function updateAllProductsWithPricing(pool) {
    try {
        console.log('🔄 Updating all products with MRP and discounted pricing...');
        // Get all existing products
        const { rows: products } = await pool.query(`
      SELECT id, title, price, details 
      FROM products 
      ORDER BY id
    `);
        console.log(`📦 Found ${products.length} products to update`);
        // Sample pricing data for different product categories
        const pricingData = {
            'face care': {
                baseMrp: 800,
                discountPercent: 25
            },
            'hair care': {
                baseMrp: 1200,
                discountPercent: 30
            },
            'body care': {
                baseMrp: 600,
                discountPercent: 20
            },
            'combo': {
                baseMrp: 2000,
                discountPercent: 35
            }
        };
        let updatedCount = 0;
        for (const product of products) {
            const category = (product.category || '').toLowerCase();
            const currentPrice = parseFloat(product.price) || 0;
            // Determine pricing based on category or current price
            let mrp;
            let discountPercent;
            if (category.includes('face')) {
                mrp = pricingData['face care'].baseMrp;
                discountPercent = pricingData['face care'].discountPercent;
            }
            else if (category.includes('hair')) {
                mrp = pricingData['hair care'].baseMrp;
                discountPercent = pricingData['hair care'].discountPercent;
            }
            else if (category.includes('body')) {
                mrp = pricingData['body care'].baseMrp;
                discountPercent = pricingData['body care'].discountPercent;
            }
            else if (category.includes('combo')) {
                mrp = pricingData['combo'].baseMrp;
                discountPercent = pricingData['combo'].discountPercent;
            }
            else {
                // Default pricing based on current price
                mrp = currentPrice > 0 ? Math.round(currentPrice * 1.3) : 800;
                discountPercent = 25;
            }
            const websitePrice = Math.round(mrp - (mrp * discountPercent / 100));
            // Update product details
            const updatedDetails = {
                ...product.details,
                mrp: mrp.toString(),
                websitePrice: websitePrice.toString(),
                discountPercent: discountPercent.toString()
            };
            await pool.query(`
        UPDATE products 
        SET details = $1, updated_at = now()
        WHERE id = $2
      `, [JSON.stringify(updatedDetails), product.id]);
            console.log(`✅ Updated: ${product.title} - MRP: ₹${mrp}, Sale: ₹${websitePrice} (${discountPercent}% OFF)`);
            updatedCount++;
        }
        console.log(`🎉 Successfully updated ${updatedCount} products with pricing data!`);
        return { success: true, updatedCount };
    }
    catch (error) {
        console.error('❌ Error updating products:', error);
        return { success: false, error };
    }
}
// Function to add sample products if none exist
async function addSampleProducts(pool) {
    try {
        console.log('🌱 Adding sample products...');
        const sampleProducts = [
            {
                slug: 'nefol-face-serum',
                title: 'Nefol Vitamin C Face Serum',
                category: 'Face Care',
                price: '599',
                description: 'Brightening vitamin C serum for radiant skin',
                details: {
                    mrp: '800',
                    websitePrice: '599',
                    discountPercent: '25',
                    sku: 'NFS001',
                    brand: 'Nefol'
                }
            },
            {
                slug: 'nefol-moisturizer',
                title: 'Nefol Hydrating Moisturizer',
                category: 'Face Care',
                price: '699',
                description: 'Deep hydrating moisturizer for all skin types',
                details: {
                    mrp: '999',
                    websitePrice: '699',
                    discountPercent: '30',
                    sku: 'NHM002',
                    brand: 'Nefol'
                }
            },
            {
                slug: 'nefol-hair-oil',
                title: 'Nefol Hair Growth Oil',
                category: 'Hair Care',
                price: '899',
                description: 'Natural hair growth oil with essential oils',
                details: {
                    mrp: '1299',
                    websitePrice: '899',
                    discountPercent: '31',
                    sku: 'NHO003',
                    brand: 'Nefol'
                }
            },
            {
                slug: 'nefol-body-lotion',
                title: 'Nefol Body Lotion',
                category: 'Body Care',
                price: '499',
                description: 'Nourishing body lotion for soft skin',
                details: {
                    mrp: '699',
                    websitePrice: '499',
                    discountPercent: '29',
                    sku: 'NBL004',
                    brand: 'Nefol'
                }
            },
            {
                slug: 'nefol-combo-pack',
                title: 'Nefol Complete Care Combo',
                category: 'Combo',
                price: '1299',
                description: 'Complete skincare combo pack',
                details: {
                    mrp: '1999',
                    websitePrice: '1299',
                    discountPercent: '35',
                    sku: 'NCC005',
                    brand: 'Nefol'
                }
            }
        ];
        for (const product of sampleProducts) {
            await pool.query(`
        INSERT INTO products (slug, title, category, price, description, details, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, now(), now())
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          category = EXCLUDED.category,
          price = EXCLUDED.price,
          description = EXCLUDED.description,
          details = EXCLUDED.details,
          updated_at = now()
      `, [
                product.slug,
                product.title,
                product.category,
                product.price,
                product.description,
                JSON.stringify(product.details)
            ]);
        }
        console.log(`✅ Added ${sampleProducts.length} sample products!`);
        return { success: true, count: sampleProducts.length };
    }
    catch (error) {
        console.error('❌ Error adding sample products:', error);
        return { success: false, error };
    }
}
