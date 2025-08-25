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
      business_locations: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string
          phone: string | null
          manager_name: string | null
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address: string
          phone?: string | null
          manager_name?: string | null
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string
          phone?: string | null
          manager_name?: string | null
          is_primary?: boolean
          updated_at?: string
        }
      }
      staff_members: {
        Row: {
          id: string
          user_id: string
          location_id: string | null
          name: string
          role: 'manager' | 'cashier' | 'inventory' | 'sales' | 'admin'
          phone: string | null
          email: string | null
          permissions: any
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          location_id?: string | null
          name: string
          role: 'manager' | 'cashier' | 'inventory' | 'sales' | 'admin'
          phone?: string | null
          email?: string | null
          permissions?: any
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          location_id?: string | null
          name?: string
          role?: 'manager' | 'cashier' | 'inventory' | 'sales' | 'admin'
          phone?: string | null
          email?: string | null
          permissions?: any
          is_active?: boolean
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          location_id: string | null
          name: string
          description: string | null
          sku: string | null
          barcode: string | null
          cost_price: number
          selling_price: number
          stock_quantity: number
          low_stock_alert: number
          category: string | null
          supplier_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          location_id?: string | null
          name: string
          description?: string | null
          sku?: string | null
          barcode?: string | null
          cost_price: number
          selling_price: number
          stock_quantity?: number
          low_stock_alert?: number
          category?: string | null
          supplier_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          location_id?: string | null
          name?: string
          description?: string | null
          sku?: string | null
          barcode?: string | null
          cost_price?: number
          selling_price?: number
          stock_quantity?: number
          low_stock_alert?: number
          category?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
      }
      inventory_movements: {
        Row: {
          id: string
          user_id: string
          product_id: string
          location_id: string | null
          type: 'in' | 'out' | 'adjustment' | 'transfer'
          quantity: number
          reason: string | null
          staff_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          location_id?: string | null
          type: 'in' | 'out' | 'adjustment' | 'transfer'
          quantity: number
          reason?: string | null
          staff_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          location_id?: string | null
          type?: 'in' | 'out' | 'adjustment' | 'transfer'
          quantity?: number
          reason?: string | null
          staff_id?: string | null
        }
      }
      customer_segments: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          segment: 'VIP' | 'Regular' | 'New' | 'Inactive'
          loyalty_points: number
          tier_level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          segment: 'VIP' | 'Regular' | 'New' | 'Inactive'
          loyalty_points?: number
          tier_level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          segment?: 'VIP' | 'Regular' | 'New' | 'Inactive'
          loyalty_points?: number
          tier_level?: number
          updated_at?: string
        }
      }
      customer_communications: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          type: 'whatsapp' | 'sms' | 'email' | 'call'
          content: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          type: 'whatsapp' | 'sms' | 'email' | 'call'
          content: string
          status?: 'sent' | 'delivered' | 'read' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          type?: 'whatsapp' | 'sms' | 'email' | 'call'
          content?: string
          status?: 'sent' | 'delivered' | 'read' | 'failed'
        }
      }
      business_analytics: {
        Row: {
          id: string
          user_id: string
          location_id: string | null
          metric_type: 'revenue' | 'profit' | 'inventory_turnover' | 'customer_acquisition'
          metric_value: number
          period_type: 'daily' | 'weekly' | 'monthly' | 'yearly'
          period_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          location_id?: string | null
          metric_type: 'revenue' | 'profit' | 'inventory_turnover' | 'customer_acquisition'
          metric_value: number
          period_type: 'daily' | 'weekly' | 'monthly' | 'yearly'
          period_date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          location_id?: string | null
          metric_type?: 'revenue' | 'profit' | 'inventory_turnover' | 'customer_acquisition'
          metric_value?: number
          period_type?: 'daily' | 'weekly' | 'monthly' | 'yearly'
          period_date?: string
        }
      }
      sync_status: {
        Row: {
          id: string
          user_id: string
          table_name: string
          last_sync: string | null
          sync_conflicts: any | null
          is_online: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          table_name: string
          last_sync?: string | null
          sync_conflicts?: any | null
          is_online?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          table_name?: string
          last_sync?: string | null
          sync_conflicts?: any | null
          is_online?: boolean
          updated_at?: string
        }
      }
    }
  }
}

// Additional interfaces for advanced features
export interface BusinessLocation {
  id: string
  user_id: string
  name: string
  address: string
  phone?: string
  manager_name?: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface StaffMember {
  id: string
  user_id: string
  location_id?: string
  name: string
  role: 'manager' | 'cashier' | 'inventory' | 'sales' | 'admin'
  phone?: string
  email?: string
  permissions: any
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  user_id: string
  location_id?: string
  name: string
  description?: string
  sku?: string
  barcode?: string
  cost_price: number
  selling_price: number
  stock_quantity: number
  low_stock_alert: number
  category?: string
  supplier_id?: string
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  user_id: string
  product_id: string
  location_id?: string
  type: 'in' | 'out' | 'adjustment' | 'transfer'
  quantity: number
  reason?: string
  staff_id?: string
  created_at: string
}

export interface CustomerSegment {
  id: string
  user_id: string
  customer_id: string
  segment: 'VIP' | 'Regular' | 'New' | 'Inactive'
  loyalty_points: number
  tier_level: number
  created_at: string
  updated_at: string
}

export interface CustomerCommunication {
  id: string
  user_id: string
  customer_id: string
  type: 'whatsapp' | 'sms' | 'email' | 'call'
  content: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  created_at: string
}

export interface BusinessAnalytics {
  id: string
  user_id: string
  location_id?: string
  metric_type: 'revenue' | 'profit' | 'inventory_turnover' | 'customer_acquisition'
  metric_value: number
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  period_date: string
  created_at: string
}

export interface SyncStatus {
  id: string
  user_id: string
  table_name: string
  last_sync?: string
  sync_conflicts?: any
  is_online: boolean
  created_at: string
  updated_at: string
}