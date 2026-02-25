import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'fillup-auth-token',
    flowType: 'pkce'
  }
})

export type UserRole = Database['public']['Enums']['user_role']
export type FuelType = Database['public']['Enums']['fuel_type']
export type ServiceType = Database['public']['Enums']['service_type']
export type OrderStatus = Database['public']['Enums']['order_status']
export type TransactionType = Database['public']['Enums']['transaction_type']
export type TransactionStatus = Database['public']['Enums']['transaction_status']
export type TicketStatus = Database['public']['Enums']['ticket_status']
export type TicketPriority = Database['public']['Enums']['ticket_priority']

export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('❌ Error getting user role:', error)
    return null
  }
  
  return data?.role as UserRole
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('❌ Error getting user profile:', error)
    throw error
  }
  
  return data
}

export const updateUserProfile = async (userId: string, updates: Partial<Database['public']['Tables']['users']['Update']>) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserWallet = async (userId: string) => {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error) throw error
  return data
}

export const getUserVehicles = async (userId: string) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const getUserOrders = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      vehicles(*),
      agents(*, users(*)),
      stations(*)
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const getAgentProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('agents')
    .select('*, users(*)')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const getStationProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('stations')
    .select('*, users(*)')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
}

// Debug function to check database state
export const debugUserData = async () => {
  try {
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
    
    const { data: authUser, error: authError } = await supabase.auth.getUser()
    
    return { allUsers, authUser: authUser.user }
  } catch (error) {
    console.error('💥 Debug error:', error)
    return null
  }
}