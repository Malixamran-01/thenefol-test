# Deployment Instructions for Nefol Application

## Server Information
- **Server IP**: 72.61.225.192
- **Domain**: thenefol.com
- **User**: root
- **Password**: Anoop2025@nefol

## Prerequisites
1. All projects have been built successfully:
   - ✅ Backend: `backend/dist`
   - ✅ Admin Panel: `admin-panel/dist`
   - ✅ User Panel: `user-panel/dist`

## Deployment Steps

### Option 1: Using the Deployment Script (Linux/Mac/Git Bash)

1. Make sure you have `sshpass` installed:
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install sshpass
   
   # On Mac
   brew install sshpass
   
   # On Windows with Git Bash
   # Download from: https://github.com/keimpx/sshpass-win32
   ```

2. Run the deployment script:
   ```bash
   bash deploy.sh
   ```

### Option 2: Using PowerShell (Windows)

1. Install sshpass for Windows or use SSH keys
2. Run:
   ```powershell
   .\deploy.ps1
   ```

### Option 3: Manual Deployment

#### Step 1: Connect to Server
```bash
ssh root@72.61.225.192
# Password: Anoop2025@nefol
```

#### Step 2: Create Directories
```bash
mkdir -p /var/www/nefol/{backend,admin-panel,user-panel}
```

#### Step 3: Upload Files
From your local machine, upload the built files:
```bash
# Upload backend
scp -r backend/dist root@72.61.225.192:/var/www/nefol/backend/
scp backend/package.json root@72.61.225.192:/var/www/nefol/backend/

# Upload admin panel
scp -r admin-panel/dist root@72.61.225.192:/var/www/nefol/admin-panel/

# Upload user panel
scp -r user-panel/dist root@72.61.225.192:/var/www/nefol/user-panel/

# Upload config files
scp ecosystem.config.js root@72.61.225.192:/var/www/nefol/
scp nginx.conf root@72.61.225.192:/var/www/nefol/
```

#### Step 4: Setup PostgreSQL Database
```bash
ssh root@72.61.225.192

# Install PostgreSQL
apt-get update
apt-get install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE nefol;
CREATE USER nofol_users WITH PASSWORD 'Jhx82ndc9g@j';
GRANT ALL PRIVILEGES ON DATABASE nefol TO nofol_users;
\c nefol
GRANT ALL ON SCHEMA public TO nofol_users;
\q
EOF

# Configure PostgreSQL (if needed)
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/g" /etc/postgresql/*/main/postgresql.conf
systemctl restart postgresql
```

**Note:** Change the password `Jhx82ndc9g@j` to a strong production password!

#### Step 5: Install Dependencies
```bash
cd /var/www/nefol/backend
npm install --production
```

#### Step 6: Setup PM2
```bash
npm install -g pm2
cd /var/www/nefol
pm2 delete nefol-backend || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
```

#### Step 7: Setup Nginx
```bash
apt-get update
apt-get install -y nginx
cp /var/www/nefol/nginx.conf /etc/nginx/sites-available/thenefol.com
ln -sf /etc/nginx/sites-available/thenefol.com /etc/nginx/sites-enabled/thenefol.com
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

#### Step 8: Setup SSL Certificate
```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d thenefol.com -d www.thenefol.com --non-interactive --agree-tos --email admin@thenefol.com --redirect
```

#### Step 9: Set Permissions
```bash
chown -R www-data:www-data /var/www/nefol
chmod -R 755 /var/www/nefol
mkdir -p /var/log/pm2
chmod -R 755 /var/log/pm2
```

## Post-Deployment

### Check Application Status
```bash
# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs nefol-backend

# Check Nginx status
systemctl status nginx

# Check if application is running
curl http://localhost:2000/health
```

### Access URLs
- **User Panel**: https://thenefol.com
- **Admin Panel**: https://thenefol.com/admin
- **API**: https://thenefol.com/api

## Troubleshooting

### PM2 Issues
```bash
pm2 restart nefol-backend
pm2 logs nefol-backend --lines 100
```

### Nginx Issues
```bash
nginx -t  # Test configuration
systemctl restart nginx
tail -f /var/log/nginx/nefol_error.log
```

### Port Issues
```bash
netstat -tulpn | grep :2000  # Check if port 2000 is in use
```

## Environment Variables

Make sure to create a `.env` file in `/var/www/nefol/backend/` with all necessary environment variables:

```bash
cd /var/www/nefol/backend
cp env.example .env
nano .env  # Edit with production values
```

**Important:** Update the following in your `.env` file:
- Database password (if you changed it)
- All API keys (Razorpay, WhatsApp, etc.)
- JWT_SECRET and ENCRYPTION_KEY (generate strong random values)
- Domain URLs (should already be set to `https://thenefol.com`)

### Generate Secure Secrets
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -base64 32
```

## Notes
- The backend runs on port 2000
- Nginx proxies requests to the backend
- PM2 manages the backend process
- SSL certificates are managed by Let's Encrypt

