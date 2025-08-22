import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { debugSupabase } from '../utils/debugSupabase'
import { networkDiagnostics } from '../utils/networkDiagnostics'
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

export default function DatabaseTestScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [testResults, setTestResults] = useState<any>(null)
  const [testing, setTesting] = useState(false)
  const [networkResults, setNetworkResults] = useState<any>(null)

  const runNetworkTests = async () => {
    setTesting(true)
    try {
      console.log('🌐 Starting network diagnostics...')
      const { overall, results } = await networkDiagnostics.runFullDiagnostics()
      setNetworkResults({ overall, results })
      
      if (!overall) {
        // Show first error found
        const firstError = Object.values(results).find((r: any) => !r.success) as any
        if (firstError) {
          Alert.alert(
            '🔌 Network Issue Detected',
            `${firstError.error}\n\nSuggestions:\n• ${firstError.suggestions?.slice(0, 2).join('\n• ')}`,
            [{ text: 'OK' }]
          )
        }
      } else {
        Alert.alert('✅ Network OK', 'All network tests passed!')
      }
    } catch (error: any) {
      console.error('❌ Network test failed:', error)
      Alert.alert('Network Test Error', error.message)
    } finally {
      setTesting(false)
    }
  }

  const runDatabaseTests = async () => {
    setTesting(true)
    try {
      console.log('🧪 Starting database tests...')
      
      // Check environment variables first
      const envCheck = debugSupabase.checkEnvVars()
      console.log('Environment check:', envCheck)
      
      if (!envCheck.hasUrl || !envCheck.hasKey) {
        Alert.alert(
          '❌ Environment Setup Required',
          'Missing Supabase configuration in .env file.\n\nPlease add:\n• EXPO_PUBLIC_SUPABASE_URL\n• EXPO_PUBLIC_SUPABASE_ANON_KEY',
          [{ text: 'OK' }]
        )
        return
      }
      
      // Run all tests
      const results = await debugSupabase.runAllTests()
      setTestResults(results)
      
      // Analyze results
      const issues = []
      if (!results.connection.success) issues.push('Connection failed')
      if (!results.auth.success) issues.push('Authentication failed')
      if (!results.insert.success) issues.push('Database write failed')
      
      if (issues.length > 0) {
        Alert.alert(
          '❌ Database Issues Found',
          `Problems detected:\n• ${issues.join('\n• ')}\n\nCheck the test results below for details.`,
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert('✅ All Tests Passed', 'Database is working correctly!')
      }
      
      console.log('🏁 Tests completed')
    } catch (error: any) {
      console.error('❌ Test runner failed:', error)
      Alert.alert('Test Error', `Failed to run tests: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const renderTestResult = (name: string, result: any) => {
    const isSuccess = result?.success
    const bgColor = isSuccess ? Colors.success + '20' : Colors.error + '20'
    const borderColor = isSuccess ? Colors.success : Colors.error
    const icon = isSuccess ? '✅' : '❌'
    
    return (
      <View key={name} style={[styles.testResult, { backgroundColor: bgColor, borderColor }]}>
        <View style={styles.testHeader}>
          <Text style={styles.testIcon}>{icon}</Text>
          <Text style={styles.testName}>{name}</Text>
        </View>
        
        {result?.error && (
          <Text style={styles.errorText}>Error: {result.error}</Text>
        )}
        
        {result?.user && (
          <Text style={styles.successText}>User: {result.user.email}</Text>
        )}
        
        {result?.count !== undefined && (
          <Text style={styles.infoText}>Records: {result.count}</Text>
        )}
        
        {typeof result === 'object' && result !== null && !Array.isArray(result) && (
          <Text style={styles.detailsText}>
            {JSON.stringify(result, null, 2)}
          </Text>
        )}
      </View>
    )
  }

  const renderTableResults = (tables: any) => {
    if (!tables || typeof tables !== 'object') return null
    
    return Object.entries(tables).map(([tableName, result]: [string, any]) => (
      <View key={tableName} style={styles.tableResult}>
        <Text style={styles.tableName}>{tableName}</Text>
        <Text style={result.success ? styles.successText : styles.errorText}>
          {result.success ? `✅ ${result.count || 0} rows` : `❌ ${result.error}`}
        </Text>
      </View>
    ))
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Database Test</Text>
          <TouchableOpacity 
            onPress={runDatabaseTests} 
            style={styles.testButton}
            disabled={testing}
          >
            <Text style={styles.testButtonText}>
              {testing ? 'Testing...' : 'Test DB'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Database Connectivity Test</Text>
          <Text style={styles.headerSubtitle}>
            Check Supabase connection and table access
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!testResults && !networkResults && !testing && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>🔧 Connection Diagnostics</Text>
            <Text style={styles.instructionsText}>
              Having network issues? Use these tools to diagnose and fix connection problems.
            </Text>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.networkButton]}
              onPress={runNetworkTests}
              disabled={testing}
            >
              <Text style={styles.actionButtonIcon}>🌐</Text>
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonTitle}>Network Diagnostics</Text>
                <Text style={styles.actionButtonDesc}>Test internet & Supabase connectivity</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.databaseButton]}
              onPress={runDatabaseTests}
              disabled={testing}
            >
              <Text style={styles.actionButtonIcon}>🗄️</Text>
              <View style={styles.actionButtonContent}>
                <Text style={styles.actionButtonTitle}>Database Tests</Text>
                <Text style={styles.actionButtonDesc}>Test auth, tables & operations</Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.checkList}>
              <Text style={styles.checkItem}>• Environment variables check</Text>
              <Text style={styles.checkItem}>• Internet connectivity test</Text>
              <Text style={styles.checkItem}>• Supabase URL accessibility</Text>
              <Text style={styles.checkItem}>• Authentication verification</Text>
              <Text style={styles.checkItem}>• Database table access</Text>
            </View>
          </View>
        )}

        {testing && (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingTitle}>🔄 Running Tests...</Text>
            <Text style={styles.loadingText}>
              Testing database connectivity and permissions. Check console for detailed logs.
            </Text>
          </View>
        )}

        {networkResults && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>🌐 Network Diagnostic Results</Text>
            <View style={[styles.overallResult, networkResults.overall ? styles.successCard : styles.errorCard]}>
              <Text style={styles.overallStatus}>
                {networkResults.overall ? '✅ All Network Tests Passed' : '❌ Network Issues Detected'}
              </Text>
            </View>
            
            {renderTestResult('Environment Variables', networkResults.results.environment)}
            {renderTestResult('Internet Connection', networkResults.results.internet)}
            {renderTestResult('Supabase URL Access', networkResults.results.supabaseUrl)}
            {renderTestResult('Supabase Client', networkResults.results.supabaseClient)}
          </View>
        )}

        {testResults && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>🗄️ Database Test Results</Text>
            
            {/* Connection Test */}
            {renderTestResult('Database Connection', testResults.connection)}
            
            {/* Auth Test */}
            {renderTestResult('Authentication', testResults.auth)}
            
            {/* Insert Test */}
            {renderTestResult('Insert Operation', testResults.insert)}
            
            {/* Tables Test */}
            {testResults.tables && (
              <View style={styles.tablesSection}>
                <Text style={styles.sectionTitle}>📋 Table Access</Text>
                {renderTableResults(testResults.tables)}
              </View>
            )}
          </View>
        )}
        
        {(testResults || networkResults) && (
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>🔧 Troubleshooting Guide</Text>
            <Text style={styles.helpText}>Common solutions for connection issues:</Text>
            <Text style={styles.helpItem}>• Check .env file has correct Supabase URL and key</Text>
            <Text style={styles.helpItem}>• Verify internet connection (try switching WiFi/mobile)</Text>
            <Text style={styles.helpItem}>• Ensure Supabase project is active in dashboard</Text>
            <Text style={styles.helpItem}>• Run complete_setup.sql if tables are missing</Text>
            <Text style={styles.helpItem}>• Restart app after changing .env file</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  testButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  testButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  instructionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  instructionsTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  instructionsText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
    marginBottom: Spacing.lg,
  },
  checkList: {
    gap: Spacing.sm,
  },
  checkItem: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  loadingCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  resultsContainer: {
    gap: Spacing.lg,
  },
  resultsTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  testResult: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  testIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  testName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  errorText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  successText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  infoText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  detailsText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  tablesSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tableResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  helpCard: {
    backgroundColor: Colors.accent + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  helpTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  helpText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  helpItem: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  networkButton: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary + '40',
  },
  databaseButton: {
    backgroundColor: Colors.secondary + '20',
    borderColor: Colors.secondary + '40',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  actionButtonDesc: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  overallResult: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  successCard: {
    backgroundColor: Colors.success + '20',
    borderColor: Colors.success,
  },
  errorCard: {
    backgroundColor: Colors.error + '20',
    borderColor: Colors.error,
  },
  overallStatus: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
})