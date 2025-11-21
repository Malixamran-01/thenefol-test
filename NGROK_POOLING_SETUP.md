# Ngrok Pooling Setup Guide

## What is Pooling?

Pooling allows multiple ngrok tunnels to share the same endpoint URL. This is useful when you want to use the same domain for both frontend and backend, or for load balancing.

## ⚠️ Important Note

**Pooling is typically used for load balancing multiple instances of the SAME service**, not for routing different services (frontend vs backend) to the same URL.

For your use case (frontend on 2001, backend on 2000), you have two options:

### Option 1: Use Pooling (Same URL, but requires routing logic)
- Both tunnels use the same ngrok URL
- You'll need to configure your frontend to route `/api/*` requests to the backend
- More complex setup

### Option 2: Separate URLs (Recommended - Simpler)
- Frontend: `https://subcontained-clelia-scorchingly.ngrok-free.dev` → port 2001
- Backend: `https://different-url.ngrok-free.dev` → port 2000
- Configure `VITE_API_URL` in frontend `.env` file
- **This is the recommended approach** (what we set up earlier)

## If You Still Want to Use Pooling

### Step 1: Stop Current Frontend Ngrok Tunnel

1. Go to the window where frontend ngrok is running
2. Press `Ctrl+C` to stop it

### Step 2: Start Frontend with Pooling

**Option A: Use the batch file**
1. Double-click `start-ngrok-frontend.bat`

**Option B: Manual command**
```cmd
ngrok http 2001 --pooling-enabled
```

### Step 3: Start Backend with Pooling

**Option A: Use the batch file**
1. Double-click `start-ngrok-backend.bat`

**Option B: Manual command**
```cmd
ngrok http 2000 --pooling-enabled
```

### Step 4: Configure Frontend

Since both will use the same URL, you need to configure your frontend to use the same domain:

1. Create or edit `user-panel/.env`:
   ```env
   VITE_API_URL=https://subcontained-clelia-scorchingly.ngrok-free.dev
   ```

2. The frontend will call APIs on the same domain, and ngrok will route them to the backend tunnel

### Step 5: Test

1. Open: `https://subcontained-clelia-scorchingly.ngrok-free.dev`
2. Check if products and images load
3. Check browser console for any routing issues

## ⚠️ Potential Issues with Pooling

1. **Routing conflicts**: Ngrok might route requests to the wrong service
2. **Load balancing**: Requests might be randomly distributed between frontend and backend
3. **WebSocket issues**: Socket connections might not work correctly
4. **CORS**: May need additional CORS configuration

## Recommendation

**I recommend using separate ngrok URLs** (Option 2) because:
- ✅ Clearer separation of concerns
- ✅ No routing conflicts
- ✅ Easier to debug
- ✅ More reliable
- ✅ Standard practice

If you want to proceed with separate URLs (recommended), just:
1. Keep frontend ngrok running as is (port 2001)
2. Start backend ngrok in a new window: `ngrok http 2000` (without pooling)
3. Update `user-panel/.env` with the backend ngrok URL

## Quick Commands

**With Pooling (both use same URL):**
```cmd
# Terminal 1
ngrok http 2001 --pooling-enabled

# Terminal 2  
ngrok http 2000 --pooling-enabled
```

**Without Pooling (separate URLs - recommended):**
```cmd
# Terminal 1 (already running)
ngrok http 2001

# Terminal 2
ngrok http 2000
```

