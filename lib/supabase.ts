import { createClient } from '@supabase/supabase-js'

const fallbackSupabaseUrl = 'https://xakjkpsuwgmdusfwixrz.supabase.co'
const fallbackSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhha2prcHN1d2dtZHVzZndpeHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTUxMjksImV4cCI6MjA5ODc5MTEyOX0.5y6E99SamZHlBGwkSxmJa1OoPaEsHdFVT5IhDqoKHfs'

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackSupabaseUrl
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
