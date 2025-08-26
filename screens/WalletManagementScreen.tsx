import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface Wallet {
  id: string
  name: string
  type: 'cash' | 'bank' | 'ewallet' | 'credit'
  balance: number
  is_primary: boolean
  bank_name?: string
  account_number?: string
  created_at: string
}

export default function WalletManagementScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { colors } = useTheme()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddWallet, setShowAddWallet] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedFromWallet, setSelectedFromWallet] = useState<Wallet | null>(null)
  const [selectedToWallet, setSelectedToWallet] = useState<Wallet | null>(null)
  const [transferAmount, setTransferAmount] = useState('')

  const [newWallet, setNewWallet] = useState({
    name: '',
    type: 'cash' as const,
    balance: '',
    bank_name: '',
    account_number: '',
  })

  useEffect(() => {
    loadWallets()
  }, [])

  const loadWallets = async () => {
    try {
      console.log('📋 Loading wallets...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('❌ Auth error loading wallets:', authError?.message)
        return
      }

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })

      if (error) {
        console.error('❌ Error loading wallets:', error.message)
        Alert.alert('Database Error', `Failed to load wallets: ${error.message}`)
        return
      }
      
      console.log('✅ Wallets loaded:', data?.length || 0, 'wallets')
      setWallets(data || [])
    } catch (error: any) {
      console.error('❌ Unexpected error loading wallets:', error)
      Alert.alert('Error', `Failed to load wallets: ${error.message}`)
    }
  }

  const addWallet = async () => {
    if (!newWallet.name.trim()) {
      Alert.alert('Error', 'Wallet name is required')
      return
    }

    setLoading(true)
    try {
      console.log('💰 Adding new wallet...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('❌ Auth error:', authError?.message)
        Alert.alert('Authentication Error', 'You must be logged in to add a wallet')
        return
      }

      const walletData = {
        user_id: user.id,
        name: newWallet.name,
        type: newWallet.type,
        balance: parseFloat(newWallet.balance) || 0,
        bank_name: newWallet.bank_name || null,
        account_number: newWallet.account_number || null,
        is_primary: wallets.length === 0, // First wallet is primary
      }
      
      console.log('📋 Inserting wallet data:', walletData)

      const { data, error } = await supabase
        .from('wallets')
        .insert(walletData)
        .select()
        .single()

      if (error) {
        console.error('❌ Wallet insert error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        Alert.alert('Database Error', `Failed to add wallet: ${error.message}`)
        return
      }

      console.log('✅ Wallet added successfully:', data)
      setNewWallet({
        name: '',
        type: 'cash',
        balance: '',
        bank_name: '',
        account_number: '',
      })
      setShowAddWallet(false)
      loadWallets()
      Alert.alert('Success', 'Wallet added successfully!')
    } catch (error: any) {
      console.error('❌ Unexpected error adding wallet:', error)
      Alert.alert('Error', `Failed to add wallet: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const setPrimaryWallet = async (walletId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // First, set all wallets as non-primary
      await supabase
        .from('wallets')
        .update({ is_primary: false })
        .eq('user_id', user.id)

      // Then set the selected wallet as primary
      await supabase
        .from('wallets')
        .update({ is_primary: true })
        .eq('id', walletId)

      loadWallets()
      Alert.alert('Success', 'Primary wallet updated!')
    } catch (error) {
      Alert.alert('Error', 'Failed to update primary wallet')
      console.error(error)
    }
  }

  const deleteWallet = (wallet: Wallet) => {
    if (wallet.is_primary && wallets.length > 1) {
      Alert.alert('Error', 'Cannot delete primary wallet. Set another wallet as primary first.')
      return
    }

    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${wallet.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDeleteWallet(wallet.id),
        },
      ]
    )
  }

  const performDeleteWallet = async (walletId: string) => {
    try {
      const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', walletId)

      if (error) throw error
      loadWallets()
      Alert.alert('Success', 'Wallet deleted successfully!')
    } catch (error) {
      Alert.alert('Error', 'Failed to delete wallet')
      console.error(error)
    }
  }

  const transferFunds = async () => {
    if (!selectedFromWallet || !selectedToWallet || !transferAmount.trim()) {
      Alert.alert('Error', 'Please fill all fields')
      return
    }

    const amount = parseFloat(transferAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount')
      return
    }

    if (amount > selectedFromWallet.balance) {
      Alert.alert('Error', 'Insufficient balance in source wallet')
      return
    }

    try {
      // Update balances
      await supabase
        .from('wallets')
        .update({ balance: selectedFromWallet.balance - amount })
        .eq('id', selectedFromWallet.id)

      await supabase
        .from('wallets')
        .update({ balance: selectedToWallet.balance + amount })
        .eq('id', selectedToWallet.id)

      // Record transfer as two transactions
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('expenses').insert([
          {
            user_id: user.id,
            amount: amount,
            category: 'Transfer',
            description: `Transfer to ${selectedToWallet.name}`,
            wallet_id: selectedFromWallet.id,
          },
          {
            user_id: user.id,
            amount: amount,
            category: 'Transfer',
            description: `Transfer from ${selectedFromWallet.name}`,
            wallet_id: selectedToWallet.id,
          }
        ])
      }

      setShowTransferModal(false)
      setTransferAmount('')
      setSelectedFromWallet(null)
      setSelectedToWallet(null)
      loadWallets()
      Alert.alert('Success', 'Transfer completed successfully!')
    } catch (error) {
      Alert.alert('Error', 'Transfer failed')
      console.error(error)
    }
  }

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'cash': return '💵'
      case 'bank': return '🏦'
      case 'ewallet': return '📱'
      case 'credit': return '💳'
      default: return '💰'
    }
  }

  const getWalletTypeLabel = (type: string) => {
    switch (type) {
      case 'cash': return 'Cash'
      case 'bank': return 'Bank Account'
      case 'ewallet': return 'E-Wallet'
      case 'credit': return 'Credit Card'
      default: return 'Other'
    }
  }

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0)

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Wallet Management</Text>
          <TouchableOpacity onPress={() => setShowAddWallet(true)} style={styles.addButton}>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceValue}>RM {totalBalance.toFixed(2)}</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Wallets</Text>
            <TouchableOpacity 
              onPress={() => setShowTransferModal(true)}
              style={styles.transferButton}
              disabled={wallets.length < 2}
            >
              <Text style={styles.transferButtonText}>Transfer</Text>
            </TouchableOpacity>
          </View>

          {wallets.map((wallet) => (
            <View key={wallet.id} style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <View style={styles.walletLeft}>
                  <Text style={styles.walletIcon}>{getWalletIcon(wallet.type)}</Text>
                  <View>
                    <Text style={styles.walletName}>{wallet.name}</Text>
                    <Text style={styles.walletType}>{getWalletTypeLabel(wallet.type)}</Text>
                  </View>
                  {wallet.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryText}>Primary</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.walletBalance}>RM {wallet.balance.toFixed(2)}</Text>
              </View>

              {wallet.bank_name && (
                <Text style={styles.bankInfo}>
                  {wallet.bank_name} • {wallet.account_number}
                </Text>
              )}

              <View style={styles.walletActions}>
                {!wallet.is_primary && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setPrimaryWallet(wallet.id)}
                  >
                    <Text style={styles.actionButtonText}>Set Primary</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteWallet(wallet)}
                >
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {wallets.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No wallets yet</Text>
              <Text style={styles.emptyStateSubtext}>Add your first wallet to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Wallet Modal */}
      <Modal visible={showAddWallet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Wallet</Text>

            <TextInput
              style={styles.input}
              placeholder="Wallet Name"
              placeholderTextColor={colors.textSecondary}
              value={newWallet.name}
              onChangeText={(text) => setNewWallet({...newWallet, name: text})}
            />

            <View style={styles.typeSelector}>
              {['cash', 'bank', 'ewallet', 'credit'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    newWallet.type === type && styles.typeButtonActive
                  ]}
                  onPress={() => setNewWallet({...newWallet, type: type as any})}
                >
                  <Text style={styles.typeButtonIcon}>{getWalletIcon(type)}</Text>
                  <Text style={[
                    styles.typeButtonText,
                    newWallet.type === type && styles.typeButtonTextActive
                  ]}>
                    {getWalletTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Initial Balance (Optional)"
              placeholderTextColor={colors.textSecondary}
              value={newWallet.balance}
              onChangeText={(text) => setNewWallet({...newWallet, balance: text})}
              keyboardType="numeric"
            />

            {(newWallet.type === 'bank' || newWallet.type === 'credit') && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Bank Name"
                  placeholderTextColor={colors.textSecondary}
                  value={newWallet.bank_name}
                  onChangeText={(text) => setNewWallet({...newWallet, bank_name: text})}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Account Number"
                  placeholderTextColor={colors.textSecondary}
                  value={newWallet.account_number}
                  onChangeText={(text) => setNewWallet({...newWallet, account_number: text})}
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddWallet(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addWallet}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? 'Adding...' : 'Add Wallet'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transfer Modal */}
      <Modal visible={showTransferModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Transfer Funds</Text>

            <Text style={styles.inputLabel}>From Wallet</Text>
            <ScrollView horizontal style={styles.walletSelector} showsHorizontalScrollIndicator={false}>
              {wallets.map((wallet) => (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletOption,
                    selectedFromWallet?.id === wallet.id && styles.walletOptionActive
                  ]}
                  onPress={() => setSelectedFromWallet(wallet)}
                >
                  <Text style={styles.walletOptionIcon}>{getWalletIcon(wallet.type)}</Text>
                  <Text style={styles.walletOptionName}>{wallet.name}</Text>
                  <Text style={styles.walletOptionBalance}>RM {wallet.balance.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>To Wallet</Text>
            <ScrollView horizontal style={styles.walletSelector} showsHorizontalScrollIndicator={false}>
              {wallets.filter(w => w.id !== selectedFromWallet?.id).map((wallet) => (
                <TouchableOpacity
                  key={wallet.id}
                  style={[
                    styles.walletOption,
                    selectedToWallet?.id === wallet.id && styles.walletOptionActive
                  ]}
                  onPress={() => setSelectedToWallet(wallet)}
                >
                  <Text style={styles.walletOptionIcon}>{getWalletIcon(wallet.type)}</Text>
                  <Text style={styles.walletOptionName}>{wallet.name}</Text>
                  <Text style={styles.walletOptionBalance}>RM {wallet.balance.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="Amount to Transfer"
              placeholderTextColor={colors.textSecondary}
              value={transferAmount}
              onChangeText={setTransferAmount}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTransferModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={transferFunds}
              >
                <Text style={styles.confirmButtonText}>Transfer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl, // Reduced padding - SafeAreaView handles notch/Dynamic Island
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
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
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    opacity: 0.8,
    marginBottom: Spacing.xs,
  },
  balanceValue: {
    fontSize: Typography.fontSizes.display,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 0, // Space for home indicator
  },
  section: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  transferButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  transferButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  walletCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  walletName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  walletType: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  primaryBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.md,
  },
  primaryText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  walletBalance: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.success,
  },
  bankInfo: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  walletActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary + '20',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: colors.error + '20',
  },
  actionButtonText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.primary,
  },
  deleteButtonText: {
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyStateText: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  typeButtonIcon: {
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  typeButtonText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.primary,
  },
  walletSelector: {
    marginBottom: Spacing.md,
  },
  walletOption: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletOptionActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  walletOptionIcon: {
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  walletOptionName: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  walletOptionBalance: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  confirmButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
})