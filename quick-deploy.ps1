# Quick Deploy Script for Nefol
# Builds all projects and deploys them to production

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         🚀 NEFOL QUICK DEPLOYMENT SCRIPT 🚀          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get starting directory
$rootDir = Get-Location

# Function to build a project
function Build-Project {
    param(
        [string]$ProjectName,
        [string]$ProjectPath
    )
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "🔨 Building $ProjectName..." -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    Set-Location $ProjectPath
    
    # Check if node_modules exists
    if (!(Test-Path "node_modules")) {
        Write-Host "📦 Installing dependencies for $ProjectName..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install dependencies for $ProjectName" -ForegroundColor Red
            Set-Location $rootDir
            exit 1
        }
    }
    
    # Run build
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ $ProjectName build failed!" -ForegroundColor Red
        Set-Location $rootDir
        exit 1
    }
    
    Write-Host "✅ $ProjectName build completed!" -ForegroundColor Green
    Write-Host ""
    
    Set-Location $rootDir
}

# Build all projects
try {
    # Build Admin Panel
    Build-Project "Admin Panel" "admin-panel"
    
    # Build User Panel
    Build-Project "User Panel" "user-panel"
    
    # Build Backend
    Build-Project "Backend" "backend"
    
    Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║            ✅ ALL BUILDS COMPLETED! ✅                ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    # Ask user if they want to deploy
    $deploy = Read-Host "Do you want to deploy to production now? (y/n)"
    
    if ($deploy -eq 'y' -or $deploy -eq 'Y') {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "🚀 Starting deployment to production..." -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        
        # Check if deploy script exists
        if (Test-Path "deploy.ps1") {
            & .\deploy.ps1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
                Write-Host "║          🎉 DEPLOYMENT SUCCESSFUL! 🎉                ║" -ForegroundColor Green
                Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
                Write-Host ""
                Write-Host "🌐 Website: https://thenefol.com" -ForegroundColor Cyan
                Write-Host "💡 Remember to clear your browser cache (Ctrl+Shift+R)!" -ForegroundColor Yellow
                Write-Host ""
            } else {
                Write-Host "⚠️  Deployment completed with warnings. Please check logs." -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ deploy.ps1 not found! Please deploy manually." -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "📦 Builds completed. Deployment skipped." -ForegroundColor Yellow
        Write-Host "💡 Run '.\deploy.ps1' when ready to deploy." -ForegroundColor Cyan
        Write-Host ""
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ An error occurred: $_" -ForegroundColor Red
    Set-Location $rootDir
    exit 1
}
