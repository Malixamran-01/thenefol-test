#!/bin/bash

# Deployment script for Nefol application
# Server: 72.61.225.192
# Domain: thenefol.com

set -e

SERVER_IP="72.61.225.192"
SERVER_USER="root"
SERVER_PASS="Anoop2025@nefol"
DEPLOY_PATH="/var/www/nefol"
DOMAIN="thenefol.com"

echo "🚀 Starting deployment to $SERVER_IP..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to run commands on remote server
run_remote() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

# Function to copy files to remote server
copy_to_remote() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -r "$1" "$SERVER_USER@$SERVER_IP:$2"
}

echo -e "${YELLOW}📦 Step 1: Creating deployment directory on server...${NC}"
run_remote "mkdir -p $DEPLOY_PATH/{backend,admin-panel,user-panel}"

echo -e "${YELLOW}📦 Step 2: Uploading backend files...${NC}"
copy_to_remote "backend/dist" "$DEPLOY_PATH/backend/"
copy_to_remote "backend/package.json" "$DEPLOY_PATH/backend/"
copy_to_remote "backend/migrate.js" "$DEPLOY_PATH/backend/" || echo "Migration file not found, skipping"
copy_to_remote "backend/env.example" "$DEPLOY_PATH/backend/"
copy_to_remote "backend/node_modules" "$DEPLOY_PATH/backend/" || echo "Skipping node_modules (will install on server)"

echo -e "${YELLOW}📦 Step 3: Uploading admin panel...${NC}"
copy_to_remote "admin-panel/dist" "$DEPLOY_PATH/admin-panel/"

echo -e "${YELLOW}📦 Step 4: Uploading user panel...${NC}"
copy_to_remote "user-panel/dist" "$DEPLOY_PATH/user-panel/"

echo -e "${YELLOW}📦 Step 5: Uploading configuration files...${NC}"
copy_to_remote "ecosystem.config.js" "$DEPLOY_PATH/"
copy_to_remote "nginx.conf" "$DEPLOY_PATH/"

echo -e "${YELLOW}🗄️  Step 6: Setting up PostgreSQL database...${NC}"
echo -e "${YELLOW}   Installing PostgreSQL...${NC}"
run_remote "apt-get update && apt-get install -y postgresql postgresql-contrib || true"

echo -e "${YELLOW}   Starting PostgreSQL service...${NC}"
run_remote "systemctl start postgresql || true"
run_remote "systemctl enable postgresql || true"

echo -e "${YELLOW}   Creating database and user...${NC}"
# Database credentials from env.example
DB_NAME="nefol"
DB_USER="nofol_users"
DB_PASSWORD="Jhx82ndc9g@j"

# Create database (check if exists first)
run_remote "sudo -u postgres psql -tAc \"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'\" | grep -q 1 || sudo -u postgres psql -c \"CREATE DATABASE $DB_NAME;\" || echo 'Database may already exist'"

# Create user (check if exists first)
run_remote "sudo -u postgres psql -tAc \"SELECT 1 FROM pg_user WHERE usename='$DB_USER'\" | grep -q 1 || sudo -u postgres psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';\" || echo 'User may already exist'"

# Grant privileges
run_remote "sudo -u postgres psql -c \"ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';\" || true"
run_remote "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;\" || true"
run_remote "sudo -u postgres psql -d $DB_NAME -c \"GRANT ALL ON SCHEMA public TO $DB_USER;\" || true"

echo -e "${YELLOW}   Configuring PostgreSQL to allow local connections...${NC}"
run_remote "sed -i \"s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/g\" /etc/postgresql/*/main/postgresql.conf || true"
run_remote "systemctl restart postgresql || true"

echo -e "${GREEN}   ✅ Database setup completed!${NC}"

echo -e "${YELLOW}🔧 Step 7: Installing Node.js dependencies on server...${NC}"
run_remote "cd $DEPLOY_PATH/backend && npm install --production"

echo -e "${YELLOW}🔧 Step 8: Setting up PM2...${NC}"
run_remote "npm install -g pm2 || true"
run_remote "cd $DEPLOY_PATH && pm2 delete nefol-backend || true"
run_remote "cd $DEPLOY_PATH && pm2 start ecosystem.config.js"
run_remote "pm2 save"
run_remote "pm2 startup systemd -u root --hp /root || true"

echo -e "${YELLOW}🔧 Step 9: Setting up Nginx...${NC}"
run_remote "apt-get update && apt-get install -y nginx || true"
copy_to_remote "nginx.conf" "/etc/nginx/sites-available/thenefol.com"
run_remote "ln -sf /etc/nginx/sites-available/thenefol.com /etc/nginx/sites-enabled/thenefol.com || true"
run_remote "rm -f /etc/nginx/sites-enabled/default || true"
run_remote "nginx -t && systemctl reload nginx || systemctl restart nginx"

echo -e "${YELLOW}🔧 Step 10: Setting up SSL (Let's Encrypt)...${NC}"
run_remote "apt-get install -y certbot python3-certbot-nginx || true"
run_remote "certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect || echo 'SSL certificate setup skipped (may already exist)'"

echo -e "${YELLOW}🔧 Step 11: Setting permissions...${NC}"
run_remote "chown -R www-data:www-data $DEPLOY_PATH"
run_remote "chmod -R 755 $DEPLOY_PATH"

echo -e "${YELLOW}🔧 Step 12: Creating log directories...${NC}"
run_remote "mkdir -p /var/log/pm2 /var/log/nginx"
run_remote "chmod -R 755 /var/log/pm2"

echo -e "${YELLOW}🔧 Step 13: Setting up environment file...${NC}"
echo -e "${YELLOW}   Creating .env file from env.example...${NC}"
run_remote "cd $DEPLOY_PATH/backend && if [ ! -f .env ]; then cp env.example .env; fi"
echo -e "${YELLOW}   ⚠️  IMPORTANT: Please update $DEPLOY_PATH/backend/.env with production values!${NC}"
echo -e "${YELLOW}   ⚠️  Especially: JWT_SECRET, ENCRYPTION_KEY, and all API keys!${NC}"

echo -e "${YELLOW}🔧 Step 14: Database migrations note...${NC}"
echo -e "${YELLOW}   Note: Database migrations will run automatically when the backend starts for the first time.${NC}"
echo -e "${YELLOW}   To run migrations manually: cd $DEPLOY_PATH/backend && npm run migrate${NC}"

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application should be available at: https://$DOMAIN${NC}"
echo -e "${YELLOW}📊 Check PM2 status: ssh $SERVER_USER@$SERVER_IP 'pm2 status'${NC}"
echo -e "${YELLOW}📋 Check PM2 logs: ssh $SERVER_USER@$SERVER_IP 'pm2 logs nefol-backend'${NC}"

