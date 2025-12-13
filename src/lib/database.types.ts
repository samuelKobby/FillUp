export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude]
}

export interface PendingAgent {
  id: string
  auth_id: string
  email: string
  name: string
  phone: string
  service_type: 'fuel_delivery' | 'mechanic' | 'both'
  license_number: string | null
  vehicle_info: {
    make?: string
    model?: string
    year?: string
    plateNumber?: string
    color?: string
  } | null
  experience: string | null
  location: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'customer' | 'agent' | 'station' | 'admin'
          name: string | null
          phone: string | null
          avatar_url: string | null
          is_verified: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'customer' | 'agent' | 'station' | 'admin'
          name?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'customer' | 'agent' | 'station' | 'admin'
          name?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          user_id: string
          make: string
          model: string
          year: number | null
          plate_number: string
          fuel_type: 'petrol' | 'diesel'
          tank_capacity: number
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          make: string
          model: string
          year?: number | null
          plate_number: string
          fuel_type?: 'petrol' | 'diesel'
          tank_capacity?: number
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          make?: string
          model?: string
          year?: number | null
          plate_number?: string
          fuel_type?: 'petrol' | 'diesel'
          tank_capacity?: number
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          user_id: string
          service_type: 'fuel_delivery' | 'mechanic' | 'both'
          vehicle_info: Json | null
          license_number: string | null
          is_verified: boolean
          is_available: boolean
          current_location: GeoJSONPoint | null
          rating: number
          total_jobs: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          service_type?: 'fuel_delivery' | 'mechanic' | 'both'
          vehicle_info?: Json | null
          license_number?: string | null
          is_verified?: boolean
          is_available?: boolean
          current_location?: GeoJSONPoint | null
          rating?: number
          total_jobs?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          service_type?: 'fuel_delivery' | 'mechanic' | 'both'
          vehicle_info?: Json | null
          license_number?: string | null
          is_verified?: boolean
          is_available?: boolean
          current_location?: GeoJSONPoint | null
          rating?: number
          total_jobs?: number
          created_at?: string
          updated_at?: string
        }
      }
      stations: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string
          location: GeoJSONPoint | null
          phone: string | null
          fuel_types: string[]
          petrol_price: number
          diesel_price: number
          is_verified: boolean
          is_active: boolean
          operating_hours: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address: string
          location?: GeoJSONPoint | null
          phone?: string | null
          fuel_types?: string[]
          petrol_price?: number
          diesel_price?: number
          is_verified?: boolean
          is_active?: boolean
          operating_hours?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string
          location?: GeoJSONPoint | null
          phone?: string | null
          fuel_types?: string[]
          petrol_price?: number
          diesel_price?: number
          is_verified?: boolean
          is_active?: boolean
          operating_hours?: Json
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string
          agent_id: string | null
          station_id: string | null
          vehicle_id: string | null
          service_type: 'fuel_delivery' | 'mechanic' | 'both'
          status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
          fuel_type: 'petrol' | 'diesel' | null
          fuel_quantity: number | null
          mechanic_service: string | null
          pickup_location: GeoJSONPoint | null
          delivery_location: GeoJSONPoint
          pickup_address: string | null
          delivery_address: string
          total_amount: number
          platform_fee: number
          agent_fee: number
          notes: string | null
          scheduled_time: string | null
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          agent_id?: string | null
          station_id?: string | null
          vehicle_id?: string | null
          service_type: 'fuel_delivery' | 'mechanic' | 'both'
          status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
          fuel_type?: 'petrol' | 'diesel' | null
          fuel_quantity?: number | null
          mechanic_service?: string | null
          pickup_location?: GeoJSONPoint | null
          delivery_location: GeoJSONPoint
          pickup_address?: string | null
          delivery_address: string
          total_amount?: number
          platform_fee?: number
          agent_fee?: number
          notes?: string | null
          scheduled_time?: string | null
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          agent_id?: string | null
          station_id?: string | null
          vehicle_id?: string | null
          service_type?: 'fuel_delivery' | 'mechanic' | 'both'
          status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
          fuel_type?: 'petrol' | 'diesel' | null
          fuel_quantity?: number | null
          mechanic_service?: string | null
          pickup_location?: GeoJSONPoint | null
          delivery_location?: GeoJSONPoint
          pickup_address?: string | null
          delivery_address?: string
          total_amount?: number
          platform_fee?: number
          agent_fee?: number
          notes?: string | null
          scheduled_time?: string | null
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          balance: number
          pending_balance: number
          total_earned: number
          total_spent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          pending_balance?: number
          total_earned?: number
          total_spent?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          pending_balance?: number
          total_earned?: number
          total_spent?: number
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          order_id: string | null
          type: 'payment' | 'earning' | 'withdrawal' | 'refund' | 'fee'
          amount: number
          description: string | null
          payment_method: string | null
          reference: string | null
          status: 'pending' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_id?: string | null
          type: 'payment' | 'earning' | 'withdrawal' | 'refund' | 'fee'
          amount: number
          description?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_id?: string | null
          type?: 'payment' | 'earning' | 'withdrawal' | 'refund' | 'fee'
          amount?: number
          description?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
      }
      ratings: {
        Row: {
          id: string
          order_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          reviewer_id?: string
          reviewee_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string
          order_id: string | null
          subject: string
          message: string
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_id?: string | null
          subject: string
          message: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_id?: string | null
          subject?: string
          message?: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'customer' | 'agent' | 'station' | 'admin'
      fuel_type: 'petrol' | 'diesel'
      service_type: 'fuel_delivery' | 'mechanic' | 'both'
      order_status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
      transaction_type: 'payment' | 'earning' | 'withdrawal' | 'refund' | 'fee'
      transaction_status: 'pending' | 'completed' | 'failed'
      ticket_status: 'open' | 'in_progress' | 'resolved' | 'closed'
      ticket_priority: 'low' | 'medium' | 'high' | 'urgent'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}