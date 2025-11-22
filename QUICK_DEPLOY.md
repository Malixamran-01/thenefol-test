# Quick Deployment Reference

## Fastest Way to Deploy

### 1. Build and Test Locally
```powershell
.\deploy.ps1 -BuildOnly
```

### 2. Deploy to Server
```powershell
.\deploy.ps1 -ServerHost "your-server.com" -ServerUser "username"
```

### 3. Or Use Batch File (Windows)
```cmd
deploy.bat -ServerHost "your-server.com" -ServerUser "username"
```

## Common Commands

| Task | Command |
|------|---------|
| Build only | `.\deploy.ps1 -BuildOnly` |
| Deploy all | `.\deploy.ps1 -ServerHost "server" -ServerUser "user"` |
| Deploy backend only | `.\deploy.ps1 -ServerHost "server" -ServerUser "user" -UploadAdmin:$false -UploadUser:$false` |
| Manual upload | `.\deploy.ps1 -DeployMethod "manual"` |
| Skip build | `.\deploy.ps1 -SkipBuild -ServerHost "server" -ServerUser "user"` |

## What Gets Deployed

- ✅ **Backend**: `dist/`, `package.json`, `uploads/`, `env.example`
- ✅ **Admin Panel**: `dist/`, `env.example`
- ✅ **User Panel**: `dist/`, `env.example`
- ❌ **Excluded**: `node_modules/`, source files, `.git/`

## After Deployment

1. SSH to server: `ssh user@server`
2. Install backend dependencies: `cd /var/www/nefol/backend && npm install --production`
3. Configure `.env` files
4. Start backend: `npm start` or use PM2
5. Configure Nginx for frontend

## Need Help?

See `DEPLOYMENT_README.md` for detailed instructions.

