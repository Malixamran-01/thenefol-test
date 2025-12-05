// Session management for guest users
export function getSessionId(): string {
  let sessionId = localStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('session_id', sessionId)
  }
  return sessionId
}

export function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  const sessionId = getSessionId()
  if (sessionId) {
    headers['x-session-id'] = sessionId
  }
  
  return headers
}

