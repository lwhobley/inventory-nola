import { createClient } from '@supabase/supabase-js'

// Lazy-load the Supabase client only when needed (not at module import time)
// This prevents "supabaseUrl is required" errors during Next.js build
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required')
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
    }

    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return supabaseAdminInstance
}

// Database types
export interface StaffUser {
  id: string
  name: string
  pin: string
  role: 'owner' | 'manager' | 'staff'
  location: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  current_stock: number
  unit: string
  par_level: number
  location: string
  status: 'critical' | 'low' | 'in_stock' | 'overstocked'
  last_updated: string
  created_at: string
}

export interface AnalysisResult {
  id: string
  user_id: string
  agent_id: string
  agent_name: string
  input_message: string
  result: Record<string, any>
  created_at: string
}

export interface SessionLog {
  id: string
  user_id: string
  login_time: string
  logout_time?: string
  ip_address: string
  user_agent: string
  created_at: string
}
