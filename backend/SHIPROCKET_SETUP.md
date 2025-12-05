# Shiprocket Credentials Setup Guide

## Problem

If you see this error in your logs:
```
❌ Shiprocket credentials not found in database
   Please configure Shiprocket credentials via /api/shiprocket/config endpoint
   Or use the save-shiprocket-credentials.js script
API Error [400]: Invalid Shiprocket credentials undefined
```

It means Shiprocket credentials are not configured in the database.

## Solution Options

### Option 1: Use the Script (Recommended)

**On your production server:**

1. Navigate to the backend directory:
   ```bash
   cd /path/to/backend
   ```

2. Set environment variables in your `.env` file:
   ```env
   SHIPROCKET_EMAIL=divyantechnologies@gmail.com
   SHIPROCKET_PASSWORD=Py3I8m@Yr0&3gr&a
   ```

3. Run the script:
   ```bash
   node save-shiprocket-credentials.js
   ```

   Or pass credentials directly:
   ```bash
   node save-shiprocket-credentials.js divyantechnologies@gmail.com "Py3I8m@Yr0&3gr&a"
   ```

### Option 2: Use the API Endpoint

**Make a POST request to:**
```
POST https://thenefol.com/api/shiprocket/config
```

**Headers:**
```
Authorization: Bearer <your_admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "email": "divyantechnologies@gmail.com",
  "password": "Py3I8m@Yr0&3gr&a"
}
```

**Or using curl:**
```bash
curl -X POST https://thenefol.com/api/shiprocket/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "divyantechnologies@gmail.com",
    "password": "Py3I8m@Yr0&3gr&a"
  }'
```

### Option 3: Direct Database Insert

If you have direct database access:

```sql
-- Deactivate old configs
UPDATE shiprocket_config SET is_active = false WHERE is_active = true;

-- Insert new config
INSERT INTO shiprocket_config (api_key, api_secret, is_active, created_at, updated_at)
VALUES ('divyantechnologies@gmail.com', 'Py3I8m@Yr0&3gr&a', true, NOW(), NOW());
```

## Current Credentials

Based on the script:
- **Email**: `divyantechnologies@gmail.com`
- **Password**: `Py3I8m@Yr0&3gr&a`

## Verification

After saving credentials, the script will automatically test authentication with Shiprocket API. You should see:

```
✓ Authentication successful!
  Token received: Yes
  Token preview: <token_preview>...
✅ Shiprocket credentials configured successfully!
```

## Troubleshooting

### Error: "shiprocket_config table does not exist"
**Solution**: Run database migrations first.

### Error: "Authentication failed"
**Solution**: Verify your Shiprocket credentials are correct. Check:
1. Email is correct
2. Password is correct
3. Account is active in Shiprocket dashboard

### Error: "Database connection failed"
**Solution**: Verify `DATABASE_URL` is set correctly in your `.env` file.

## Notes

- The script will automatically deactivate old credentials before saving new ones
- Only one active credential set is allowed at a time
- The API endpoint requires admin authentication
- Credentials are stored in the `shiprocket_config` table in your database

---

**Last Updated**: 2025-01-15

