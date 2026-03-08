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

// Create a single supabase client for interacting with your database
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
)
