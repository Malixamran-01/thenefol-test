export async function uploadFile(file: File, apiBase: string): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  
  // Get auth token if available (for admin panel)
  const token = localStorage.getItem('auth_token')
  const role = localStorage.getItem('role')
  const permissions = localStorage.getItem('permissions')
  
  const headers: HeadersInit = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (role) {
    headers['x-user-role'] = role
  }
  if (permissions) {
    headers['x-user-permissions'] = permissions
  }
  
  const res = await fetch(`${apiBase}/upload`, { 
    method: 'POST', 
    body: form,
    headers
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    let errorMessage = 'upload failed'
    try {
      const errorData = JSON.parse(errorText)
      errorMessage = errorData.message || errorData.error || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }
    throw new Error(errorMessage)
  }
  
  const data = await res.json()
  // expect { url: string }
  const url: string = data.url
  if (!url) throw new Error('upload failed: no URL in response')
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


