"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = getToken;
exports.saveShiprocketConfig = saveShiprocketConfig;
exports.getShiprocketConfig = getShiprocketConfig;
exports.getPickupLocations = getPickupLocations;
exports.createShipment = createShipment;
exports.createAwbAndLabel = createAwbAndLabel;
exports.trackShipment = trackShipment;
exports.checkPincodeServiceability = checkPincodeServiceability;
exports.createManifest = createManifest;
exports.schedulePickup = schedulePickup;
exports.listNdr = listNdr;
exports.actOnNdr = actOnNdr;
exports.markRto = markRto;
const apiHelpers_1 = require("../utils/apiHelpers");
function getBaseUrl() {
    return process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
}
async function getToken(pool) {
    try {
        const { rows } = await pool.query('select api_key, api_secret from shiprocket_config where is_active = true order by updated_at desc, id desc limit 1');
        const apiKey = rows[0]?.api_key; // This stores email
        const apiSecret = rows[0]?.api_secret; // This stores password
        if (!apiKey || !apiSecret) {
            console.error('Shiprocket credentials not found in database');
            return null;
        }
        const resp = await fetch(`${getBaseUrl()}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: apiKey, password: apiSecret })
        });
        if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({}));
            console.error('Shiprocket authentication failed:', errorData);
            return null;
        }
        const data = await resp.json();
        return data?.token || null;
    }
    catch (err) {
        console.error('Error getting Shiprocket token:', err);
        return null;
    }
}
async function saveShiprocketConfig(pool, req, res) {
    try {
        // Accept both api_key/api_secret (for backward compatibility) and email/password
        const { api_key, api_secret, email, password } = req.body || {};
        const emailValue = email || api_key;
        const passwordValue = password || api_secret;
        const validationError = (0, apiHelpers_1.validateRequired)({ email: emailValue, password: passwordValue }, ['email', 'password']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        // Deactivate old configs
        await pool.query('update shiprocket_config set is_active = false where is_active = true');
        // Insert new config (api_key stores email, api_secret stores password)
        await pool.query(`insert into shiprocket_config (api_key, api_secret, is_active, created_at, updated_at)
       values ($1, $2, true, now(), now())`, [emailValue, passwordValue]);
        // Test authentication
        const testToken = await getToken(pool);
        if (!testToken) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Failed to authenticate with Shiprocket. Please check your credentials.');
        }
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Shiprocket config saved and verified successfully', token_received: !!testToken }, 201);
    }
    catch (err) {
        console.error('Error saving Shiprocket config:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to save Shiprocket config', err);
    }
}
async function getShiprocketConfig(pool, req, res) {
    try {
        const { rows } = await pool.query(`select id, is_active, updated_at from shiprocket_config where is_active = true order by updated_at desc, id desc limit 1`);
        const has_config = rows.length > 0;
        (0, apiHelpers_1.sendSuccess)(res, { has_config, config: rows[0] || null });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch Shiprocket config', err);
    }
}
// Get available pickup locations from Shiprocket
async function getPickupLocations(pool) {
    try {
        const token = await getToken(pool);
        if (!token)
            return null;
        const base = getBaseUrl();
        const resp = await fetch(`${base}/settings/company/pickup`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok)
            return null;
        const data = await resp.json();
        // Shiprocket returns locations in data.data array
        return data?.data || data || [];
    }
    catch (err) {
        console.error('Error fetching pickup locations:', err);
        return null;
    }
}
// Create shipment in Shiprocket
async function createShipment(pool, req, res) {
    try {
        const { orderId } = req.params;
        // Fetch order details
        const { rows: orders } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        if (orders.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Order not found');
        const order = orders[0];
        const shippingAddress = order.shipping_address || {};
        const items = order.items || [];
        if (!shippingAddress.address || !shippingAddress.city || !shippingAddress.pincode) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Order shipping address is incomplete');
        }
        const token = await getToken(pool);
        if (!token)
            return (0, apiHelpers_1.sendError)(res, 400, 'Invalid Shiprocket credentials');
        // Get available pickup locations and use the first one
        const pickupLocations = await getPickupLocations(pool);
        let pickupLocation = 'work'; // Default to 'work' based on error response, fallback to 'Primary' if needed
        if (pickupLocations && pickupLocations.length > 0) {
            // Use the first available pickup location's name
            pickupLocation = pickupLocations[0].pickup_location || pickupLocations[0].id?.toString() || 'work';
            console.log(`✅ Using pickup location: ${pickupLocation} (from ${pickupLocations.length} available locations)`);
        }
        else {
            // Use 'work' as default since that's what Shiprocket expects based on error response
            pickupLocation = 'work';
            console.log('⚠️ No pickup locations found via API, using default: work');
        }
        // Helper function to extract 10-digit phone number for Shiprocket
        const getTenDigitPhone = (phoneValue) => {
            if (!phoneValue)
                return '';
            // Remove all non-digits
            const cleanPhone = phoneValue.replace(/\D/g, '');
            // If phone includes country code (e.g., +919876543210), extract last 10 digits
            if (cleanPhone.length > 10) {
                return cleanPhone.slice(-10);
            }
            // If phone is exactly 10 digits, return as is
            if (cleanPhone.length === 10) {
                return cleanPhone;
            }
            // If phone is less than 10 digits, return empty (will fail validation)
            return cleanPhone;
        };
        // Prepare shipment payload for Shiprocket
        const shipmentPayload = {
            order_id: order.order_number || `ORDER-${order.id}`,
            order_date: new Date(order.created_at || Date.now()).toISOString().split('T')[0],
            pickup_location: pickupLocation,
            billing_customer_name: order.customer_name,
            billing_last_name: shippingAddress.lastName || '',
            billing_address: shippingAddress.address || '',
            billing_address_2: shippingAddress.apartment || '',
            billing_city: shippingAddress.city || '',
            billing_pincode: shippingAddress.zip || shippingAddress.pincode || '',
            billing_state: shippingAddress.state || '',
            billing_country: shippingAddress.country || 'India',
            billing_email: order.customer_email,
            billing_phone: getTenDigitPhone(shippingAddress.phone || (order.billing_address?.phone)),
            shipping_is_billing: !order.billing_address,
            shipping_customer_name: order.customer_name,
            shipping_last_name: shippingAddress.lastName || '',
            shipping_address: shippingAddress.address || '',
            shipping_address_2: shippingAddress.apartment || '',
            shipping_city: shippingAddress.city || '',
            shipping_pincode: shippingAddress.zip || shippingAddress.pincode || '',
            shipping_state: shippingAddress.state || '',
            shipping_country: shippingAddress.country || 'India',
            shipping_email: order.customer_email,
            shipping_phone: getTenDigitPhone(shippingAddress.phone),
            order_items: items.map((item, index) => ({
                name: item.name || item.title || `Product ${index + 1}`,
                sku: item.sku || item.variant_id || `SKU-${item.product_id || index}`,
                units: item.quantity || 1,
                selling_price: item.price || item.unit_price || 0
            })),
            payment_method: order.payment_method === 'cod' || order.payment_type === 'cod' ? 'COD' : 'Prepaid',
            sub_total: order.subtotal || 0,
            length: 10, // Default dimensions, should be configurable
            breadth: 10,
            height: 10,
            weight: 0.5, // Default weight, should be calculated from items
            total_discount: order.discount_amount || 0,
            shipping_charges: order.shipping || 0,
            giftwrap_charges: 0,
            transaction_charges: 0,
            total_discounts: order.discount_amount || 0,
            cod_charges: (order.payment_method === 'cod' || order.payment_type === 'cod') ? (order.total * 0.02) : 0, // 2% COD charges
            add_charges: 0,
            comment: `Order from NEFOL - ${order.order_number || order.id}`
        };
        const base = getBaseUrl();
        const shipmentResp = await fetch(`${base}/orders/create/adhoc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(shipmentPayload)
        });
        const shipmentData = await shipmentResp.json();
        if (!shipmentResp.ok) {
            // If error is about pickup location, try to get the correct one from error response
            if (shipmentData?.message?.includes('Pickup location') || shipmentData?.message?.includes('pickup')) {
                // Try to extract location from error response - check multiple possible structures
                let correctLocation = 'work'; // Default fallback
                if (shipmentData?.data?.data?.length > 0) {
                    correctLocation = shipmentData.data.data[0].pickup_location || shipmentData.data.data[0].id?.toString() || 'work';
                }
                else if (shipmentData?.data?.length > 0) {
                    correctLocation = shipmentData.data[0].pickup_location || shipmentData.data[0].id?.toString() || 'work';
                }
                console.log(`⚠️ Pickup location error detected, retrying with: ${correctLocation}`);
                console.log(`   Error message: ${shipmentData?.message}`);
                // Retry with correct pickup location
                shipmentPayload.pickup_location = correctLocation;
                const retryResp = await fetch(`${base}/orders/create/adhoc`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(shipmentPayload)
                });
                const retryData = await retryResp.json();
                if (retryResp.ok && retryData) {
                    // Use retry data
                    const shipmentId = retryData?.shipment_id || retryData?.order_id || null;
                    const awbCode = retryData?.awb_code || null;
                    // Check if shipment already exists
                    const existingShipment = await pool.query('SELECT id FROM shiprocket_shipments WHERE order_id = $1', [order.id]);
                    if (existingShipment.rows.length === 0) {
                        const { rows } = await pool.query(`INSERT INTO shiprocket_shipments (order_id, shipment_id, tracking_url, status, awb_code, label_url, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
               RETURNING *`, [
                            order.id,
                            shipmentId ? String(shipmentId) : null,
                            retryData?.tracking_url || null,
                            retryData?.status || 'pending',
                            awbCode,
                            retryData?.label_url || null
                        ]);
                        return (0, apiHelpers_1.sendSuccess)(res, {
                            ...rows[0],
                            shiprocket_response: retryData
                        }, 201);
                    }
                    else {
                        // Update existing
                        const { rows } = await pool.query(`UPDATE shiprocket_shipments 
               SET shipment_id = $1, tracking_url = $2, status = $3, awb_code = $4, label_url = $5, updated_at = NOW()
               WHERE order_id = $6
               RETURNING *`, [
                            shipmentId ? String(shipmentId) : null,
                            retryData?.tracking_url || null,
                            retryData?.status || 'pending',
                            awbCode,
                            retryData?.label_url || null,
                            order.id
                        ]);
                        return (0, apiHelpers_1.sendSuccess)(res, {
                            ...rows[0],
                            shiprocket_response: retryData
                        }, 200);
                    }
                }
                else {
                    console.error('Shiprocket shipment creation error (after retry):', retryData);
                    return (0, apiHelpers_1.sendError)(res, 400, 'Failed to create shipment in Shiprocket', retryData);
                }
            }
            else {
                console.error('Shiprocket shipment creation error:', shipmentData);
                return (0, apiHelpers_1.sendError)(res, 400, 'Failed to create shipment in Shiprocket', shipmentData);
            }
        }
        const shipmentId = shipmentData?.shipment_id || shipmentData?.order_id || null;
        const awbCode = shipmentData?.awb_code || null;
        const courierId = shipmentData?.courier_id || null;
        // Save to database
        const { rows } = await pool.query(`INSERT INTO shiprocket_shipments (order_id, shipment_id, tracking_url, status, awb_code, label_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`, [
            order.id,
            shipmentId ? String(shipmentId) : null,
            shipmentData?.tracking_url || null,
            shipmentData?.status || 'pending',
            awbCode,
            shipmentData?.label_url || null
        ]);
        (0, apiHelpers_1.sendSuccess)(res, {
            ...rows[0],
            shiprocket_response: shipmentData
        }, 201);
    }
    catch (err) {
        console.error('Error creating shipment:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create shipment', err);
    }
}
async function createAwbAndLabel(pool, req, res) {
    try {
        const { orderId } = req.params;
        // fetch order
        const { rows: orders } = await pool.query('select * from orders where id = $1', [orderId]);
        if (orders.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Order not found');
        const token = await getToken(pool);
        if (!token)
            return (0, apiHelpers_1.sendError)(res, 400, 'Invalid Shiprocket credentials');
        // Check if shipment already exists
        const { rows: existingShipments } = await pool.query('SELECT * FROM shiprocket_shipments WHERE order_id = $1 ORDER BY id DESC LIMIT 1', [orderId]);
        let shipmentId = existingShipments[0]?.shipment_id;
        // If no shipment exists, create one first
        if (!shipmentId) {
            // Use the create shipment function logic here or call it
            return (0, apiHelpers_1.sendError)(res, 400, 'Please create shipment first using /api/shiprocket/orders/:orderId/shipment');
        }
        const base = getBaseUrl();
        const awbResp = await fetch(`${base}/courier/assign/awb`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                shipment_id: shipmentId,
                courier_id: req.body?.courier_id || null
            })
        });
        const awbData = await awbResp.json();
        if (!awbResp.ok)
            return (0, apiHelpers_1.sendError)(res, 400, 'Failed to generate AWB', awbData);
        const awb_code = awbData?.response?.awb_code || awbData?.awb_code || null;
        let label_url = null;
        if (awb_code) {
            try {
                const labelResp = await fetch(`${base}/courier/generate/label`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ shipment_id: shipmentId })
                });
                const labelData = await labelResp.json();
                if (labelResp.ok) {
                    label_url = labelData?.label_url || labelData?.label_url_pdf || null;
                }
            }
            catch (err) {
                console.error('Error generating label:', err);
            }
        }
        // Update existing shipment record
        const { rows } = await pool.query(`UPDATE shiprocket_shipments 
       SET awb_code = $1, label_url = $2, status = 'ready_to_ship', updated_at = NOW()
       WHERE order_id = $3
       RETURNING *`, [awb_code, label_url, orderId]);
        (0, apiHelpers_1.sendSuccess)(res, rows[0] || existingShipments[0], 200);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create AWB/label', err);
    }
}
async function trackShipment(pool, req, res) {
    try {
        const { orderId } = req.params;
        const token = await getToken(pool);
        if (!token)
            return (0, apiHelpers_1.sendError)(res, 400, 'Invalid Shiprocket credentials');
        const { rows: shipments } = await pool.query('select * from shiprocket_shipments where order_id = $1 order by id desc limit 1', [orderId]);
        if (shipments.length === 0)
            return (0, apiHelpers_1.sendError)(res, 404, 'Shipment not found');
        const awb = shipments[0].awb_code;
        const base = getBaseUrl();
        const resp = await fetch(`${base}/courier/track/awb/${encodeURIComponent(awb)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await resp.json();
        if (!resp.ok)
            return (0, apiHelpers_1.sendError)(res, 400, 'Failed to track shipment', data);
        (0, apiHelpers_1.sendSuccess)(res, data);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to track shipment', err);
    }
}
async function checkPincodeServiceability(pool, req, res) {
    try {
        const { pickup_postcode, delivery_postcode, cod = '0', weight = '0.5' } = (req.query || {});
        if (!pickup_postcode || !delivery_postcode)
            return (0, apiHelpers_1.sendError)(res, 400, 'pickup_postcode and delivery_postcode are required');
        const token = await getToken(pool);
        if (!token)
            return (0, apiHelpers_1.sendError)(res, 400, 'Invalid Shiprocket credentials');
        const base = getBaseUrl();
        const url = `${base}/courier/serviceability?pickup_postcode=${encodeURIComponent(pickup_postcode)}&delivery_postcode=${encodeURIComponent(delivery_postcode)}&cod=${encodeURIComponent(cod)}&weight=${encodeURIComponent(weight)}`;
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await resp.json();
        if (!resp.ok)
            return (0, apiHelpers_1.sendError)(res, 400, 'Failed to check serviceability', data);
        (0, apiHelpers_1.sendSuccess)(res, data);
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to check pincode serviceability', err);
    }
}
// =============== Extended Logistics (stubs with graceful fallbacks) ===============
async function createManifest(pool, req, res) {
    try {
        const { orderIds } = req.body || {};
        if (!Array.isArray(orderIds) || orderIds.length === 0)
            return (0, apiHelpers_1.sendError)(res, 400, 'orderIds required');
        // Placeholder: In a full integration, call Shiprocket manifest endpoint and return PDF URL
        const manifest_url = `/manifests/manifest-${Date.now()}.pdf`;
        (0, apiHelpers_1.sendSuccess)(res, { manifest_url, count: orderIds.length });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to generate manifest', err);
    }
}
async function schedulePickup(pool, req, res) {
    try {
        const { pickup_date, orderIds } = req.body || {};
        if (!pickup_date)
            return (0, apiHelpers_1.sendError)(res, 400, 'pickup_date required');
        if (!Array.isArray(orderIds) || orderIds.length === 0)
            return (0, apiHelpers_1.sendError)(res, 400, 'orderIds required');
        // Placeholder: hit Shiprocket pickup scheduling in full implementation
        (0, apiHelpers_1.sendSuccess)(res, { scheduled: true, pickup_date, count: orderIds.length });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to schedule pickup', err);
    }
}
async function listNdr(pool, req, res) {
    try {
        const { from, to } = (req.query || {});
        // Placeholder: fetch NDRs from Shiprocket; returning empty list to keep UI functional
        (0, apiHelpers_1.sendSuccess)(res, { items: [], from: from || null, to: to || null });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch NDR list', err);
    }
}
async function actOnNdr(pool, req, res) {
    try {
        const { awb } = req.params;
        const { action, note } = req.body || {};
        if (!awb)
            return (0, apiHelpers_1.sendError)(res, 400, 'awb required');
        if (!action)
            return (0, apiHelpers_1.sendError)(res, 400, 'action required');
        // Placeholder: submit NDR action to Shiprocket; audit locally if needed
        (0, apiHelpers_1.sendSuccess)(res, { awb, action, note: note || null, status: 'submitted' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to process NDR action', err);
    }
}
async function markRto(pool, req, res) {
    try {
        const { orderId } = req.params;
        if (!orderId)
            return (0, apiHelpers_1.sendError)(res, 400, 'orderId required');
        // Minimal local update to reflect RTO (you may keep a dedicated table/field)
        await pool.query(`update orders set status = 'rto', updated_at = now() where id = $1`, [orderId]);
        (0, apiHelpers_1.sendSuccess)(res, { orderId, status: 'rto' });
    }
    catch (err) {
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to mark RTO', err);
    }
}
