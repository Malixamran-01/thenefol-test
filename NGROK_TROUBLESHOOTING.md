# Ngrok Troubleshooting Guide

## Problem: `ngrok http 2000` disappears instantly

This usually happens because:
1. Ngrok is not installed or not in PATH
2. There's an error that's not visible
3. The command window closes before you can see the error

## Solutions

### Solution 1: Run ngrok from Command Prompt (not PowerShell)

1. Open **Command Prompt** (cmd.exe) instead of PowerShell
2. Navigate to your project directory
3. Run: `ngrok http 2000`

### Solution 2: Keep the window open to see errors

If using PowerShell, run:
```powershell
ngrok http 2000; pause
```

Or in Command Prompt:
```cmd
ngrok http 2000
pause
```

### Solution 3: Check if ngrok is installed

1. Open Command Prompt
2. Run: `ngrok version`
3. If you get an error, ngrok is not installed

### Solution 4: Install/Reinstall ngrok

1. Download ngrok from: https://ngrok.com/download
2. Extract the `ngrok.exe` file
3. Add it to your PATH or place it in a folder that's in your PATH
4. Or run ngrok with the full path: `C:\path\to\ngrok.exe http 2000`

### Solution 5: Use ngrok with explicit configuration

If ngrok requires authentication:

1. Sign up at https://dashboard.ngrok.com/signup
2. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken
3. Run: `ngrok config add-authtoken YOUR_AUTHTOKEN`
4. Then run: `ngrok http 2000`

### Solution 6: Check if port 2000 is accessible

Make sure your backend is running:
1. Check if backend is running: `netstat -ano | findstr :2000`
2. If you see "LISTENING", the backend is running
3. Test if backend responds: Open browser and go to `http://localhost:2000/api/products`

### Solution 7: Run ngrok in a persistent terminal

1. Open a new Command Prompt window
2. Navigate to your project: `cd C:\Users\rahul\Documents\atharv`
3. Run: `ngrok http 2000`
4. Keep this window open - don't close it
5. You should see ngrok output with the forwarding URL

### Solution 8: Check ngrok logs

If ngrok is running but you can't see output:
1. Check if ngrok created a log file
2. Look for errors in the ngrok output
3. Make sure you're running it from the correct directory

## Quick Test

Try this step-by-step:

1. **Open Command Prompt** (Win+R, type `cmd`, press Enter)

2. **Navigate to your project:**
   ```cmd
   cd C:\Users\rahul\Documents\atharv
   ```

3. **Check if backend is running:**
   ```cmd
   netstat -ano | findstr :2000
   ```
   You should see "LISTENING" - if not, start your backend first

4. **Run ngrok:**
   ```cmd
   ngrok http 2000
   ```

5. **You should see output like:**
   ```
   Session Status                online
   Account                       Your Account
   Version                       3.x.x
   Region                        United States (us)
   Forwarding                    https://xxxx-xxxx-xxxx.ngrok-free.dev -> http://localhost:2000
   ```

6. **Copy the "Forwarding" URL** (the https:// one) - this is your backend ngrok URL

7. **Update your frontend .env file:**
   Create or edit `user-panel/.env`:
   ```env
   VITE_API_URL=https://your-backend-ngrok-url.ngrok-free.dev
   ```

8. **Restart your frontend** dev server

## Alternative: Use ngrok web interface

If the command line doesn't work:

1. Go to https://dashboard.ngrok.com/
2. Sign in
3. Go to "Cloud Edge" → "Domains" or "Tunnels"
4. Create a tunnel pointing to `localhost:2000`
5. Use the provided URL

## Still having issues?

1. Make sure you're using **Command Prompt**, not PowerShell
2. Make sure the backend is running on port 2000
3. Check Windows Firewall isn't blocking ngrok
4. Try running ngrok as Administrator
5. Check ngrok's status page: https://status.ngrok.com/

