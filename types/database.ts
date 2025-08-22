export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          business_name: string | null
          phone: string | null
          business_type: 'Retail' | 'Food & Beverage' | 'Service' | 'Online' | 'Technology' | 'Healthcare' | 'Education' | 'Manufacturing' | 'Construction' | 'Other' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          business_name?: string | null
          phone?: string | null
          business_type?: 'Retail' | 'Food & Beverage' | 'Service' | 'Online' | 'Technology' | 'Healthcare' | 'Education' | 'Manufacturing' | 'Construction' | 'Other' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          business_name?: string | null
          phone?: string | null
          business_type?: 'Retail' | 'Food & Beverage' | 'Service' | 'Online' | 'Technology' | 'Healthcare' | 'Education' | 'Manufacturing' | 'Construction' | 'Other' | null
          updated_at?: string
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
          bank_name: string | null
          account_number: string | null
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
          bank_name?: string | null
          account_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'cash' | 'bank' | 'ewallet' | 'credit'
          balance?: number
          is_primary?: boolean
          bank_name?: string | null
          account_number?: string | null
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
          total_spent: number
          last_order_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone?: string | null
          email?: string | null
          total_spent?: number
          last_order_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string | null
          email?: string | null
          total_spent?: number
          last_order_date?: string | null
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
          id?: string
          user_id?: string
          customer_id?: string | null
          amount?: number
          status?: 'pending' | 'paid' | 'completed'
          payment_method?: string | null
          notes?: string | null
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
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          name: string
          price: number
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          name?: string
          price?: number
          quantity?: number
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          amount: number
          category: string
          description: string | null
          receipt_url: string | null
          wallet_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          category: string
          description?: string | null
          receipt_url?: string | null
          wallet_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          category?: string
          description?: string | null
          receipt_url?: string | null
          wallet_id?: string | null
          updated_at?: string
        }
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          image_url: string
          extracted_data: any | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          extracted_data?: any | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          extracted_data?: any | null
          processed_at?: string | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          auto_sync_sheets: boolean
          theme_mode: 'light' | 'dark' | 'system'
          security_settings: any
          premium_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          auto_sync_sheets?: boolean
          theme_mode?: 'light' | 'dark' | 'system'
          security_settings?: any
          premium_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          auto_sync_sheets?: boolean
          theme_mode?: 'light' | 'dark' | 'system'
          security_settings?: any
          premium_expires_at?: string | null
          updated_at?: string
        }
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          unlocked_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          achievement_id: string
          unlocked_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          achievement_id?: string
          unlocked_at?: string
        }
      }
      gamification_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          achievement_id: string | null
          reward_type: string | null
          reward_value: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          achievement_id?: string | null
          reward_type?: string | null
          reward_value?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          achievement_id?: string | null
          reward_type?: string | null
          reward_value?: number | null
        }
      }
      user_sheets: {
        Row: {
          id: string
          user_id: string
          month: string
          spreadsheet_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          spreadsheet_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          spreadsheet_id?: string
        }
      }
    }
  }
}