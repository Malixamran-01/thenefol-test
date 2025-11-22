# Nefol Deployment Guide

This guide explains how to deploy the Nefol application to a server using the PowerShell deployment script.

## Prerequisites

1. **PowerShell** (Windows PowerShell 5.1+ or PowerShell Core)
2. **Node.js and npm** installed
3. **OpenSSH Client** (for SCP/SFTP uploads) - Usually pre-installed on Windows 10+
4. **SSH access** to your server
5. **Server requirements:**
   - Node.js 18+ installed
   - PostgreSQL database
   - Nginx or similar web server (for serving frontend)

## Quick Start

### 1. Configure Server Details

Edit `deploy-config.json` or use command-line parameters:

```powershell
.\deploy.ps1 -ServerHost "your-server.com" -ServerUser "username" -ServerPath "/var/www/nefol"
```

### 2. Build Only (Test Build)

Test the build process without uploading:

```powershell
.\deploy.ps1 -BuildOnly
```

### 3. Full Deployment

Deploy everything to the server:

```powershell
.\deploy.ps1 -ServerHost "your-server.com" -ServerUser "username"
```

### 4. Deploy Specific Components

Deploy only backend:

```powershell
.\deploy.ps1 -ServerHost "your-server.com" -ServerUser "username" -UploadAdmin:$false -UploadUser:$false
```

## Script Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-ServerHost` | Server IP or domain | Required for upload |
| `-ServerUser` | SSH username | Required for upload |
| `-ServerPath` | Remote deployment path | `/var/www/nefol` |
| `-DeployMethod` | Upload method: `scp`, `sftp`, or `manual` | `scp` |
| `-BuildOnly` | Build only, don't upload | `false` |
| `-SkipBuild` | Skip build, upload existing dist | `false` |
| `-UploadBackend` | Include backend in deployment | `true` |
| `-UploadAdmin` | Include admin panel in deployment | `true` |
| `-UploadUser` | Include user panel in deployment | `true` |

## Deployment Methods

### Method 1: SCP (Recommended)

Uses `scp` command for secure file transfer:

```powershell
.\deploy.ps1 -ServerHost "192.168.1.100" -ServerUser "deploy" -DeployMethod "scp"
```

### Method 2: SFTP

Uses `sftp` command:

```powershell
.\deploy.ps1 -ServerHost "192.168.1.100" -ServerUser "deploy" -DeployMethod "sftp"
```

### Method 3: Manual Upload

Creates deployment package for manual upload:

```powershell
.\deploy.ps1 -DeployMethod "manual"
```

Then manually upload the `deploy-temp` folder to your server.

## Server Setup

### 1. Backend Setup

After uploading, SSH into your server:

```bash
cd /var/www/nefol/backend
npm install --production
cp env.example .env
# Edit .env with your configuration
npm start
```

Or use PM2 for process management:

```bash
npm install -g pm2
pm2 start dist/index.js --name nefol-backend
pm2 save
pm2 startup
```

### 2. Frontend Setup (Nginx)

Configure Nginx to serve the frontend applications:

**Admin Panel:**
```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;
    root /var/www/nefol/admin-panel/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**User Panel:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/nefol/user-panel/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Backend API:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:2000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Environment Configuration

**Backend `.env` file:**
- Copy `backend/env.example` to `backend/.env`
- Configure database connection
- Add API keys (Razorpay, WhatsApp, etc.)
- Set CORS origins

**Frontend `.env` files:**
- Update `VITE_API_URL` in admin-panel and user-panel
- Point to your backend API URL

## Troubleshooting

### Build Fails

1. Check Node.js version: `node --version` (should be 18+)
2. Clear node_modules and reinstall:
   ```powershell
   npm run clean
   npm install
   ```

### Upload Fails

1. **SSH Connection:**
   - Test SSH connection: `ssh username@server-host`
   - Ensure SSH keys are set up or password authentication is enabled

2. **SCP/SFTP Not Found:**
   - Install OpenSSH Client (Windows Settings > Apps > Optional Features)
   - Or use manual deployment method

3. **Permission Errors:**
   - Ensure user has write permissions to server path
   - Check server path exists: `ssh user@host "mkdir -p /var/www/nefol"`

### Server Issues

1. **Backend won't start:**
   - Check Node.js version on server
   - Verify database connection
   - Check `.env` file configuration
   - Review server logs

2. **Frontend not loading:**
   - Verify Nginx configuration
   - Check file permissions
   - Ensure dist folder exists

## File Structure After Deployment

```
/var/www/nefol/
├── backend/
│   ├── dist/           # Compiled backend code
│   ├── uploads/        # Uploaded files
│   ├── package.json
│   └── .env           # Server configuration
├── admin-panel/
│   └── dist/          # Built admin panel
└── user-panel/
    └── dist/          # Built user panel
```

## Security Notes

1. **Never commit `.env` files** - They contain sensitive information
2. **Use SSH keys** instead of passwords for server access
3. **Set proper file permissions** on the server
4. **Use HTTPS** in production (configure SSL certificates)
5. **Keep dependencies updated** regularly

## Advanced Usage

### Custom Build Commands

If you need custom build commands, edit the script's `Build-Project` function calls.

### Excluding Files

The script automatically excludes:
- `node_modules`
- Source files (only dist is uploaded)
- `.git` folders
- Development files

### CI/CD Integration

You can integrate this script into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Deploy
  run: |
    powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -ServerHost ${{ secrets.SERVER_HOST }} -ServerUser ${{ secrets.SERVER_USER }}
```

## Support

For issues or questions:
1. Check the deployment instructions in `deploy-temp/DEPLOYMENT_INSTRUCTIONS.md`
2. Review server logs
3. Verify all prerequisites are met

