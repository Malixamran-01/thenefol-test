function showImportFailure(err: unknown) {
  const rootEl = document.getElementById('root')
  const text =
    err instanceof Error ? `${err.message}\n\n${err.stack || ''}`.trim() : String(err)

  try {
    const prev =
      (window as unknown as { __NEFOL_BOOT__?: Record<string, unknown> }).__NEFOL_BOOT__ &&
      typeof (window as unknown as { __NEFOL_BOOT__?: Record<string, unknown> }).__NEFOL_BOOT__ ===
        'object'
        ? (window as unknown as { __NEFOL_BOOT__: Record<string, unknown> }).__NEFOL_BOOT__
        : {}
    ;(window as unknown as { __NEFOL_BOOT__: Record<string, unknown> }).__NEFOL_BOOT__ = {
      ...prev,
      dynamicImportFailedAt: Date.now(),
      dynamicImportError: String(err),
    }
  } catch {
    /* ignore */
  }

  if (rootEl) {
    rootEl.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.style.cssText =
      'padding:18px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:13px;color:#0f172a;max-width:720px;margin:0 auto'
    const pre = document.createElement('pre')
    pre.style.cssText =
      'white-space:pre-wrap;word-break:break-word;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px;font-size:11px'
    pre.textContent = text || 'Unknown import error'
    wrap.appendChild(pre)
    const btn = document.createElement('button')
    btn.textContent = 'Reload'
    btn.onclick = () => location.reload()
    btn.style.cssText =
      'margin-top:12px;background:#1B4965;color:#fff;border:0;border-radius:12px;padding:10px 16px;font-weight:600'
    wrap.appendChild(btn)
    rootEl.appendChild(wrap)
  }
}

void import('./bootstrapApp')
  .then((mod) => {
    mod.mountApp()
  })
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error('bootstrap import failed:', err)
    showImportFailure(err)
  })
