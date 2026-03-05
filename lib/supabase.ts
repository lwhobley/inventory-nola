import { createClient } from '@supabase/supabase-js'
import { createServerClient, createBrowserClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (client-side)
export const supabaseBrowser = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server client (server-side with service role)
export function createSupabaseServerClient(
  cookieStore: { get: (name: string) => { value: string } | undefined }
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: any) => {
        // Server-side cookie setting
      },
      remove: (name: string, options: any) => {
        // Server-side cookie removal
      },
    },
  })
}

// Admin client (full access)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
