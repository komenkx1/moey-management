import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
    /**
     * Production Logging Suppression
     * 
     * Security Rationale:
     * - Prevents exposure of configuration issues in production
     * - Console logs can reveal implementation details to attackers
     * - Development logging preserved for debugging
     * - Only suppressed in production builds (NODE_ENV check)
     */
    if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ Supabase URL or Anon Key is missing. Please check your .env.local file.')
    }
}

// Browser auth persistence is intentional for the current SPA/static-export target.
// Treat the browser as a sensitive surface and avoid storing extra identity/session
// metadata outside Supabase-managed persistence unless strictly needed.
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
)
