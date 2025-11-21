# Ngrok Setup - Current Status

## ✅ What You Have Now

**Frontend Ngrok Tunnel (Already Running):**
- URL: `https://subcontained-clelia-scorchingly.ngrok-free.dev`
- Points to: `http://localhost:2001` (your frontend)
- Status: ✅ Online

**Backend Ngrok Tunnel (Need to Start):**
- Need to create a NEW tunnel for port 2000
- Will get a DIFFERENT ngrok URL (e.g., `https://abc-xyz-123.ngrok-free.dev`)
- Points to: `http://localhost:2000` (your backend)

## 🚀 Quick Setup Steps

### Step 1: Start Backend Ngrok Tunnel

**Option A: Use the batch file (Easiest)**
1. Double-click `start-ngrok-backend.bat`
2. Keep the window open
3. Copy the `Forwarding` URL (the https:// one)

**Option B: Manual Command**
1. Open a **NEW** Command Prompt window (keep your frontend ngrok running)
2. Run: `ngrok http 2000`
3. You'll see output like:
   ```
   Forwarding  https://NEW-DIFFERENT-URL.ngrok-free.dev -> http://localhost:2000
   ```
4. Copy the `https://` URL - this is your backend ngrok URL

### Step 2: Configure Frontend

1. Create or edit `user-panel/.env` file:
   ```env
   VITE_API_URL=https://YOUR-BACKEND-NGROK-URL.ngrok-free.dev
   ```
   
   **Example:**
   ```env
   VITE_API_URL=https://abc-xyz-123.ngrok-free.dev
   ```

2. **Restart your frontend dev server** (if running):
   - Stop it (Ctrl+C)
   - Start it again: `npm run dev` or `npm start`

### Step 3: Test

1. Open your frontend ngrok URL: `https://subcontained-clelia-scorchingly.ngrok-free.dev`
2. Check browser console (F12) - you should see:
   ```
   🌐 Using API URL from VITE_API_URL: https://your-backend-url.ngrok-free.dev
   ```
3. Products and images should now load!

## 📋 Summary

You need **TWO separate ngrok tunnels running**:

1. **Frontend tunnel** (already running):
   - Port: 2001
   - URL: `https://subcontained-clelia-scorchingly.ngrok-free.dev`
   - Keep this running!

2. **Backend tunnel** (need to start):
   - Port: 2000
   - URL: Will be different (e.g., `https://abc-xyz-123.ngrok-free.dev`)
   - Run in a separate terminal window
   - Keep this running too!

## ⚠️ Important Notes

- **Keep BOTH ngrok windows open** - closing them will stop the tunnels
- Each tunnel gets a **different URL** - that's normal and expected
- The frontend URL and backend URL will be different
- Update `VITE_API_URL` in `user-panel/.env` with your backend ngrok URL
- Restart frontend after updating `.env` file

## 🔍 Troubleshooting

**If images still don't load:**
1. Check browser console for errors
2. Verify backend ngrok URL is correct in `.env`
3. Make sure backend is running: `netstat -ano | findstr :2000`
4. Test backend directly: Open `https://your-backend-ngrok-url.ngrok-free.dev/api/products` in browser

**If you see CORS errors:**
- Backend is already configured to allow all origins, so this shouldn't happen
- If it does, check backend is running and accessible

