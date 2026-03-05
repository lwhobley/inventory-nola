import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client (server-side only - full access with service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

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
