import { Alert } from 'react-native'
import { supabase } from '../lib/supabase'

export interface NetworkDiagnosticResult {
  success: boolean
  error?: string
  details?: any
  suggestions?: string[]
}

export const networkDiagnostics = {
  // Test basic network connectivity
  async testInternetConnection(): Promise<NetworkDiagnosticResult> {
    try {
      console.log('🌐 Testing internet connectivity...')
      
      // Try a simple fetch to a reliable endpoint
      const response = await fetch('https://www.google.com/', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      })
      
      console.log('✅ Internet connection working')
      return { success: true }
    } catch (error: any) {
      console.error('❌ Internet connection failed:', error.message)
      return {
        success: false,
        error: 'No internet connection',
        suggestions: [
          'Check your WiFi or mobile data connection',
          'Try switching between WiFi and mobile data',
          'Restart your network connection'
        ]
      }
    }
  },

  // Test Supabase URL accessibility
  async testSupabaseUrl(): Promise<NetworkDiagnosticResult> {
    try {
      console.log('🔗 Testing Supabase URL accessibility...')
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        return {
          success: false,
          error: 'Supabase URL not configured',
          suggestions: ['Check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL is set']
        }
      }

      // Test if we can reach the Supabase endpoint
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''}`
        }
      })

      if (response.ok || response.status === 401) {
        // 401 is expected without proper auth, but means URL is reachable
        console.log('✅ Supabase URL is accessible')
        return { success: true }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error: any) {
      console.error('❌ Supabase URL test failed:', error.message)
      return {
        success: false,
        error: `Cannot reach Supabase: ${error.message}`,
        suggestions: [
          'Verify your Supabase URL in .env file',
          'Check if your Supabase project is active',
          'Try accessing your Supabase dashboard in a browser'
        ]
      }
    }
  },

  // Test Supabase client configuration
  async testSupabaseClient(): Promise<NetworkDiagnosticResult> {
    try {
      console.log('⚙️ Testing Supabase client configuration...')
      
      // Test a simple query that should work even without data
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(0)
      
      if (error) {
        // Check for common error types
        if (error.message.includes('relation "public.users" does not exist')) {
          return {
            success: false,
            error: 'Database tables not set up',
            suggestions: [
              'Run the database setup SQL scripts',
              'Check if your Supabase project has the required tables',
              'Verify you\'re connecting to the correct database'
            ]
          }
        } else if (error.message.includes('JWT')) {
          return {
            success: false,
            error: 'Authentication configuration issue',
            suggestions: [
              'Check your Supabase anonymous key',
              'Verify the key is not expired',
              'Ensure Row Level Security policies are set up correctly'
            ]
          }
        } else {
          throw error
        }
      }
      
      console.log('✅ Supabase client configuration working')
      return { success: true }
    } catch (error: any) {
      console.error('❌ Supabase client test failed:', error.message)
      return {
        success: false,
        error: error.message,
        details: error,
        suggestions: [
          'Check your Supabase URL and API key',
          'Verify your database is set up correctly',
          'Check network connectivity'
        ]
      }
    }
  },

  // Test environment variables
  testEnvironmentVariables(): NetworkDiagnosticResult {
    console.log('🔍 Checking environment variables...')
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    
    const issues: string[] = []
    const suggestions: string[] = []
    
    if (!supabaseUrl) {
      issues.push('EXPO_PUBLIC_SUPABASE_URL is missing')
      suggestions.push('Add EXPO_PUBLIC_SUPABASE_URL to your .env file')
    } else if (!supabaseUrl.startsWith('https://')) {
      issues.push('Supabase URL should start with https://')
      suggestions.push('Check your Supabase URL format')
    }
    
    if (!supabaseKey) {
      issues.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing')
      suggestions.push('Add EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file')
    } else if (supabaseKey.length < 100) {
      issues.push('Supabase key appears to be invalid (too short)')
      suggestions.push('Check your Supabase anonymous key')
    }
    
    if (issues.length > 0) {
      console.error('❌ Environment variable issues:', issues)
      return {
        success: false,
        error: `Environment issues: ${issues.join(', ')}`,
        suggestions
      }
    }
    
    console.log('✅ Environment variables configured')
    console.log('URL:', supabaseUrl?.substring(0, 30) + '...')
    console.log('Key:', supabaseKey?.substring(0, 20) + '...')
    
    return { success: true }
  },

  // Run comprehensive network diagnostics
  async runFullDiagnostics(): Promise<{ 
    overall: boolean, 
    results: Record<string, NetworkDiagnosticResult> 
  }> {
    console.log('🚀 Running comprehensive network diagnostics...')
    
    const results = {
      environment: this.testEnvironmentVariables(),
      internet: await this.testInternetConnection(),
      supabaseUrl: await this.testSupabaseUrl(),
      supabaseClient: await this.testSupabaseClient()
    }
    
    const overall = Object.values(results).every(result => result.success)
    
    console.log('\n📊 Diagnostic Results Summary:')
    console.log('Environment:', results.environment.success ? '✅' : '❌')
    console.log('Internet:', results.internet.success ? '✅' : '❌')
    console.log('Supabase URL:', results.supabaseUrl.success ? '✅' : '❌')
    console.log('Supabase Client:', results.supabaseClient.success ? '✅' : '❌')
    console.log('Overall:', overall ? '✅ All systems operational' : '❌ Issues detected')
    
    return { overall, results }
  },

  // Show user-friendly error dialog
  showDiagnosticResults(results: Record<string, NetworkDiagnosticResult>) {
    const failedTests = Object.entries(results).filter(([_, result]) => !result.success)
    
    if (failedTests.length === 0) {
      Alert.alert(
        '✅ Connection Test Passed',
        'All network diagnostics passed successfully!',
        [{ text: 'OK' }]
      )
      return
    }
    
    const firstFailure = failedTests[0][1]
    const suggestions = firstFailure.suggestions?.slice(0, 3).join('\n• ') || 'Please check your connection'
    
    Alert.alert(
      '🔌 Connection Issue Detected',
      `${firstFailure.error}\n\nSuggestions:\n• ${suggestions}`,
      [
        { text: 'OK' },
        { 
          text: 'Run Diagnostics Again', 
          onPress: () => this.runFullDiagnostics().then(({ results }) => 
            this.showDiagnosticResults(results)
          )
        }
      ]
    )
  }
}