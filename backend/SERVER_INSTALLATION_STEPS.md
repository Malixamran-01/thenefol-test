# Server Installation Steps - Password Reset System

## Issue
The server is showing `Error: Cannot find module 'bcrypt'` because the `bcrypt` package needs to be installed.

## Solution

### Option 1: Install bcrypt directly on server (Quick Fix)

Run these commands on your server:

```bash
cd /var/www/nefol/backend
npm install bcrypt
pm2 restart nefol-backend
```

### Option 2: Pull updated package.json and install (Recommended)

If you've pushed the updated `package.json` to git:

```bash
cd /var/www/nefol
git pull
cd backend
npm install
pm2 restart nefol-backend
```

## Verify Installation

After installing, check if bcrypt is installed:

```bash
cd /var/www/nefol/backend
npm list bcrypt
```

You should see `bcrypt@5.1.1` in the output.

## Check Logs

After restarting, verify the backend starts without errors:

```bash
pm2 logs nefol-backend --lines 20
```

You should see:
- ✅ Server running on port 2000
- ✅ No "Cannot find module 'bcrypt'" errors

## Test Password Reset

Once bcrypt is installed, test the password reset endpoints:

1. **Forgot Password:**
   ```bash
   curl -X POST https://thenefol.com/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com"}'
   ```

2. **Check email for reset link**

3. **Reset Password:**
   ```bash
   curl -X POST https://thenefol.com/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{
       "email":"user@example.com",
       "token":"token_from_email",
       "newPassword":"NewSecurePass123"
     }'
   ```

## Notes

- `bcrypt` is a native module and may require compilation
- Installation may take 1-2 minutes
- If installation fails, you may need to install build tools:
  ```bash
  sudo apt-get update
  sudo apt-get install -y build-essential python3
  ```

