import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { debugSupabase } from '../utils/debugSupabase'
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

export default function DatabaseTestScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [testResults, setTestResults] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const runTests = async () => {
    setTesting(true)
    try {
      console.log('🧪 Starting database tests...')
      
      // Check environment variables first
      const envCheck = debugSupabase.checkEnvVars()
      console.log('Environment check:', envCheck)
      
      // Run all tests
      const results = await debugSupabase.runAllTests()
      setTestResults(results)
      
      console.log('🏁 Tests completed')
    } catch (error) {
      console.error('❌ Test runner failed:', error)
      Alert.alert('Error', 'Failed to run tests')
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
    <SafeAreaView style={styles.container}>
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
            onPress={runTests} 
            style={styles.testButton}
            disabled={testing}
          >
            <Text style={styles.testButtonText}>
              {testing ? 'Testing...' : 'Run Tests'}
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
        {!testResults && !testing && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>🧪 Database Test Tool</Text>
            <Text style={styles.instructionsText}>
              This tool will test your database connection, authentication, and table access.
              Tap "Run Tests" to diagnose any database issues.
            </Text>
            <View style={styles.checkList}>
              <Text style={styles.checkItem}>✓ Environment variables</Text>
              <Text style={styles.checkItem}>✓ Supabase connection</Text>
              <Text style={styles.checkItem}>✓ User authentication</Text>
              <Text style={styles.checkItem}>✓ Table access permissions</Text>
              <Text style={styles.checkItem}>✓ Insert/update operations</Text>
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

        {testResults && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>📊 Test Results</Text>
            
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
            
            <View style={styles.helpCard}>
              <Text style={styles.helpTitle}>🔧 Troubleshooting</Text>
              <Text style={styles.helpText}>
                If tests are failing:
              </Text>
              <Text style={styles.helpItem}>
                1. Check your .env file has correct Supabase credentials
              </Text>
              <Text style={styles.helpItem}>
                2. Ensure you're logged in to the app
              </Text>
              <Text style={styles.helpItem}>
                3. Run the complete_setup.sql script in Supabase
              </Text>
              <Text style={styles.helpItem}>
                4. Check console logs for detailed error messages
              </Text>
            </View>
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
    paddingTop: Platform.OS === 'android' ? Spacing.xl : Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
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
})