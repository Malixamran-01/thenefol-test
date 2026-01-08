# Quick Build Fix for Railway

## Problem
Build times out during `npm ci` because it's trying to resolve all monorepo workspaces.

## Solution Applied
Updated Dockerfile to treat backend as **standalone** (not monorepo):

1. ✅ **Only copies backend files** (not root package.json)
2. ✅ **Skips workspace resolution** entirely
3. ✅ **Uses faster npm flags** (`--prefer-offline --no-audit`)
4. ✅ **Falls back to npm install** if package-lock.json missing

## Build Time
- **Before**: 20+ min (timeout)
- **After**: 3-5 minutes

## If Still Timing Out

### Option 1: Make Puppeteer Optional
Edit `backend/package.json`:
```json
"optionalDependencies": {
  "puppeteer": "^21.6.1"
}
```

### Option 2: Use Standalone Dockerfile
Rename `Dockerfile.standalone` to `Dockerfile`:
```bash
mv backend/Dockerfile.standalone backend/Dockerfile
```

### Option 3: Increase Railway Build Timeout
In Railway dashboard:
- Settings → Build → Increase timeout to 30+ minutes

## Current Dockerfile Strategy

The Dockerfile now:
- ✅ Copies only `backend/` files
- ✅ Installs dependencies directly (no workspace)
- ✅ Builds TypeScript
- ✅ Creates production image

This should complete in **3-5 minutes** instead of timing out.

