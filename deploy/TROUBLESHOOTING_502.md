# Troubleshooting 502 Bad Gateway Error

## Problem
502 Bad Gateway errors indicate that Nginx is running but cannot connect to the backend server on port 2000.

## Quick Diagnosis Steps

### 1. Check if Backend is Running
```bash
# SSH into your server
ssh root@thenefol.com

# Check PM2 status
pm2 status

# Check if backend process is running
pm2 list

# If backend is not running, check logs
pm2 logs nefol-backend --lines 50
```

### 2. Check if Port 2000 is Listening
```bash
# Check if port 2000 is open and listening
netstat -tlnp | grep 2000
# OR
ss -tlnp | grep 2000
# OR
lsof -i :2000
```

### 3. Check Backend Logs
```bash
# PM2 logs
pm2 logs nefol-backend --lines 100

# Or check log files directly
tail -f /var/log/pm2/nefol-backend-error.log
tail -f /var/log/pm2/nefol-backend-out.log
```

### 4. Check Database Connection
```bash
# Test PostgreSQL connection
psql -U nofol_users -d nefol -h localhost

# If connection fails, check PostgreSQL status
systemctl status postgresql
```

## Common Fixes

### Fix 1: Start Backend with PM2
```bash
cd /var/www/nefol
pm2 delete nefol-backend || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
```

### Fix 2: Check Environment Variables
```bash
# Make sure .env file exists
cd /var/www/nefol/backend
ls -la .env

# If .env doesn't exist, create it from env.example
cp env.example .env

# Edit .env with production values
nano .env

# Important variables to check:
# - DATABASE_URL (must be correct)
# - PORT=2000
# - HOST=0.0.0.0
# - CLIENT_ORIGIN=https://thenefol.com
```

### Fix 3: Check Database Connection String
```bash
# Test database connection
cd /var/www/nefol/backend
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: 'postgresql://nofol_users:Anupnefoldb@localhost:5432/nefol' }); pool.query('SELECT NOW()').then(r => { console.log('DB OK:', r.rows[0]); process.exit(0); }).catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });"
```

### Fix 4: Restart Services
```bash
# Restart PM2
pm2 restart nefol-backend

# Restart Nginx
systemctl restart nginx

# Check Nginx status
systemctl status nginx
nginx -t
```

### Fix 5: Check File Permissions
```bash
# Ensure correct permissions
chown -R www-data:www-data /var/www/nefol
chmod -R 755 /var/www/nefol

# Check backend dist folder exists
ls -la /var/www/nefol/backend/dist/
```

### Fix 6: Install Dependencies
```bash
# Make sure all dependencies are installed
cd /var/www/nefol/backend
npm install --production
```

## IMAGES Path Issue

The error shows requests to `/IMAGES/SS%20LOGO.mp4` returning 502.

**Problem**: IMAGES folder should be in `dist/IMAGES/` but nginx might not be serving it correctly.

**Check**:
```bash
# Verify IMAGES folder exists in dist
ls -la /var/www/nefol/user-panel/dist/IMAGES/

# Check nginx configuration for static file serving
# The nginx.conf should serve static files from dist folder
```

**Fix**: The nginx config already serves from `/var/www/nefol/user-panel/dist/`, so if IMAGES folder is in dist, it should work. Make sure:
1. IMAGES folder is copied to dist during build
2. Files have correct permissions
3. Nginx can read the files

## Step-by-Step Recovery

### Complete Backend Restart
```bash
# 1. Stop backend
pm2 stop nefol-backend
pm2 delete nefol-backend

# 2. Check environment
cd /var/www/nefol/backend
cat .env | grep -E "PORT|HOST|DATABASE_URL"

# 3. Install dependencies (if needed)
npm install --production

# 4. Start backend
cd /var/www/nefol
pm2 start ecosystem.config.js

# 5. Check status
pm2 status
pm2 logs nefol-backend --lines 20

# 6. Test backend directly
curl http://localhost:2000/api

# 7. If backend works, restart nginx
systemctl restart nginx
```

## Verify Backend is Working

```bash
# Test backend API directly (should return JSON)
curl http://localhost:2000/api

# Test from outside (should work if backend is running)
curl https://thenefol.com/api

# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:2000/socket.io/
```

## Expected Output

When backend is running correctly, you should see:
```json
{"status":"ok","message":"Nefol API is running","version":"1.0","endpoints":["/api/products","/api/auth/login","/api/users","/api/orders"]}
```

## Still Not Working?

1. **Check firewall**: Ensure port 2000 is not blocked
   ```bash
   ufw status
   iptables -L -n | grep 2000
   ```

2. **Check system resources**:
   ```bash
   free -h
   df -h
   top
   ```

3. **Check for errors in system logs**:
   ```bash
   journalctl -u nginx -n 50
   journalctl -xe | grep nefol
   ```

4. **Verify file paths in ecosystem.config.js**:
   ```bash
   cat /var/www/nefol/ecosystem.config.js
   ls -la /var/www/nefol/backend/dist/index.js
   ```

