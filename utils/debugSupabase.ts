import { supabase } from '../lib/supabase'

export const debugSupabase = {
  // Test database connection
  async testConnection() {
    try {
      console.log('🔍 Testing Supabase connection...')
      const { data, error } = await supabase.from('users').select('count').limit(1)
      
      if (error) {
        console.error('❌ Supabase connection error:', error.message)
        return { success: false, error: error.message }
      }
      
      console.log('✅ Supabase connection successful')
      return { success: true, data }
    } catch (error: any) {
      console.error('❌ Supabase connection failed:', error.message)
      return { success: false, error: error.message }
    }
  },

  // Test authentication
  async testAuth() {
    try {
      console.log('🔍 Testing authentication...')
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('❌ Auth error:', error.message)
        return { success: false, error: error.message, user: null }
      }
      
      if (!user) {
        console.log('ℹ️ No authenticated user')
        return { success: true, user: null, message: 'Not authenticated' }
      }
      
      console.log('✅ User authenticated:', user.email)
      return { success: true, user }
    } catch (error: any) {
      console.error('❌ Auth test failed:', error.message)
      return { success: false, error: error.message }
    }
  },

  // Test table access
  async testTables() {
    const tables = ['users', 'wallets', 'customers', 'orders', 'order_items', 'user_settings']
    const results: Record<string, any> = {}
    
    for (const table of tables) {
      try {
        console.log(`🔍 Testing table: ${table}`)
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(1)
        
        if (error) {
          console.error(`❌ Table ${table} error:`, error.message)
          results[table] = { success: false, error: error.message }
        } else {
          console.log(`✅ Table ${table} accessible (${count} total rows)`)
          results[table] = { success: true, count, hasData: data && data.length > 0 }
        }
      } catch (error: any) {
        console.error(`❌ Table ${table} failed:`, error.message)
        results[table] = { success: false, error: error.message }
      }
    }
    
    return results
  },

  // Test insert operation
  async testInsert() {
    try {
      console.log('🔍 Testing insert operation...')
      
      // First check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Try inserting a test customer
      const { data, error } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: 'Test Customer (Debug)',
          phone: '+60123456789'
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ Insert test failed:', error.message)
        return { success: false, error: error.message }
      }
      
      // Clean up - delete the test customer
      await supabase.from('customers').delete().eq('id', data.id)
      
      console.log('✅ Insert test successful')
      return { success: true, data }
    } catch (error: any) {
      console.error('❌ Insert test failed:', error.message)
      return { success: false, error: error.message }
    }
  },

  // Run all tests
  async runAllTests() {
    console.log('🚀 Running Supabase debug tests...')
    
    const results = {
      connection: await this.testConnection(),
      auth: await this.testAuth(),
      tables: await this.testTables(),
      insert: await this.testInsert()
    }
    
    console.log('📊 Debug Results Summary:')
    console.log('Connection:', results.connection.success ? '✅' : '❌')
    console.log('Auth:', results.auth.success ? '✅' : '❌')
    console.log('Tables:', Object.values(results.tables).every((t: any) => t.success) ? '✅' : '❌')
    console.log('Insert:', results.insert.success ? '✅' : '❌')
    
    return results
  },

  // Check environment variables
  checkEnvVars() {
    console.log('🔍 Checking environment variables...')
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.log('SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing')
    
    if (supabaseUrl) {
      console.log('URL Preview:', supabaseUrl.substring(0, 30) + '...')
    }
    
    if (supabaseKey) {
      console.log('Key Preview:', supabaseKey.substring(0, 20) + '...')
    }
    
    return {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      url: supabaseUrl,
      key: supabaseKey?.substring(0, 20) + '...'
    }
  }
}