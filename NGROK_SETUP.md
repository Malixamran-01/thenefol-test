# Ngrok Configuration Guide

This guide explains how to configure ngrok so that your frontend and backend work correctly when accessed via ngrok.

## Problem

When accessing your frontend via ngrok (e.g., `https://subcontained-clelia-scorchingly.ngrok-free.dev`), images and products may not load because:
1. The frontend tries to call the backend API using localhost or local IP addresses
2. Images are served from the backend, which needs to be accessible via ngrok
3. CORS needs to allow the ngrok domain

## Solution

You need to set up **two separate ngrok tunnels**:

### Step 1: Set up Frontend Ngrok Tunnel

```bash
ngrok http 2001
```

This will give you a URL like: `https://subcontained-clelia-scorchingly.ngrok-free.dev`

### Step 2: Set up Backend Ngrok Tunnel

In a **separate terminal**, run:

```bash
ngrok http 2000
```

This will give you a **different** URL like: `https://your-backend-xxx.ngrok-free.dev`

### Step 3: Configure Frontend Environment

Create or update `user-panel/.env` file with:

```env
# Option 1: Set the full backend ngrok URL
VITE_API_URL=https://your-backend-xxx.ngrok-free.dev

# OR Option 2: Use the ngrok-specific variable
VITE_NGROK_BACKEND_URL=https://your-backend-xxx.ngrok-free.dev
```

**Important:** Replace `your-backend-xxx.ngrok-free.dev` with your actual backend ngrok URL from Step 2.

### Step 4: Configure Backend CORS (if needed)

The backend is already configured to allow all origins (`origin: true`), so it should work with ngrok automatically. However, if you want to be more specific, you can update `backend/.env`:

```env
CLIENT_ORIGIN=https://subcontained-clelia-scorchingly.ngrok-free.dev
```

### Step 5: Restart Services

After updating the `.env` file:

1. **Restart the frontend** (if running in dev mode, restart the dev server)
2. **Restart the backend** (if needed)

### Step 6: Rebuild Frontend (if using production build)

If you're using a production build, rebuild it after updating the `.env` file:

```bash
cd user-panel
npm run build
```

## How It Works

1. When you access the frontend via ngrok, the code detects the ngrok domain
2. It uses the `VITE_API_URL` or `VITE_NGROK_BACKEND_URL` to call the backend API
3. Images are served from the backend ngrok URL, so they load correctly
4. Products are fetched from the backend ngrok URL

## Troubleshooting

### Images still not loading?

1. Check that your backend ngrok tunnel is running
2. Verify `VITE_API_URL` or `VITE_NGROK_BACKEND_URL` is set correctly in `user-panel/.env`
3. Check browser console for errors
4. Verify backend is accessible: Open `https://your-backend-xxx.ngrok-free.dev/api/products` in browser

### Products not loading?

1. Check browser console for API errors
2. Verify backend ngrok URL is correct
3. Check that backend is running on port 2000
4. Verify CORS is allowing your frontend ngrok domain

### Still having issues?

1. Open browser DevTools (F12)
2. Check the Console tab for error messages
3. Check the Network tab to see which URLs are being called
4. Verify the API base URL is correct (should show in console logs)

## Alternative: Single Ngrok Tunnel (Advanced)

If you want to use a single ngrok tunnel for both frontend and backend, you'll need to configure ngrok with path-based routing. This is more complex and not recommended for most use cases.

## Quick Setup Checklist

- [ ] Frontend ngrok tunnel running (port 2001)
- [ ] Backend ngrok tunnel running (port 2000)
- [ ] `user-panel/.env` file created/updated with backend ngrok URL
- [ ] Frontend restarted/rebuilt
- [ ] Backend running and accessible via ngrok
- [ ] Test: Open frontend ngrok URL and check if products/images load

