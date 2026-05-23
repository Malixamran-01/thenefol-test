#!/usr/bin/env bash
#
# One-time (or safe re-run) migration: move Nefol uploads off the deploy tree
# to durable storage so redeploys / VPS resets do not wipe product images.
#
# Correct persistent path:  /var/lib/nefol/uploads
# (NOT /var/www/lib — that is not used by this project.)
#
# Usage on VPS (as root or with sudo for mkdir/chown):
#   cd /var/www/nefol
#   chmod +x scripts/migrate-persistent-uploads.sh
#   sudo ./scripts/migrate-persistent-uploads.sh
#
# Options:
#   --dry-run     Show what would happen; do not copy or edit .env
#   --no-restart  Skip pm2 restart after migration
#   --clean       After successful migrate + verify, archive and remove legacy dirs
#
# Environment overrides (optional):
#   NEFOL_DEPLOY_ROOT=/var/www/nefol
#   NEFOL_UPLOADS_DIR=/var/lib/nefol/uploads
#   NEFOL_PM2_APP=nefol-backend
#   NEFOL_UPLOAD_OWNER=   # default: user running pm2, else $SUDO_USER, else whoami

set -euo pipefail

NEFOL_DEPLOY_ROOT="${NEFOL_DEPLOY_ROOT:-/var/www/nefol}"
NEFOL_UPLOADS_DIR="${NEFOL_UPLOADS_DIR:-/var/lib/nefol/uploads}"
NEFOL_PM2_APP="${NEFOL_PM2_APP:-nefol-backend}"
ENV_FILE="${NEFOL_DEPLOY_ROOT}/backend/.env"
BACKUP_DIR="${NEFOL_UPLOADS_DIR}/.migration-backups"

DRY_RUN=0
DO_RESTART=1
DO_CLEAN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-restart) DO_RESTART=0 ;;
    --clean) DO_CLEAN=1 ;;
    -h|--help)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

log() { printf '%s\n' "$*"; }
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    log "[dry-run] $*"
  else
    "$@"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }
}

require_cmd rsync
require_cmd find

# --- detect PM2 runtime user (who must own uploads for writes) ---
detect_upload_owner() {
  if [ -n "${NEFOL_UPLOAD_OWNER:-}" ]; then
    echo "$NEFOL_UPLOAD_OWNER"
    return
  fi
  if command -v pm2 >/dev/null 2>&1; then
    local uid
    uid="$(pm2 jlist 2>/dev/null | grep -o '"uid":[0-9]*' | head -1 | cut -d: -f2 || true)"
    if [ -n "$uid" ] && [ "$uid" != "0" ]; then
      id -un "$uid" 2>/dev/null && return
    fi
  fi
  if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
    echo "$SUDO_USER"
    return
  fi
  whoami
}

UPLOAD_OWNER="$(detect_upload_owner)"

# Legacy locations that may hold files (checked in order; all merged into persistent root)
LEGACY_SOURCES=(
  "${NEFOL_DEPLOY_ROOT}/uploads-data"
  "${NEFOL_DEPLOY_ROOT}/backend/uploads-data"
  "${NEFOL_DEPLOY_ROOT}/backend/uploads"
  "${NEFOL_DEPLOY_ROOT}/backend/dist/uploads"
)

count_files() {
  local dir="$1"
  if [ ! -d "$dir" ]; then
    echo 0
    return
  fi
  find "$dir" -type f 2>/dev/null | wc -l | tr -d ' '
}

migrate_source() {
  local src="$1"
  local n
  n="$(count_files "$src")"
  if [ ! -d "$src" ]; then
    log "  skip (missing): $src"
    return 0
  fi
  if [ "$n" -eq 0 ]; then
    log "  skip (empty): $src"
    return 0
  fi
  log "  merge $n file(s) from: $src"
  if [ "$DRY_RUN" -eq 1 ]; then
    log "    -> rsync -a \"$src/\" \"$NEFOL_UPLOADS_DIR/\""
    return 0
  fi
  # -a preserves times/permissions; do not delete from source yet (--clean is separate)
  rsync -a "$src/" "$NEFOL_UPLOADS_DIR/"
}

set_env_uploads_dir() {
  local target="$NEFOL_UPLOADS_DIR"
  if [ ! -f "$ENV_FILE" ]; then
    log "  creating $ENV_FILE from env.example"
    if [ "$DRY_RUN" -eq 1 ]; then
      log "[dry-run] cp ${NEFOL_DEPLOY_ROOT}/backend/env.example -> $ENV_FILE"
    elif [ -f "${NEFOL_DEPLOY_ROOT}/backend/env.example" ]; then
      cp "${NEFOL_DEPLOY_ROOT}/backend/env.example" "$ENV_FILE"
    else
      touch "$ENV_FILE"
    fi
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    log "[dry-run] set UPLOADS_DIR=$target in $ENV_FILE"
    return 0
  fi

  if grep -q '^UPLOADS_DIR=' "$ENV_FILE" 2>/dev/null; then
    if grep -q "^UPLOADS_DIR=${target}\$" "$ENV_FILE"; then
      log "  UPLOADS_DIR already correct in $ENV_FILE"
    else
      sed -i.bak "s|^UPLOADS_DIR=.*|UPLOADS_DIR=${target}|" "$ENV_FILE"
      log "  updated UPLOADS_DIR in $ENV_FILE (backup: ${ENV_FILE}.bak)"
    fi
  else
    printf '\n# Persistent uploads (outside deploy tree)\nUPLOADS_DIR=%s\n' "$target" >> "$ENV_FILE"
    log "  appended UPLOADS_DIR to $ENV_FILE"
  fi
}

verify_persistent() {
  local total blog
  total="$(count_files "$NEFOL_UPLOADS_DIR")"
  blog="$(count_files "${NEFOL_UPLOADS_DIR}/blog")"
  log ""
  log "Persistent root: $NEFOL_UPLOADS_DIR"
  log "  total files: $total (blog/: $blog)"
  if [ "$total" -eq 0 ]; then
    log "  WARNING: no files in persistent dir — if you expected images, check legacy paths or restore from backup."
  fi
}

clean_legacy_dirs() {
  local src stamp archive
  stamp="$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"

  for src in "${LEGACY_SOURCES[@]}"; do
    [ -d "$src" ] || continue
    local n
    n="$(count_files "$src")"
    if [ "$n" -eq 0 ]; then
      log "  remove empty: $src"
      run rm -rf "$src"
      continue
    fi

    archive="${BACKUP_DIR}/$(echo "$src" | tr '/' '_').${stamp}.tar.gz"
    log "  archive $n file(s): $src -> $archive"
    if [ "$DRY_RUN" -eq 1 ]; then
      log "[dry-run] tar -czf \"$archive\" -C \"$(dirname "$src")\" \"$(basename "$src")\""
      log "[dry-run] rm -rf \"$src\""
    else
      tar -czf "$archive" -C "$(dirname "$src")" "$(basename "$src")"
      rm -rf "$src"
    fi
  done

  # Optional symlink so old tools looking at uploads-data still resolve (read-only via link target)
  local link="${NEFOL_DEPLOY_ROOT}/uploads-data"
  if [ ! -e "$link" ]; then
    log "  symlink $link -> $NEFOL_UPLOADS_DIR"
    run ln -sfn "$NEFOL_UPLOADS_DIR" "$link"
  elif [ -L "$link" ]; then
    log "  symlink already exists: $link"
  else
    log "  NOTE: $link is a real directory (not replaced). Use --clean after moving files, or remove manually."
  fi
}

restart_backend() {
  if [ "$DO_RESTART" -eq 0 ]; then
    log "Skipping pm2 restart (--no-restart)"
    return 0
  fi
  if ! command -v pm2 >/dev/null 2>&1; then
    log "pm2 not found — restart backend manually after setting UPLOADS_DIR"
    return 0
  fi
  log "Restarting PM2 app: $NEFOL_PM2_APP"
  if [ "$DRY_RUN" -eq 1 ]; then
    log "[dry-run] cd $NEFOL_DEPLOY_ROOT && pm2 restart $NEFOL_PM2_APP --update-env && pm2 save"
    return 0
  fi
  (cd "$NEFOL_DEPLOY_ROOT" && pm2 restart "$NEFOL_PM2_APP" --update-env && pm2 save)
  log "Check logs for: [uploads] Persistent storage root: $NEFOL_UPLOADS_DIR"
  pm2 logs "$NEFOL_PM2_APP" --lines 15 --nostream 2>/dev/null || true
}

# --- main ---
log "=== Nefol persistent uploads migration ==="
log "Deploy root:     $NEFOL_DEPLOY_ROOT"
log "Persistent dir:  $NEFOL_UPLOADS_DIR"
log "Upload owner:    $UPLOAD_OWNER"
[ "$DRY_RUN" -eq 1 ] && log "Mode: DRY RUN (no changes)"
log ""

log "1) Create persistent directory tree"
run mkdir -p "${NEFOL_UPLOADS_DIR}/blog"
run chmod -R 755 "/var/lib/nefol" 2>/dev/null || run chmod -R 755 "$(dirname "$NEFOL_UPLOADS_DIR")"

log ""
log "2) Merge files from legacy locations"
for src in "${LEGACY_SOURCES[@]}"; do
  migrate_source "$src"
done

if [ "$NEFOL_UPLOADS_DIR" != "${NEFOL_DEPLOY_ROOT}/uploads-data" ]; then
  # Do not rsync persistent dir onto itself if misconfigured
  :
fi

log ""
log "3) Set ownership (PM2 user must write new uploads)"
if [ "$DRY_RUN" -eq 0 ]; then
  if id "$UPLOAD_OWNER" >/dev/null 2>&1; then
    chown -R "$UPLOAD_OWNER:$UPLOAD_OWNER" "$NEFOL_UPLOADS_DIR"
  else
    log "  WARNING: user $UPLOAD_OWNER not found; skipping chown"
  fi
fi

log ""
log "4) Configure backend/.env"
set_env_uploads_dir

log ""
log "5) Verify"
verify_persistent

log ""
log "6) ecosystem.config.js should set UPLOADS_DIR=$NEFOL_UPLOADS_DIR (pm2 --update-env picks .env too)"
if [ -f "${NEFOL_DEPLOY_ROOT}/ecosystem.config.js" ]; then
  if grep -q "$NEFOL_UPLOADS_DIR" "${NEFOL_DEPLOY_ROOT}/ecosystem.config.js"; then
    log "  OK: ecosystem.config.js references persistent path"
  else
    log "  WARNING: ecosystem.config.js may still point at an old UPLOADS_DIR — redeploy repo or edit manually"
  fi
fi

if [ "$DO_CLEAN" -eq 1 ]; then
  log ""
  log "7) Clean legacy directories (archived under $BACKUP_DIR)"
  clean_legacy_dirs
else
  log ""
  log "7) Legacy dirs left in place (safe). After verifying site images, re-run with: --clean"
fi

log ""
restart_backend

log ""
log "=== Done ==="
log "Test:  curl -I https://thenefol.com/uploads/<known-filename>"
log "DB URLs stay as /uploads/<filename> — only disk path changes via UPLOADS_DIR."
