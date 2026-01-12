import { createClient } from '@supabase/supabase-js'

// Fallback to demo mode if environment variables are not available
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key'

// Create a mock client for demo mode
const createMockClient = () => ({
  auth: {
    signInWithOAuth: () => Promise.resolve({ data: null, error: { message: 'Demo mode' } }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: (callback: any) => {
      // Return a mock subscription
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
  }
})

// Use mock client if no valid Supabase URL
export const supabase = supabaseUrl.includes('demo') ? createMockClient() : createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signInWithGoogle = async () => {
  try {
    // Always return demo mode error to force demo login
    return { data: null, error: { message: 'Demo mode - use Enter as Guest' } }
  } catch (error) {
    console.error('Auth error:', error)
    return { data: null, error: { message: 'Demo mode - use Enter as Guest' } }
  }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = () => {
  return supabase.auth.getUser()
}

export const onAuthStateChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}