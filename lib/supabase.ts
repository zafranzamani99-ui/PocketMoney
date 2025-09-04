import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variable validation
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL environment variable')
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable')
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

console.log('🔗 Supabase URL:', supabaseUrl)
console.log('🔑 Supabase Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')

// Database types - Update these based on your actual database schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          phone?: string | null
          email?: string | null
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          customer_id: string | null
          amount: number
          status: 'pending' | 'paid' | 'completed'
          payment_method: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id?: string | null
          amount: number
          status?: 'pending' | 'paid' | 'completed'
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          customer_id?: string | null
          amount?: number
          status?: 'pending' | 'paid' | 'completed'
          payment_method?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          image_url: string
          extracted_data: any
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          extracted_data?: any
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          extracted_data?: any
          processed_at?: string | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          theme_mode: 'light' | 'dark' | 'system'
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme_mode?: 'light' | 'dark' | 'system'
          updated_at?: string
        }
        Update: {
          theme_mode?: 'light' | 'dark' | 'system'
          updated_at?: string
        }
      }
      google_sheets_sync: {
        Row: {
          id: string
          user_id: string
          spreadsheet_id: string
          spreadsheet_url: string
          sync_config: any
          last_sync_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          spreadsheet_id: string
          spreadsheet_url: string
          sync_config?: any
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          spreadsheet_id?: string
          spreadsheet_url?: string
          sync_config?: any
          last_sync_at?: string | null
          updated_at?: string
        }
      }
      sync_operations: {
        Row: {
          id: string
          user_id: string
          operation_type: 'sync' | 'export'
          status: 'pending' | 'running' | 'completed' | 'failed'
          records_processed: number
          records_failed: number
          errors: string[] | null
          started_at: string
          completed_at: string | null
          metadata: any
        }
        Insert: {
          id?: string
          user_id: string
          operation_type: 'sync' | 'export'
          status?: 'pending' | 'running' | 'completed' | 'failed'
          records_processed?: number
          records_failed?: number
          errors?: string[] | null
          started_at?: string
          completed_at?: string | null
          metadata?: any
        }
        Update: {
          status?: 'pending' | 'running' | 'completed' | 'failed'
          records_processed?: number
          records_failed?: number
          errors?: string[] | null
          completed_at?: string | null
          metadata?: any
        }
      }
      whatsapp_extractions: {
        Row: {
          id: string
          user_id: string
          original_text: string
          extracted_data: any
          confidence_score: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_text: string
          extracted_data?: any
          confidence_score?: number
          created_at?: string
        }
        Update: {
          extracted_data?: any
          confidence_score?: number
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'cash' | 'bank' | 'ewallet' | 'credit'
          balance: number
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'cash' | 'bank' | 'ewallet' | 'credit'
          balance?: number
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          balance?: number
          is_primary?: boolean
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          name: string
          price: number
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          name: string
          price: number
          quantity: number
          created_at?: string
        }
        Update: {
          name?: string
          price?: number
          quantity?: number
        }
      }
      daily_closings: {
        Row: {
          id: string
          user_id: string
          date: string
          total_sales: number
          total_expenses: number
          profit: number
          transaction_count: number
          order_count: number
          cash_balance: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          total_sales: number
          total_expenses: number
          profit: number
          transaction_count: number
          order_count: number
          cash_balance: number
          created_at?: string
        }
        Update: {
          total_sales?: number
          total_expenses?: number
          profit?: number
          transaction_count?: number
          order_count?: number
          cash_balance?: number
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          closing_streak: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          closing_streak?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          closing_streak?: number
          updated_at?: string
        }
      }
    }
  }
}

export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'pocketmoney-app',
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        timeout: 10000, // 10 second timeout
      }).catch(error => {
        console.error('🌐 Network request failed:', error.message)
        console.error('🔗 URL:', url)
        throw new Error(`Network request failed: ${error.message}`)
      })
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit realtime events
    },
  },
})

// Error handling helper
export const handleSupabaseError = (error: any, context?: string): string => {
  console.error(`Supabase error${context ? ` in ${context}` : ''}:`, error)
  
  if (error?.message) {
    // Common error mappings for user-friendly messages
    const errorMessage = error.message.toLowerCase()
    
    if (errorMessage.includes('jwt') || errorMessage.includes('unauthorized')) {
      return 'Please sign in again'
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network error. Please check your connection'
    }
    
    if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
      return 'This item already exists'
    }
    
    if (errorMessage.includes('not found')) {
      return 'Item not found'
    }
    
    return error.message
  }
  
  return 'An unexpected error occurred'
}