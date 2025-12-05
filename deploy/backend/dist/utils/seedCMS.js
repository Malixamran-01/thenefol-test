"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCMSContent = seedCMSContent;
async function seedCMSContent(pool) {
    try {
        console.log('🌱 Seeding CMS content...');
        // Define all pages
        const pages = [
            { slug: 'home', title: 'Home', meta_description: 'Discover premium natural skincare products' },
            { slug: 'about', title: 'About Us', meta_description: 'Learn about Nefol and our commitment to natural beauty' },
            { slug: 'contact', title: 'Contact Us', meta_description: 'Contact Nefol for inquiries and support' },
            { slug: 'blog', title: 'Blog', meta_description: 'Read our latest articles on skincare and beauty' },
            { slug: 'usp', title: 'Why Choose Nefol', meta_description: 'Discover what makes Nefol products special' },
            { slug: 'shop', title: 'Shop', meta_description: 'Shop premium natural skincare products' },
            { slug: 'face', title: 'Face Care', meta_description: 'Shop face care products' },
            { slug: 'hair', title: 'Hair Care', meta_description: 'Shop hair care products' },
            { slug: 'body', title: 'Body Care', meta_description: 'Shop body care products' },
            { slug: 'combos', title: 'Product Combos', meta_description: 'Shop product combination bundles' }
        ];
        // Insert or update pages
        for (const page of pages) {
            await pool.query(`
        INSERT INTO cms_pages (slug, title, meta_description)
        VALUES ($1, $2, $3)
        ON CONFLICT (slug) 
        DO UPDATE SET 
          title = EXCLUDED.title,
          meta_description = EXCLUDED.meta_description,
          updated_at = CURRENT_TIMESTAMP
      `, [page.slug, page.title, page.meta_description]);
        }
        // Seed Home Page Content
        const homeSections = [
            {
                page_slug: 'home',
                section_type: 'hero_banner',
                title: 'Hero Banner',
                content: {
                    title: 'ELEVATE YOUR SKIN WITH',
                    subtitle: 'NATURAL BEAUTY',
                    description: 'infused with premium natural ingredients',
                    buttonText: 'SHOP NOW',
                    buttonLink: '/shop',
                    images: ['/IMAGES/BANNER (1).jpg', '/IMAGES/BANNER (2).jpg', '/IMAGES/BANNER (3).jpg']
                },
                order_index: 0
            },
            {
                page_slug: 'home',
                section_type: 'shop_categories',
                title: 'Shop by Category',
                content: {
                    title: 'SHOP BY CATEGORY',
                    categories: [
                        { name: 'Body', image: '/IMAGES/body.jpg', link: '/body' },
                        { name: 'Face', image: '/IMAGES/face.jpg', link: '/face' },
                        { name: 'Hair', image: '/IMAGES/hair.jpg', link: '/hair' },
                        { name: 'Combos', image: '/IMAGES/combo.jpg', link: '/combos' }
                    ]
                },
                order_index: 1
            },
            {
                page_slug: 'home',
                section_type: 'featured_products',
                title: 'Shop What\'s New',
                content: {
                    title: 'SHOP WHAT\'S NEW',
                    tabs: ['NEW ARRIVALS', 'BEST SELLERS', 'TOP RATED'],
                    displayCount: 6
                },
                order_index: 2
            },
            {
                page_slug: 'home',
                section_type: 'commitments',
                title: 'Thoughtful Commitments',
                content: {
                    title: 'THOUGHTFUL COMMITMENTS',
                    description: 'We are committed to providing you with the safest and most effective natural skincare products.',
                    badges: [
                        { image: '/IMAGES/cruielty.jpg', alt: 'Cruelty-Free' },
                        { image: '/IMAGES/paraben.jpg', alt: 'Paraben-Free' },
                        { image: '/IMAGES/india.jpg', alt: 'Made in India' },
                        { image: '/IMAGES/chemical.jpg', alt: 'Chemical-Free' },
                        { image: '/IMAGES/vegan.jpg', alt: 'Vegan' }
                    ]
                },
                order_index: 3
            }
        ];
        // Seed Contact Page Content
        const contactSections = [
            {
                page_name: 'contact',
                section_key: 'contact_info',
                section_title: 'Contact Information',
                section_type: 'contact',
                content: {
                    title: 'CONTACT US',
                    subtitle: 'Have a question or comment? Use the form below to send us a message, or contact us by mail.',
                    offices: [
                        {
                            name: 'Lucknow Office',
                            address: '703, BCC Tower, Sultanpur Road,\nArjunganj, Lucknow,\nUttar Pradesh – 226002, India'
                        },
                        {
                            name: 'Greater Noida Office',
                            address: 'D-2627, 12th Avenue, Gaur City-2,\nSector 16C, Greater Noida West,\nGhaziabad, Uttar Pradesh – 201009, India'
                        }
                    ],
                    phone: '+91-8887847213',
                    email: 'support@thenefol.com',
                    whatsapp: 'Chat with us on WhatsApp'
                },
                order_index: 0
            },
            {
                page_name: 'contact',
                section_key: 'affiliate_program',
                section_title: 'Affiliate Program',
                section_type: 'cta',
                content: {
                    title: 'Affiliate Program',
                    description: 'Join our affiliate program and earn commissions by promoting Nefol products. Share our natural skincare solutions with your audience and get rewarded for every sale.',
                    features: [
                        'Competitive commission rates',
                        'Marketing materials provided',
                        'Real-time tracking dashboard',
                        'Dedicated support team'
                    ],
                    buttonText: 'JOIN AFFILIATE PROGRAM',
                    buttonLink: '/affiliate'
                },
                order_index: 1
            }
        ];
        // Seed Blog Page Content
        const blogSections = [
            {
                page_name: 'blog',
                section_key: 'blog_posts',
                section_title: 'Blog Posts',
                section_type: 'list',
                content: {
                    title: 'BLOG',
                    subtitle: 'Discover the latest insights on natural skincare, beauty tips, and the science behind our ingredients.',
                    posts: [
                        {
                            id: 'origin-blue-tea',
                            title: 'The Origin of Blue Tea Flower',
                            date: 'May 01, 2025',
                            excerpt: 'Blue tea, commonly known as butterfly pea flower tea, originates from Southeast Asia, particularly Thailand, Vietnam, Malaysia, and India. The tea is derived from the Clitoria ternatea plant...',
                            image: '/IMAGES/FACE SERUM (5).jpg',
                            featured: true
                        },
                        {
                            id: 'diy-skincare-tips',
                            title: 'DIY Skincare Tips Using Blue Pea Flower Extract',
                            date: 'May 01, 2025',
                            excerpt: 'While professional skincare products provide formulated benefits, incorporating DIY treatments can enhance your routine. Here are some simple recipes using Blue Pea Flower extract...',
                            image: '/IMAGES/HYDRATING MOISTURIZER (5).jpg',
                            featured: false
                        },
                        {
                            id: 'combat-skin-issues',
                            title: 'How to Combat Common Skin Issues with Nefol\'s Skincare Line',
                            date: 'May 01, 2025',
                            excerpt: 'Everyone\'s skin is unique, but many of us face similar challenges. Whether it\'s acne, dryness, or signs of aging, Nefol\'s Blue Pea Flower-infused products can help address these concerns...',
                            image: '/IMAGES/FACE MASK (5).jpg',
                            featured: false
                        }
                    ]
                },
                order_index: 0
            }
        ];
        // Seed USP Page Content
        const uspSections = [
            {
                page_name: 'usp',
                section_key: 'main_usp',
                section_title: 'Main USP',
                section_type: 'hero',
                content: {
                    title: 'Why Choose Nefol?',
                    subtitle: 'Discover what makes Nefol products truly special and why thousands of customers trust us for their skincare needs.',
                    mainTitle: 'Nefol Aesthetics Products',
                    mainDescription: 'Enriched with high antioxidants give dazzling beautiful skin'
                },
                order_index: 0
            },
            {
                page_name: 'usp',
                section_key: 'blue_tea_excellence',
                section_title: 'Blue Tea Excellence',
                section_type: 'text',
                content: {
                    title: 'Blue Tea Excellence',
                    description: 'It is extracted from the plant called Clitoria Ternatea (Aprajita) that has multiple benefits and is beneficial for skin. Rich antioxidants which work staggering for hair growth and gleam the skin. It also helps to defend your skin against pollution and also give radical free skin. Blue tea present in the Nefol products is rich in Anthocyanins.'
                },
                order_index: 1
            },
            {
                page_name: 'usp',
                section_key: 'product_benefits',
                section_title: 'Product Benefits',
                section_type: 'features',
                content: {
                    title: 'What Makes Us Different',
                    features: [
                        { icon: 'leaf', title: 'Natural & Safe', description: 'Nefol products are paraben, cruelty, nasties and sulphate free' },
                        { icon: 'shield', title: 'International Compliance', description: 'Our products fulfill all international compliance and don\'t use prohibited components' },
                        { icon: 'award', title: 'High Antioxidants', description: 'Enriched with high antioxidants that give dazzling beautiful skin' },
                        { icon: 'heart', title: 'pH Balance', description: 'EDTA in all Nefol products maintains pH balance of the skin' }
                    ]
                },
                order_index: 2
            }
        ];
        // Insert all sections
        const allSections = [...homeSections];
        for (const section of allSections) {
            // Get page ID first
            const pageResult = await pool.query('SELECT id FROM cms_pages WHERE slug = $1', [section.page_slug]);
            if (pageResult.rows.length === 0) {
                console.warn(`Page not found: ${section.page_slug}`);
                continue;
            }
            const pageId = pageResult.rows[0].id;
            // Check if section already exists
            const existingSection = await pool.query('SELECT id FROM cms_sections WHERE page_id = $1 AND section_type = $2', [pageId, section.section_type]);
            if (existingSection.rows.length > 0) {
                // Skip updating existing sections to preserve uploaded images and custom content
                // This prevents the seed script from overwriting user-uploaded images on server restart
                // Only update order_index if it's not set (0), but preserve content
                const currentSection = await pool.query('SELECT order_index FROM cms_sections WHERE page_id = $1 AND section_type = $2', [pageId, section.section_type]);
                const currentOrderIndex = currentSection.rows[0]?.order_index ?? 0;
                // Only update order_index if it's 0 (default/unset), otherwise preserve existing
                if (currentOrderIndex === 0 && section.order_index !== 0) {
                    await pool.query(`
            UPDATE cms_sections 
            SET order_index = $1, updated_at = CURRENT_TIMESTAMP
            WHERE page_id = $2 AND section_type = $3
          `, [section.order_index, pageId, section.section_type]);
                }
                // Content is preserved - do not overwrite with seed data
                console.log(`✓ Preserved existing section: ${section.section_type} (skipped seed update to preserve uploaded content)`);
            }
            else {
                // Insert new section only if it doesn't exist
                await pool.query(`
          INSERT INTO cms_sections (page_id, section_type, title, content, order_index, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
        `, [pageId, section.section_type, section.title, JSON.stringify(section.content), section.order_index]);
            }
        }
        // Seed global settings
        const settings = [
            { setting_key: 'site_name', setting_value: 'Nefol', setting_type: 'text' },
            { setting_key: 'site_tagline', setting_value: 'Natural Beauty for Everyone', setting_type: 'text' },
            { setting_key: 'contact_email', setting_value: 'support@thenefol.com', setting_type: 'text' },
            { setting_key: 'contact_phone', setting_value: '+91-8887847213', setting_type: 'text' },
            { setting_key: 'social_media', setting_value: JSON.stringify({
                    facebook: 'https://facebook.com/nefol',
                    instagram: 'https://instagram.com/nefol',
                    twitter: 'https://twitter.com/nefol'
                }), setting_type: 'json' }
        ];
        for (const setting of settings) {
            await pool.query(`
        INSERT INTO cms_settings (setting_key, setting_value, setting_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key)
        DO UPDATE SET
          setting_value = EXCLUDED.setting_value,
          setting_type = EXCLUDED.setting_type,
          updated_at = CURRENT_TIMESTAMP
      `, [setting.setting_key, setting.setting_value, setting.setting_type]);
        }
        console.log('✅ CMS content seeded successfully');
    }
    catch (error) {
        console.error('❌ Failed to seed CMS content:', error);
        throw error;
    }
}
