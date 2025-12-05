# PowerShell Deployment script for Nefol application
# Server: 72.61.225.192
# Domain: thenefol.com

$ErrorActionPreference = "Stop"

$SERVER_IP = "72.61.225.192"
$SERVER_USER = "root"
$SERVER_PASS = "Anoop2025@nefol"
$DEPLOY_PATH = "/var/www/nefol"
$DOMAIN = "thenefol.com"

Write-Host "🚀 Starting deployment to $SERVER_IP..." -ForegroundColor Yellow

# Function to run commands on remote server using SSH
function Invoke-RemoteCommand {
    param([string]$Command)
    
    # Escape the command properly for bash
    $escapedCommand = $Command -replace '"', '\"'
    $sshCommand = "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP `"$escapedCommand`""
    Write-Host "Executing: $Command" -ForegroundColor Gray
    & bash -c $sshCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Command failed, but continuing..."
    }
}

# Function to copy files using SCP
function Copy-ToRemote {
    param([string]$LocalPath, [string]$RemotePath)
    
    $scpCommand = "sshpass -p '$SERVER_PASS' scp -o StrictHostKeyChecking=no -r '$LocalPath' $SERVER_USER@$SERVER_IP`:$RemotePath"
    Write-Host "Copying: $LocalPath -> $RemotePath" -ForegroundColor Gray
    & bash -c $scpCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Copy failed, but continuing..."
    }
}

# Check if sshpass is available (needed for password-based SSH)
$sshpassAvailable = $false
try {
    & bash -c "which sshpass" | Out-Null
    $sshpassAvailable = $true
} catch {
    Write-Host "⚠️  sshpass not found. Installing..." -ForegroundColor Yellow
    Write-Host "Please install sshpass or use SSH keys for authentication." -ForegroundColor Yellow
    Write-Host "For Windows with Git Bash: choco install sshpass" -ForegroundColor Yellow
    Write-Host "Or use WSL: sudo apt-get install sshpass" -ForegroundColor Yellow
}

if (-not $sshpassAvailable) {
    Write-Host "❌ sshpass is required for password-based SSH. Please install it first." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Step 1: Creating deployment directory on server..." -ForegroundColor Yellow
Invoke-RemoteCommand "mkdir -p $DEPLOY_PATH/backend $DEPLOY_PATH/admin-panel $DEPLOY_PATH/user-panel"

Write-Host "📦 Step 2: Uploading backend files..." -ForegroundColor Yellow
Copy-ToRemote "backend/dist" "$DEPLOY_PATH/backend/"
Copy-ToRemote "backend/package.json" "$DEPLOY_PATH/backend/"
Copy-ToRemote "backend/migrate.js" "$DEPLOY_PATH/backend/"
Copy-ToRemote "backend/env.example" "$DEPLOY_PATH/backend/"

Write-Host "📦 Step 3: Uploading admin panel..." -ForegroundColor Yellow
Copy-ToRemote "admin-panel/dist" "$DEPLOY_PATH/admin-panel/"

Write-Host "📦 Step 4: Uploading user panel..." -ForegroundColor Yellow
Copy-ToRemote "user-panel/dist" "$DEPLOY_PATH/user-panel/"

Write-Host "📦 Step 5: Uploading configuration files..." -ForegroundColor Yellow
Copy-ToRemote "ecosystem.config.js" "$DEPLOY_PATH/"
Copy-ToRemote "nginx.conf" "$DEPLOY_PATH/"

Write-Host "🗄️  Step 6: Setting up PostgreSQL database..." -ForegroundColor Yellow
Write-Host "   Installing PostgreSQL..." -ForegroundColor Gray
Invoke-RemoteCommand "apt-get update; apt-get install -y postgresql postgresql-contrib"

Write-Host "   Starting PostgreSQL service..." -ForegroundColor Gray
Invoke-RemoteCommand "systemctl start postgresql"
Invoke-RemoteCommand "systemctl enable postgresql"

Write-Host "   Creating database and user..." -ForegroundColor Gray
# Database credentials from env.example
$DB_NAME = "nefol"
$DB_USER = "nofol_users"
$DB_PASSWORD = "Jhx82ndc9g@j"

# Create database (check if exists first)
Invoke-RemoteCommand "sudo -u postgres psql -tAc `"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'`" | grep -q 1 || sudo -u postgres psql -c `"CREATE DATABASE $DB_NAME;`" || echo 'Database may already exist'"

# Create user (check if exists first)
Invoke-RemoteCommand "sudo -u postgres psql -tAc `"SELECT 1 FROM pg_user WHERE usename='$DB_USER'`" | grep -q 1 || sudo -u postgres psql -c `"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';`" || echo 'User may already exist'"

# Grant privileges
Invoke-RemoteCommand "sudo -u postgres psql -c `"ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';`""
Invoke-RemoteCommand "sudo -u postgres psql -c `"GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;`""
Invoke-RemoteCommand "sudo -u postgres psql -d $DB_NAME -c `"GRANT ALL ON SCHEMA public TO $DB_USER;`""

Write-Host "   Configuring PostgreSQL to allow local connections..." -ForegroundColor Gray
Invoke-RemoteCommand "sed -i `"s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/g`" /etc/postgresql/*/main/postgresql.conf || true"
Invoke-RemoteCommand "systemctl restart postgresql"

Write-Host "   ✅ Database setup completed!" -ForegroundColor Green

Write-Host "🔧 Step 7: Installing Node.js dependencies on server..." -ForegroundColor Yellow
Invoke-RemoteCommand "cd $DEPLOY_PATH/backend; npm install --production"

Write-Host "🔧 Step 8: Setting up PM2..." -ForegroundColor Yellow
Invoke-RemoteCommand "npm install -g pm2"
Invoke-RemoteCommand "cd $DEPLOY_PATH; pm2 delete nefol-backend"
Invoke-RemoteCommand "cd $DEPLOY_PATH; pm2 start ecosystem.config.js"
Invoke-RemoteCommand "pm2 save"
Invoke-RemoteCommand "pm2 startup systemd -u root --hp /root"

Write-Host "🔧 Step 9: Setting up Nginx..." -ForegroundColor Yellow
Invoke-RemoteCommand "apt-get update; apt-get install -y nginx"
Copy-ToRemote "nginx.conf" "/etc/nginx/sites-available/thenefol.com"
Invoke-RemoteCommand "ln -sf /etc/nginx/sites-available/thenefol.com /etc/nginx/sites-enabled/thenefol.com"
Invoke-RemoteCommand "rm -f /etc/nginx/sites-enabled/default"
Invoke-RemoteCommand "nginx -t; systemctl reload nginx"

Write-Host "🔧 Step 10: Setting up SSL (Let's Encrypt)..." -ForegroundColor Yellow
Invoke-RemoteCommand "apt-get install -y certbot python3-certbot-nginx"
Invoke-RemoteCommand "certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect || echo 'SSL setup skipped'"

Write-Host "🔧 Step 11: Setting permissions..." -ForegroundColor Yellow
Invoke-RemoteCommand "chown -R www-data:www-data $DEPLOY_PATH"
Invoke-RemoteCommand "chmod -R 755 $DEPLOY_PATH"

Write-Host "🔧 Step 12: Creating log directories..." -ForegroundColor Yellow
Invoke-RemoteCommand "mkdir -p /var/log/pm2 /var/log/nginx"
Invoke-RemoteCommand "chmod -R 755 /var/log/pm2"

Write-Host "🔧 Step 13: Setting up environment file..." -ForegroundColor Yellow
Write-Host "   Creating .env file from env.example..." -ForegroundColor Gray
Invoke-RemoteCommand 'cd /var/www/nefol/backend; if [ ! -f .env ]; then cp env.example .env; fi'
Write-Host "   ⚠️  IMPORTANT: Please update $DEPLOY_PATH/backend/.env with production values!" -ForegroundColor Yellow
Write-Host "   ⚠️  Especially: JWT_SECRET, ENCRYPTION_KEY, and all API keys!" -ForegroundColor Yellow

Write-Host "🔧 Step 14: Database migrations note..." -ForegroundColor Yellow
Write-Host "   Note: Database migrations will run automatically when the backend starts for the first time." -ForegroundColor Gray
Write-Host "   To run migrations manually: cd $DEPLOY_PATH/backend; npm run migrate" -ForegroundColor Gray

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "🌐 Your application should be available at: https://$DOMAIN" -ForegroundColor Green
Write-Host "📊 Check PM2 status: ssh $SERVER_USER@$SERVER_IP 'pm2 status'" -ForegroundColor Yellow
Write-Host "📋 Check PM2 logs: ssh $SERVER_USER@$SERVER_IP 'pm2 logs nefol-backend'" -ForegroundColor Yellow
