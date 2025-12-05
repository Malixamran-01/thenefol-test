# Quick Fix for 502 Bad Gateway

## Problem
Backend server is not running, causing 502 errors for all API calls and WebSocket connections.

## Immediate Fix (Run on Server)

```bash
# SSH into server
ssh root@thenefol.com

# 1. Check if backend is running
pm2 status

# 2. If not running, start it
cd /var/www/nefol
pm2 start ecosystem.config.js

# 3. Check logs for errors
pm2 logs nefol-backend --lines 50

# 4. If there are errors, check:
#    - Database connection
#    - Environment variables
#    - File permissions
```

## Common Issues & Fixes

### Issue 1: Backend Not Started
```bash
cd /var/www/nefol
pm2 delete nefol-backend || true
pm2 start ecosystem.config.js
pm2 save
```

### Issue 2: Database Connection Failed
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
psql -U nofol_users -d nefol -h localhost
# Password: Anupnefoldb

# If connection fails, check:
# - PostgreSQL is installed and running
# - Database 'nefol' exists
# - User 'nofol_users' exists with correct password
```

### Issue 3: Missing .env File
```bash
cd /var/www/nefol/backend
if [ ! -f .env ]; then
  cp env.example .env
  # Edit .env with production values
  nano .env
fi
```

### Issue 4: Dependencies Not Installed
```bash
cd /var/www/nefol/backend
npm install --production
```

### Issue 5: Wrong File Paths
```bash
# Verify dist folder exists
ls -la /var/www/nefol/backend/dist/index.js

# Verify ecosystem.config.js path is correct
cat /var/www/nefol/ecosystem.config.js
```

## Complete Restart Procedure

```bash
# 1. Stop everything
pm2 stop nefol-backend
pm2 delete nefol-backend

# 2. Verify environment
cd /var/www/nefol/backend
cat .env | grep -E "PORT|HOST|DATABASE_URL"

# 3. Install dependencies
npm install --production

# 4. Start backend
cd /var/www/nefol
pm2 start ecosystem.config.js

# 5. Check status
pm2 status
pm2 logs nefol-backend --lines 20

# 6. Test backend directly
curl http://localhost:2000/api

# 7. Restart nginx
systemctl restart nginx
nginx -t
```

## Verify It's Working

After fixing, test these:

```bash
# 1. Backend API (should return JSON)
curl http://localhost:2000/api

# 2. From browser
curl https://thenefol.com/api

# 3. Check PM2 status
pm2 status

# 4. Check nginx error logs
tail -f /var/log/nginx/nefol_error.log
```

## Expected Success Response

When backend is working:
```json
{"status":"ok","message":"Nefol API is running","version":"1.0","endpoints":["/api/products","/api/auth/login","/api/users","/api/orders"]}
```

## IMAGES Path Issue

The `/IMAGES/` paths should work automatically if:
1. IMAGES folder exists in `/var/www/nefol/user-panel/dist/IMAGES/`
2. Nginx is serving from `/var/www/nefol/user-panel/dist/`
3. Files have correct permissions

Check:
```bash
ls -la /var/www/nefol/user-panel/dist/IMAGES/
chown -R www-data:www-data /var/www/nefol
chmod -R 755 /var/www/nefol
```

