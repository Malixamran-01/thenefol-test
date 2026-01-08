# Environment File Switching Guide

## Overview
This setup allows you to switch between **production** and **test** environment variables without modifying the original production `.env` file.

## File Structure

- **`.env`** - Active environment file (used by the application)
- **`.env.test`** - Test environment credentials (Supabase, test API keys)
- **`.env.backup`** - Backup of production `.env` (created automatically)
- **`.env.production`** - Optional production file (if you want to keep it separate)

## How It Works

1. **Production `.env`** stays untouched (your original credentials)
2. **`.env.test`** contains test credentials (Supabase, test API keys)
3. **Switch script** copies the appropriate file to `.env` (the active file)

## Usage

### Switch to Test Environment
```bash
cd backend
npm run env:test
# or
node switch-env.js test
```

This will:
- Backup current `.env` to `.env.backup` (if it exists)
- Copy `.env.test` to `.env` (making it active)
- Now your app uses test credentials

### Switch to Production Environment
```bash
cd backend
npm run env:prod
# or
node switch-env.js prod
```

This will:
- Restore `.env` from `.env.backup` (production credentials)
- Now your app uses production credentials

### Development with Test Environment
```bash
npm run dev:test
```
This switches to test env and starts the dev server.

### Development with Production Environment
```bash
npm run dev:prod
```
This switches to production env and starts the dev server.

## Current Setup

✅ **Test Environment Active**
- Using Supabase test database
- Connection: `postgresql://postgres:UvI09HmgBBon89zk@db.hlfycrtaeaexydwaevrb.supabase.co:5432/nefol`

## Important Notes

### ✅ DO:
- Use `npm run env:test` before testing
- Use `npm run env:prod` before deploying to production
- Keep `.env.test` updated with test credentials
- Never commit `.env` files with real passwords

### ❌ DON'T:
- Manually edit `.env` (it gets overwritten by the switch script)
- Commit `.env`, `.env.test`, or `.env.backup` to Git
- Use production credentials in `.env.test`

## File Status

- ✅ `.env` - Currently using TEST environment
- ✅ `.env.test` - Contains test credentials
- ✅ `.env.backup` - Contains production credentials (backup)

## Quick Commands

```bash
# Switch to test
npm run env:test

# Switch to production  
npm run env:prod

# Start dev server with test env
npm run dev:test

# Start dev server with production env
npm run dev:prod
```

## For Deployment

When deploying to Railway/Vercel/etc., **don't use .env files**. Instead:
- Set environment variables directly in the platform dashboard
- Use the connection string from `.env.test` as reference
- Never commit actual passwords to Git


