# Nefol Deployment Script
# This script builds and uploads the application to a server

param(
    [string]$ServerHost = "",
    [string]$ServerUser = "",
    [string]$ServerPath = "/var/www/nefol",
    [string]$DeployMethod = "scp",  # scp, sftp, or manual
    [switch]$BuildOnly = $false,
    [switch]$SkipBuild = $false,
    [switch]$UploadBackend = $true,
    [switch]$UploadAdmin = $true,
    [switch]$UploadUser = $true
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Info { Write-ColorOutput Cyan $args }
function Write-Warning { Write-ColorOutput Yellow $args }

# Check if required tools are installed
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Build function
function Build-Project {
    param(
        [string]$ProjectName,
        [string]$ProjectPath,
        [string]$BuildCommand
    )
    
    Write-Info "`n📦 Building $ProjectName..."
    
    Push-Location $ProjectPath
    
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Info "Installing dependencies for $ProjectName..."
            npm install
        }
        
        Write-Info "Running build command: $BuildCommand"
        Invoke-Expression $BuildCommand
        
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed for $ProjectName"
        }
        
        Write-Success "✅ $ProjectName built successfully"
    }
    catch {
        Write-Error "❌ Failed to build $ProjectName`: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

# Upload function using SCP
function Upload-SCP {
    param(
        [string]$LocalPath,
        [string]$RemotePath,
        [string]$Host,
        [string]$User
    )
    
    Write-Info "Uploading $LocalPath to $User@$Host:$RemotePath"
    
    if (-not (Test-Command "scp")) {
        Write-Error "SCP not found. Please install OpenSSH or use SFTP method."
        return $false
    }
    
    $scpCommand = "scp -r `"$LocalPath`" $User@${Host}:`"$RemotePath`""
    
    try {
        Invoke-Expression $scpCommand
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✅ Upload successful"
            return $true
        }
        else {
            Write-Error "❌ Upload failed"
            return $false
        }
    }
    catch {
        Write-Error "❌ Upload error: $_"
        return $false
    }
}

# Upload function using SFTP
function Upload-SFTP {
    param(
        [string]$LocalPath,
        [string]$RemotePath,
        [string]$Host,
        [string]$User
    )
    
    Write-Info "Uploading $LocalPath to $User@$Host:$RemotePath via SFTP"
    
    if (-not (Test-Command "sftp")) {
        Write-Error "SFTP not found. Please install OpenSSH."
        return $false
    }
    
    # Create temporary SFTP script
    $sftpScript = [System.IO.Path]::GetTempFileName()
    $sftpScriptContent = @"
cd $RemotePath
put -r $LocalPath
quit
"@
    $sftpScriptContent | Out-File -FilePath $sftpScript -Encoding ASCII
    
    try {
        $sftpCommand = "sftp -b `"$sftpScript`" $User@${Host}"
        Invoke-Expression $sftpCommand
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✅ Upload successful"
            return $true
        }
        else {
            Write-Error "❌ Upload failed"
            return $false
        }
    }
    catch {
        Write-Error "❌ Upload error: $_"
        return $false
    }
    finally {
        Remove-Item $sftpScript -ErrorAction SilentlyContinue
    }
}

# Main deployment function
function Start-Deployment {
    Write-Info "`n🚀 Starting Nefol Deployment Process`n"
    
    # Step 1: Build projects
    if (-not $SkipBuild) {
        Write-Info "`n═══════════════════════════════════════"
        Write-Info "STEP 1: Building Projects"
        Write-Info "═══════════════════════════════════════`n"
        
        # Build backend
        if ($UploadBackend) {
            Build-Project -ProjectName "Backend" -ProjectPath "backend" -BuildCommand "npm run build"
        }
        
        # Build admin panel
        if ($UploadAdmin) {
            Build-Project -ProjectName "Admin Panel" -ProjectPath "admin-panel" -BuildCommand "npm run build"
        }
        
        # Build user panel
        if ($UploadUser) {
            Build-Project -ProjectName "User Panel" -ProjectPath "user-panel" -BuildCommand "npm run build"
        }
    }
    else {
        Write-Warning "⏭️  Skipping build step"
    }
    
    # If build only, exit here
    if ($BuildOnly) {
        Write-Success "`n✅ Build complete. Exiting (build-only mode)."
        return
    }
    
    # Step 2: Prepare deployment package
    Write-Info "`n═══════════════════════════════════════"
    Write-Info "STEP 2: Preparing Deployment Package"
    Write-Info "═══════════════════════════════════════`n"
    
    $deployDir = "deploy-temp"
    if (Test-Path $deployDir) {
        Write-Info "Cleaning up previous deployment directory..."
        Remove-Item $deployDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $deployDir | Out-Null
    
    # Copy backend files
    if ($UploadBackend) {
        Write-Info "📁 Copying backend files..."
        $backendDeploy = Join-Path $deployDir "backend"
        New-Item -ItemType Directory -Path $backendDeploy | Out-Null
        
        # Copy dist folder
        if (Test-Path "backend/dist") {
            Copy-Item -Path "backend/dist" -Destination $backendDeploy -Recurse -Force
        }
        
        # Copy package.json
        Copy-Item -Path "backend/package.json" -Destination $backendDeploy -Force
        
        # Copy uploads directory if it exists
        if (Test-Path "backend/uploads") {
            Copy-Item -Path "backend/uploads" -Destination $backendDeploy -Recurse -Force
        }
        
        # Copy .env.example as reference
        if (Test-Path "backend/env.example") {
            Copy-Item -Path "backend/env.example" -Destination $backendDeploy -Force
        }
        
        Write-Success "✅ Backend files prepared"
    }
    
    # Copy admin panel files
    if ($UploadAdmin) {
        Write-Info "📁 Copying admin panel files..."
        $adminDeploy = Join-Path $deployDir "admin-panel"
        New-Item -ItemType Directory -Path $adminDeploy | Out-Null
        
        if (Test-Path "admin-panel/dist") {
            Copy-Item -Path "admin-panel/dist" -Destination $adminDeploy -Recurse -Force
        }
        
        if (Test-Path "admin-panel/env.example") {
            Copy-Item -Path "admin-panel/env.example" -Destination $adminDeploy -Force
        }
        
        Write-Success "✅ Admin panel files prepared"
    }
    
    # Copy user panel files
    if ($UploadUser) {
        Write-Info "📁 Copying user panel files..."
        $userDeploy = Join-Path $deployDir "user-panel"
        New-Item -ItemType Directory -Path $userDeploy | Out-Null
        
        if (Test-Path "user-panel/dist") {
            Copy-Item -Path "user-panel/dist" -Destination $userDeploy -Recurse -Force
        }
        
        if (Test-Path "user-panel/env.example") {
            Copy-Item -Path "user-panel/env.example" -Destination $userDeploy -Force
        }
        
        Write-Success "✅ User panel files prepared"
    }
    
    # Create deployment instructions file
    $instructions = @"
# Nefol Deployment Instructions

## Server Setup

1. **Backend Setup:**
   - Navigate to: $ServerPath/backend
   - Install dependencies: npm install --production
   - Create .env file from env.example
   - Configure database and API keys
   - Start server: npm start
   - Or use PM2: pm2 start dist/index.js --name nefol-backend

2. **Admin Panel Setup:**
   - Navigate to: $ServerPath/admin-panel
   - Serve static files using nginx or similar
   - Configure .env file if needed

3. **User Panel Setup:**
   - Navigate to: $ServerPath/user-panel
   - Serve static files using nginx or similar
   - Configure .env file if needed

## Nginx Configuration Example

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:2000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }
}

# Admin Panel
server {
    listen 80;
    server_name admin.yourdomain.com;
    root $ServerPath/admin-panel/dist;
    index index.html;
    
    location / {
        try_files `$uri `$uri/ /index.html;
    }
}

# User Panel
server {
    listen 80;
    server_name yourdomain.com;
    root $ServerPath/user-panel/dist;
    index index.html;
    
    location / {
        try_files `$uri `$uri/ /index.html;
    }
}
```

## Environment Variables

Make sure to configure:
- Database connection string
- API keys (Razorpay, WhatsApp, etc.)
- CORS origins
- Port numbers
"@
    
    $instructions | Out-File -FilePath (Join-Path $deployDir "DEPLOYMENT_INSTRUCTIONS.md") -Encoding UTF8
    
    Write-Success "✅ Deployment package prepared in $deployDir"
    
    # Step 3: Upload to server
    if ($DeployMethod -ne "manual") {
        if ([string]::IsNullOrEmpty($ServerHost) -or [string]::IsNullOrEmpty($ServerUser)) {
            Write-Warning "`n⚠️  Server host or user not specified. Skipping upload."
            Write-Info "`n📦 Deployment package ready in: $deployDir"
            Write-Info "You can manually upload this folder to your server."
            return
        }
        
        Write-Info "`n═══════════════════════════════════════"
        Write-Info "STEP 3: Uploading to Server"
        Write-Info "═══════════════════════════════════════`n"
        
        Write-Info "Server: $ServerUser@$ServerHost"
        Write-Info "Destination: $ServerPath`n"
        
        # Create remote directory structure
        Write-Info "Creating remote directory structure..."
        $sshCommand = "ssh $ServerUser@${ServerHost} `"mkdir -p $ServerPath`""
        Invoke-Expression $sshCommand
        
        # Upload files
        $uploadSuccess = $true
        
        if ($DeployMethod -eq "scp") {
            $uploadSuccess = Upload-SCP -LocalPath $deployDir -RemotePath $ServerPath -Host $ServerHost -User $ServerUser
        }
        elseif ($DeployMethod -eq "sftp") {
            $uploadSuccess = Upload-SFTP -LocalPath $deployDir -RemotePath $ServerPath -Host $ServerHost -User $ServerUser
        }
        
        if ($uploadSuccess) {
            Write-Success "`n✅ Deployment complete!"
            Write-Info "`n📋 Next steps:"
            Write-Info "1. SSH into your server: ssh $ServerUser@$ServerHost"
            Write-Info "2. Navigate to: cd $ServerPath"
            Write-Info "3. Follow the instructions in DEPLOYMENT_INSTRUCTIONS.md"
        }
        else {
            Write-Error "`n❌ Upload failed. Deployment package is available in: $deployDir"
        }
    }
    else {
        Write-Info "`n📦 Deployment package ready in: $deployDir"
        Write-Info "Upload this folder manually to: $ServerPath on your server"
    }
    
    # Cleanup option
    Write-Info "`n💡 Tip: You can delete the $deployDir folder after successful deployment"
}

# Run deployment
try {
    Start-Deployment
}
catch {
    Write-Error "`n❌ Deployment failed: $_"
    exit 1
}

