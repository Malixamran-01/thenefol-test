# Deployment Guide for Nefol

## ⚠️ IMPORTANT: Proper Deployment Process

### The Problem
- `dist` folders are gitignored and NOT pushed to Git
- Pushing source code changes to Git does NOT deploy them to production
- You must build locally and deploy using the deployment script

### Correct Deployment Steps

#### 1. Build All Projects Locally

```powershell
# Build Admin Panel
cd admin-panel
npm run build

# Build User Panel  
cd ../user-panel
npm run build

# Build Backend
cd ../backend
npm run build
```

#### 2. Run the Deployment Script

**On Windows (PowerShell):**
```powershell
cd C:\Users\Malik\Desktop\Nefoltest\thenefol
.\deploy.ps1
```

**On Linux/Mac/WSL:**
```bash
cd /path/to/thenefol
./deploy.sh
```

#### 3. Clear Browser Cache
After deployment, clear your browser cache or use:
- **Hard Refresh**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- **Incognito/Private Window**: Test in a fresh browser session

#### 4. Verify Deployment
Check if the server received the files:
```powershell
ssh root@72.61.225.192
cd /var/www/nefol
ls -la admin-panel/dist/assets/
# Check the timestamps to verify files were updated
```

### Alternative: Manual Deployment (Not Recommended)

If deployment script fails, you can manually:

1. **Build locally** (as above)
2. **Copy files via SFTP/SCP**:
   ```powershell
   scp -r admin-panel/dist root@72.61.225.192:/var/www/nefol/admin-panel/
   scp -r user-panel/dist root@72.61.225.192:/var/www/nefol/user-panel/
   scp -r backend/dist root@72.61.225.192:/var/www/nefol/backend/
   ```

3. **Restart services on server**:
   ```bash
   ssh root@72.61.225.192
   pm2 restart nefol-backend
   systemctl reload nginx
   ```

### Common Issues & Fixes

#### Issue 1: Changes Not Showing
**Causes:**
- Browser cache
- Old dist files deployed
- Nginx cache

**Fix:**
```bash
# On server
ssh root@72.61.225.192
# Clear Nginx cache if enabled
rm -rf /var/cache/nginx/*
systemctl reload nginx
# Then clear browser cache
```

#### Issue 2: Build Failed
**Causes:**
- TypeScript errors
- Missing dependencies

**Fix:**
```powershell
# Check for errors
cd admin-panel
npm run build

# If errors, fix them in the source code
# Then rebuild
```

#### Issue 3: Deployment Script Failed
**Causes:**
- Missing sshpass
- Network issues
- Server permissions

**Fix:**
```powershell
# Install sshpass (Windows with Git Bash or WSL)
choco install sshpass
# OR in WSL:
sudo apt-get install sshpass

# Then retry deployment
.\deploy.ps1
```

### File Change Verification

To verify a specific file changed:

1. **Check local build**:
   ```powershell
   # Check file hash before changes
   Get-FileHash admin-panel\dist\assets\index-*.js
   
   # Make changes, rebuild
   cd admin-panel
   npm run build
   
   # Check hash again - should be different
   Get-FileHash admin-panel\dist\assets\index-*.js
   ```

2. **Check server after deployment**:
   ```bash
   ssh root@72.61.225.192
   ls -lh /var/www/nefol/admin-panel/dist/assets/
   # Verify timestamp is recent
   ```

### Quick Deploy Command (All-in-One)

Create this helper script `quick-deploy.ps1`:

```powershell
Write-Host "🔨 Building all projects..." -ForegroundColor Yellow

# Build admin panel
cd admin-panel
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Admin panel build failed"; exit 1 }

# Build user panel
cd ../user-panel
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "User panel build failed"; exit 1 }

# Build backend
cd ../backend
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Backend build failed"; exit 1 }

cd ..

Write-Host "✅ All builds completed!" -ForegroundColor Green
Write-Host "🚀 Starting deployment..." -ForegroundColor Yellow

# Deploy
.\deploy.ps1

Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "🌐 Visit: https://thenefol.com" -ForegroundColor Cyan
Write-Host "💡 Remember to clear browser cache!" -ForegroundColor Yellow
```

Then just run:
```powershell
.\quick-deploy.ps1
```

## Summary

✅ **DO THIS**:
1. Make changes to source files
2. Build ALL projects locally (`npm run build`)
3. Run deployment script (`.\deploy.ps1`)
4. Clear browser cache
5. Verify changes on website

❌ **DON'T DO THIS**:
1. Push to Git and expect changes to appear
2. Only build some projects
3. Skip clearing browser cache
4. Manually copy source files to server

---

**Current File Status:**
- `FacebookInstagram.tsx` - Modified source file ✓
- Needs: Build → Deploy → Cache Clear
