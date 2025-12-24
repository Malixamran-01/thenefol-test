# Install Puppeteer for Invoice PDF Generation

To fix the TypeScript build error, you need to install puppeteer in the backend directory.

## Steps:

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install puppeteer:
```bash
npm install puppeteer@^21.6.1
```

3. Verify installation:
```bash
npm list puppeteer
```

4. Try building again:
```bash
npm run build
```

## Alternative: Install from root (monorepo)

If the above doesn't work, try installing from the root:

```bash
npm install puppeteer@^21.6.1 --workspace=backend
```

## Note:

Puppeteer will download Chromium (~170MB) during installation. This is normal and required for PDF generation.

After installation, the invoice PDF email functionality will work automatically when orders are created.
