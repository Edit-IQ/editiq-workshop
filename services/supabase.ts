import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://djojknyjlgntormnwovy.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqb2prbmVqbGdudG9ybW53b3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2Nzc0MjQsImV4cCI6MjA1MjI1MzQyNH0.2vhAL-dRxmvOECGmdr2Mcrg_2vhAL'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'editiq-workflow'
    }
  }
})

// Auth helpers with mobile compatibility and faster timeouts
export const signInWithGoogle = async () => {
  try {
    console.log('Initiating Google OAuth...')
    
    // Use appropriate URL based on environment
    const redirectUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000/' 
      : 'https://edit-iq.github.io/editiq-workshop/';
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        skipBrowserRedirect: false
      }
    })
    
    if (error) {
      console.error('OAuth error:', error)
      return { data: null, error }
    }
    
    console.log('OAuth initiated successfully')
    return { data, error: null }
  } catch (error) {
    console.error('Google auth error:', error)
    return { data: null, error }
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