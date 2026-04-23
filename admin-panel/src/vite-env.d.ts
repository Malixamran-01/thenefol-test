/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_API_PORT?: string
  /** Optional: only if you use @supabase/supabase-js in the browser */
  readonly VITE_SUPABASE_URL?: string
  /** Optional: anon public key — never the service role */
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly DEV?: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

