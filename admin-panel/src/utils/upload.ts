export type UploadedMedia = { url: string; poster: string | null; isVideo: boolean }

export const VIDEO_URL_RE = /\.(mp4|webm|ogg|ogv|mov|m4v|avi)(\?|#|$)/i
export const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_RE.test(url)

/** Server limit is 500MB; keep PDP clips short so they load fast on mobile. */
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v'

function authHeaders(): Record<string, string> {
  // Get auth token if available (for admin panel)
  const headers: Record<string, string> = {}
  const token = localStorage.getItem('auth_token')
  const role = localStorage.getItem('role')
  const permissions = localStorage.getItem('permissions')
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (role) headers['x-user-role'] = role
  if (permissions) headers['x-user-permissions'] = permissions
  return headers
}

function toAbsoluteUploadUrl(url: string, apiBase: string): string {
  // normalize to absolute URL for consistent previews across origins
  if (/^https?:\/\//i.test(url)) return url
  // For uploads, remove /api from base since uploads are served from root
  let base = apiBase.replace(/\/$/, '')
  if (url.startsWith('/uploads/') && base.endsWith('/api')) {
    base = base.replace(/\/api$/, '')
  }
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}

/**
 * Upload an image or video. Uses XHR so large videos can report progress
 * (0–100 while bytes are sent; the server may then spend a while optimising).
 */
export function uploadMedia(
  file: File,
  apiBase: string,
  onProgress?: (percent: number) => void
): Promise<UploadedMedia> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${apiBase}/upload`)
    Object.entries(authHeaders()).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onerror = () => reject(new Error('upload failed: network error'))
    xhr.ontimeout = () => reject(new Error('upload failed: timed out'))
    xhr.onload = () => {
      let data: any = null
      try { data = JSON.parse(xhr.responseText) } catch { /* non-JSON */ }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data?.message || data?.error || xhr.responseText || 'upload failed'))
        return
      }
      // expect { url: string, poster?: string }
      const url: string | undefined = data?.url
      if (!url) {
        reject(new Error('upload failed: no URL in response'))
        return
      }
      resolve({
        url: toAbsoluteUploadUrl(url, apiBase),
        poster: data.poster ? toAbsoluteUploadUrl(data.poster, apiBase) : null,
        isVideo: !!data.isVideo || isVideoUrl(url),
      })
    }
    xhr.send(form)
  })
}

export async function uploadFile(file: File, apiBase: string): Promise<string> {
  const { url } = await uploadMedia(file, apiBase)
  return url
}
