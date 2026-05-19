# Hostinger VPS: keep uploaded images after reset / redeploy

## Why images disappear

Uploads were stored under the **app deploy folder** (e.g. `/var/www/nefol/uploads-data`). That folder is fine for:

- `pm2 restart`
- pushing new backend code

It is **not** safe when:

- Hostinger **rebuilds** the VPS or restores a clean image
- you redeploy by replacing the whole `/var/www/nefol` tree
- the provider wipes ephemeral disk on certain plan events

The database (Supabase) still has URLs like `/uploads/foo.webp`, but the **files on disk are gone**.

## Fix (one-time on the server)

SSH into the VPS and run:

```bash
# 1. Persistent directory (outside /var/www/nefol)
sudo mkdir -p /var/lib/nefol/uploads/blog
sudo chmod -R 755 /var/lib/nefol

# 2. Copy existing uploads if you still have them
sudo rsync -a /var/www/nefol/uploads-data/ /var/lib/nefol/uploads/ 2>/dev/null || true

# 3. Tell the backend to use this path
cd /var/www/nefol/backend
grep -q '^UPLOADS_DIR=' .env || echo 'UPLOADS_DIR=/var/lib/nefol/uploads' >> .env
# Or edit .env manually:
#   UPLOADS_DIR=/var/lib/nefol/uploads

# 4. PM2 (ecosystem.config.js should also set UPLOADS_DIR — redeploy repo if needed)
cd /var/www/nefol
pm2 restart nefol-backend
pm2 save

# 5. Confirm in logs
pm2 logs nefol-backend --lines 30
# Look for: [uploads] Persistent storage root: /var/lib/nefol/uploads
```

After this, new uploads go to `/var/lib/nefol/uploads`. Redeploys that only replace `/var/www/nefol` **do not** delete that folder.

## Verify

```bash
ls -la /var/lib/nefol/uploads | head
curl -I https://thenefol.com/uploads/<some-known-filename>
```

## Desktop missing images but mobile OK

Often **not** lost uploads: nginx was serving `/IMAGES/` from `user-panel/IMAGES/` (empty) while product files live under `user-panel/dist/IMAGES/` (served by Node). Mobile may still show old **cached** images; desktop fetches fresh and gets 404.

**Fix:** use the updated `nginx.conf` that proxies `/IMAGES/` to the backend (same as `/uploads/`), then:

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -I "https://thenefol.com/IMAGES/NEFOL%20icon.png"
```

**If you still get `HTTP/2 404` but the response includes `Access-Control-Allow-Origin: *`:** nginx is proxying to Node, but the production `IMAGES/` tree is missing or incomplete on disk. Verify:

```bash
ls -la "/var/www/nefol/user-panel/dist/IMAGES/NEFOL icon.png"
curl -I "http://127.0.0.1:2000/IMAGES/NEFOL%20icon.png"
```

Restore your full `IMAGES/` folder on the VPS (it is not in git).

On desktop: hard refresh (Ctrl+Shift+R) or clear site data for thenefol.com.

## If the VPS was fully rebuilt

`/var/lib` may also be empty. Restore from:

1. A backup you took of `/var/lib/nefol/uploads`, or  
2. Re-uploading assets in admin, or  
3. (Recommended long-term) **object storage** — Supabase Storage, Cloudflare R2, or S3 — so files are not tied to the VPS disk.

## Hostinger “auto reset”

Common causes:

| Event | Effect |
|--------|--------|
| PM2 / Node restart | Files kept if `UPLOADS_DIR` is correct |
| Git deploy to `/var/www/nefol` | Files kept if uploads are **not** under that path |
| VPS rebuild / new OS / restore snapshot | **All local disk** may be wiped — use backups or cloud storage |
| Disk full | Writes fail; check `df -h` |

## Optional: backup cron

```bash
# Daily tarball of uploads (adjust path)
0 3 * * * tar -czf /root/backups/nefol-uploads-$(date +\%F).tar.gz -C /var/lib/nefol uploads
```

Keep at least a few days of backups off-server (S3, Google Drive, etc.).
