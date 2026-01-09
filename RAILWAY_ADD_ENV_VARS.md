# How to Add Environment Variables in Railway

## Step-by-Step Guide

### Step 1: Open Your Project
1. On the Railway dashboard, you should see your project card: **"helpful-mindfulness"**
2. **Click on the project card** (the dark rectangle with "helpful-mindfulness" and "1 service")

### Step 2: Find Your Service
1. After clicking the project, you'll see the project dashboard
2. You should see your backend service listed (might be named "backend" or similar)
3. **Click on the service name** to open it

### Step 3: Add Environment Variables
1. Once inside your service, look for tabs at the top:
   - **Variables** (this is what you need)
   - **Settings**
   - **Deployments**
   - **Metrics**
   - **Logs**

2. Click on the **"Variables"** tab

3. Click the **"+ New Variable"** button

4. Add your first variable:
   - **Name:** `DATABASE_URL`
   - **Value:** `postgresql://postgres.gtrthvbtphivkflkhrmc:DMTNmA3kRZuBdFI6@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`
   - Click **"Add"**

5. Add other required variables:
   - `PORT` = `2000` (or leave default)
   - `HOST` = `0.0.0.0`
   - `NODE_ENV` = `production`

### Step 4: Redeploy
- After adding variables, Railway will automatically redeploy
- Or go to **Deployments** tab and click **"Redeploy"**

## Alternative: Quick Access
If you can't find the service:
1. Click on **"helpful-mindfulness"** project
2. Look for a list of services on the left sidebar or main area
3. Click on your backend service
4. Then go to **Variables** tab

## Visual Guide
```
Railway Dashboard
  └─ Projects
      └─ helpful-mindfulness (CLICK HERE)
          └─ Services
              └─ Your Backend Service (CLICK HERE)
                  └─ Variables Tab (CLICK HERE)
                      └─ + New Variable
```

## Need Help?
If you still can't find it:
1. Check if you're logged into the correct Railway account
2. Make sure the project "helpful-mindfulness" is the right one
3. The service might be named differently - look for any service in that project

