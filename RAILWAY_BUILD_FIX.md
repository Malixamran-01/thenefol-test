# Railway Build Timeout Fix

## Problem
Railway is timing out because it's trying to install all workspaces (admin-panel, backend, common, user-panel) including Puppeteer dependencies.

## Solution
Use Dockerfile that only builds the backend workspace.

## Configuration

### Option 1: Deploy from Backend Directory (Recommended)
If Railway allows you to set the root directory:

1. **Set Root Directory**: `backend`
2. Railway will use `backend/Dockerfile`
3. Only backend dependencies will be installed

### Option 2: Use Root Dockerfile
If deploying from root:

1. Railway will use `backend/Dockerfile` (configured in `railway.json`)
2. Dockerfile handles monorepo structure
3. Only installs backend workspace

## Build Optimization

The Dockerfile now:
- ✅ Only installs `@nefol/backend` workspace
- ✅ Skips admin-panel, user-panel, common
- ✅ Minimal Puppeteer dependencies
- ✅ Multi-stage build (faster)

## Railway Settings

In Railway dashboard:
1. **Root Directory**: Set to `backend` (if available)
2. **Build Command**: Auto-detected from Dockerfile
3. **Start Command**: `npm start` (runs from backend directory)

## Alternative: Skip Puppeteer (If PDF not critical)

If PDF generation isn't critical, you can make Puppeteer optional:

```json
// backend/package.json
"optionalDependencies": {
  "puppeteer": "^21.6.1"
}
```

This will:
- Skip Puppeteer if installation fails
- PDF generation will fail gracefully
- Build will complete faster

## Build Time Comparison

| Method | Build Time |
|--------|-----------|
| All workspaces | 20+ min (timeout) |
| Backend only (Dockerfile) | 5-8 min |
| Backend without Puppeteer | 2-3 min |

## Next Steps

1. **Push updated files to GitHub**
2. **Redeploy on Railway**
3. **Monitor build logs** - Should complete in 5-8 minutes

If still timing out:
- Consider making Puppeteer optional
- Or use external PDF service (PDFShift, etc.)

