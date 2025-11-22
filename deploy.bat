@echo off
REM Nefol Deployment Script Wrapper
REM This batch file makes it easier to run the PowerShell deployment script

echo ========================================
echo    Nefol Deployment Script
echo ========================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if deploy.ps1 exists
if not exist "deploy.ps1" (
    echo ERROR: deploy.ps1 not found in current directory
    pause
    exit /b 1
)

echo Starting deployment...
echo.

REM Run PowerShell script with bypass execution policy
powershell -ExecutionPolicy Bypass -File "deploy.ps1" %*

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo    Deployment completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo    Deployment failed!
    echo ========================================
)

pause

