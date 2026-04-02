/**
 * Cloudflare Turnstile server-side verification.
 * Set TURNSTILE_SECRET_KEY in backend .env (Dashboard → Turnstile → your widget → Secret Key).
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteip?: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    return { ok: true }
  }
  if (!token || typeof token !== 'string' || !token.trim()) {
    return { ok: false, message: 'Security verification required. Please complete the captcha.' }
  }
  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token.trim())
  if (remoteip) body.set('remoteip', remoteip)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (!data.success) {
      const codes = data['error-codes']?.join(', ') || 'unknown'
      console.warn('Turnstile verification failed:', codes)
      return { ok: false, message: 'Security verification failed. Please try again.' }
    }
    return { ok: true }
  } catch (e) {
    console.error('Turnstile siteverify error:', e)
    return { ok: false, message: 'Could not verify security check. Please try again.' }
  }
}
