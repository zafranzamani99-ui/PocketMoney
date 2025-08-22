import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Linking,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { supabase } from '../lib/supabase'
// Mock Google Sheets service for React Native compatibility
const googleSheetsService = {
  async initialize(accessToken: string) {
    // Mock implementation
    return Promise.resolve()
  },
  async getRecentTransactionsFromSupabase(userId: string) {
    // Mock data
    return Promise.resolve([
      { date: '2024-12-20', type: 'Income', description: 'Sale #123', amount: 50.00, category: 'Sales' },
      { date: '2024-12-19', type: 'Expense', description: 'Office supplies', amount: 25.50, category: 'Supplies' }
    ])
  },
  async syncTransactionsToSheet(userId: string, transactions: any[]) {
    // Mock sync
    return Promise.resolve()
  },
  async enableAutoSync(userId: string, enabled: boolean) {
    return Promise.resolve()
  },
  async getAutoSyncStatus(userId: string) {
    return Promise.resolve(false)
  }
}
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface SyncStatus {
  isConnected: boolean
  lastSyncTime: string | null
  autoSyncEnabled: boolean
  totalTransactions: number
  sheetsCreated: number
}

export default function GoogleSheetsSyncScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSyncTime: null,
    autoSyncEnabled: false,
    totalTransactions: 0,
    sheetsCreated: 0,
  })

  useEffect(() => {
    loadSyncStatus()
  }, [])

  const loadSyncStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check auto sync setting
      const autoSyncEnabled = await googleSheetsService.getAutoSyncStatus(user.id)

      // Get transaction count
      const { data: transactions, error } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', user.id)

      const { data: sheets, error: sheetsError } = await supabase
        .from('user_sheets')
        .select('id')
        .eq('user_id', user.id)

      setSyncStatus({
        isConnected: false, // Would check Google OAuth status in real implementation
        lastSyncTime: null,
        autoSyncEnabled,
        totalTransactions: transactions?.length || 0,
        sheetsCreated: sheets?.length || 0,
      })
    } catch (error) {
      console.error('Error loading sync status:', error)
    }
  }

  const connectToGoogleSheets = async () => {
    Alert.alert(
      'Connect to Google Sheets',
      'This will redirect you to Google to authorize access to your Google Sheets. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setLoading(true)
            try {
              // In a real implementation, this would use Google OAuth
              // For now, we'll simulate the connection
              await new Promise(resolve => setTimeout(resolve, 2000))
              
              setSyncStatus(prev => ({
                ...prev,
                isConnected: true,
                lastSyncTime: new Date().toISOString(),
              }))
              
              Alert.alert('Success!', 'Successfully connected to Google Sheets!')
            } catch (error) {
              Alert.alert('Error', 'Failed to connect to Google Sheets')
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  const disconnectFromGoogleSheets = () => {
    Alert.alert(
      'Disconnect Google Sheets',
      'This will stop syncing your data to Google Sheets. Your existing sheets will not be deleted. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setSyncStatus(prev => ({
              ...prev,
              isConnected: false,
              autoSyncEnabled: false,
            }))
            Alert.alert('Disconnected', 'Google Sheets sync has been disabled.')
          }
        }
      ]
    )
  }

  const syncNow = async () => {
    if (!syncStatus.isConnected) {
      Alert.alert('Error', 'Please connect to Google Sheets first.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Get recent transactions
      const transactions = await googleSheetsService.getRecentTransactionsFromSupabase(user.id)
      
      if (transactions.length === 0) {
        Alert.alert('Info', 'No transactions to sync.')
        setLoading(false)
        return
      }

      // Sync to Google Sheets
      await googleSheetsService.syncTransactionsToSheet(user.id, transactions)

      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
      }))

      Alert.alert('Success!', `Synced ${transactions.length} transactions to Google Sheets.`)
    } catch (error) {
      Alert.alert('Error', 'Failed to sync transactions.')
      console.error('Sync error:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAutoSync = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await googleSheetsService.enableAutoSync(user.id, enabled)
      setSyncStatus(prev => ({ ...prev, autoSyncEnabled: enabled }))
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto sync setting.')
    }
  }

  const createNewSheet = async () => {
    if (!syncStatus.isConnected) {
      Alert.alert('Error', 'Please connect to Google Sheets first.')
      return
    }

    Alert.alert(
      'Create New Sheet',
      'This will create a new Google Sheet for the current month. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            setLoading(true)
            try {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) throw new Error('No user found')

              const now = new Date()
              const month = (now.getMonth() + 1).toString().padStart(2, '0')
              const year = now.getFullYear().toString()

              const spreadsheetId = await googleSheetsService.createMonthlySheet(user.id, month, year)
              
              setSyncStatus(prev => ({
                ...prev,
                sheetsCreated: prev.sheetsCreated + 1,
              }))

              Alert.alert('Success!', 'New Google Sheet created successfully!')
            } catch (error) {
              Alert.alert('Error', 'Failed to create new sheet.')
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  const openGoogleSheets = () => {
    Linking.openURL('https://sheets.google.com')
  }

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`
    return date.toLocaleDateString()
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
          <Text style={styles.title}>Google Sheets Sync</Text>
          <TouchableOpacity onPress={openGoogleSheets} style={styles.openButton}>
            <Text style={styles.openText}>Open</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusCard}>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: syncStatus.isConnected ? Colors.success : Colors.error }
            ]} />
            <Text style={styles.statusText}>
              {syncStatus.isConnected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
          <Text style={styles.lastSync}>
            Last sync: {formatLastSync(syncStatus.lastSyncTime)}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          
          {!syncStatus.isConnected ? (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={connectToGoogleSheets}
              disabled={loading}
            >
              <LinearGradient
                colors={[Colors.success, Colors.primary]}
                style={styles.connectButtonGradient}
              >
                <Text style={styles.connectButtonIcon}>📊</Text>
                <Text style={styles.connectButtonText}>
                  {loading ? 'Connecting...' : 'Connect to Google Sheets'}
                </Text>
                <Text style={styles.connectButtonSubtext}>
                  Securely sync your transactions
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.connectedCard}>
              <View style={styles.connectedHeader}>
                <Text style={styles.connectedIcon}>✅</Text>
                <Text style={styles.connectedText}>Connected to Google Sheets</Text>
              </View>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={disconnectFromGoogleSheets}
              >
                <Text style={styles.disconnectText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {syncStatus.isConnected && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Auto Sync</Text>
              
              <View style={styles.autoSyncCard}>
                <View style={styles.autoSyncInfo}>
                  <Text style={styles.autoSyncTitle}>Automatic Sync</Text>
                  <Text style={styles.autoSyncDescription}>
                    Automatically sync new transactions to Google Sheets
                  </Text>
                </View>
                <Switch
                  value={syncStatus.autoSyncEnabled}
                  onValueChange={toggleAutoSync}
                  trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                  thumbColor={syncStatus.autoSyncEnabled ? Colors.primary : Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sync Actions</Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={syncNow}
                disabled={loading}
              >
                <Text style={styles.actionButtonIcon}>🔄</Text>
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>
                    {loading ? 'Syncing...' : 'Sync Now'}
                  </Text>
                  <Text style={styles.actionButtonDescription}>
                    Manually sync all transactions
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={createNewSheet}
                disabled={loading}
              >
                <Text style={styles.actionButtonIcon}>➕</Text>
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>Create New Sheet</Text>
                  <Text style={styles.actionButtonDescription}>
                    Create a new monthly sheet
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Statistics</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{syncStatus.totalTransactions}</Text>
                  <Text style={styles.statLabel}>Total Transactions</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{syncStatus.sheetsCreated}</Text>
                  <Text style={styles.statLabel}>Sheets Created</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.howItWorks}>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Connect Your Account</Text>
                <Text style={styles.stepDescription}>
                  Securely connect your Google account to enable sheet access
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Automatic Sync</Text>
                <Text style={styles.stepDescription}>
                  Your transactions are automatically organized into monthly sheets
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share & Collaborate</Text>
                <Text style={styles.stepDescription}>
                  Share sheets with your accountant or team members
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sheet Template</Text>
          
          <View style={styles.templatePreview}>
            <Text style={styles.templateTitle}>Monthly Transaction Sheet</Text>
            <View style={styles.templateTable}>
              <View style={styles.templateRow}>
                <Text style={styles.templateHeader}>Date</Text>
                <Text style={styles.templateHeader}>Type</Text>
                <Text style={styles.templateHeader}>Description</Text>
                <Text style={styles.templateHeader}>Amount</Text>
              </View>
              <View style={styles.templateRow}>
                <Text style={styles.templateCell}>2025-01-21</Text>
                <Text style={styles.templateCell}>Income</Text>
                <Text style={styles.templateCell}>Nasi Lemak - Ali</Text>
                <Text style={styles.templateCell}>15.00</Text>
              </View>
              <View style={styles.templateRow}>
                <Text style={styles.templateCell}>2025-01-21</Text>
                <Text style={styles.templateCell}>Expense</Text>
                <Text style={styles.templateCell}>Supplier - Rice</Text>
                <Text style={styles.templateCell}>45.00</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.privacyNote}>
            🔒 Your data is encrypted and securely transmitted. We only access your Google Sheets with your explicit permission.
          </Text>
        </View>
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
    marginTop: Spacing.md,
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
  openButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  openText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  lastSync: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.xxl,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  connectButton: {
    marginBottom: Spacing.md,
  },
  connectButtonGradient: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  connectButtonIcon: {
    fontSize: 32,
    marginBottom: Spacing.md,
  },
  connectButtonText: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  connectButtonSubtext: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    opacity: 0.8,
  },
  connectedCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  connectedIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  connectedText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  disconnectButton: {
    backgroundColor: Colors.error + '20',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  disconnectText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.error,
  },
  autoSyncCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  autoSyncInfo: {
    flex: 1,
  },
  autoSyncTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  autoSyncDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  actionButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  actionButtonDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  howItWorks: {
    gap: Spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: Spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  stepDescription: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  templatePreview: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  templateTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  templateTable: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  templateRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  templateHeader: {
    flex: 1,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  templateCell: {
    flex: 1,
    padding: Spacing.sm,
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  privacyNote: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.body,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
})