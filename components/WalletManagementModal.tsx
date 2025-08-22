import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { walletService, Wallet } from '../services/walletService'
import { supabase } from '../lib/supabase'

interface WalletManagementModalProps {
  visible: boolean
  onClose: () => void
  onWalletChange: () => void
}

export default function WalletManagementModal({ visible, onClose, onWalletChange }: WalletManagementModalProps) {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [newWalletName, setNewWalletName] = useState('')
  const [newWalletType, setNewWalletType] = useState<'cash' | 'bank' | 'ewallet'>('cash')
  const [transferAmount, setTransferAmount] = useState('')
  const [fromWallet, setFromWallet] = useState<string>('')
  const [toWallet, setToWallet] = useState<string>('')

  const walletTypes = [
    { value: 'cash', label: 'Cash', emoji: '💵' },
    { value: 'bank', label: 'Bank Account', emoji: '🏦' },
    { value: 'ewallet', label: 'E-Wallet', emoji: '📱' },
  ] as const

  useEffect(() => {
    if (visible) {
      loadWallets()
    }
  }, [visible])

  const loadWallets = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const userWallets = await walletService.getUserWallets(user.id)
      setWallets(userWallets)
    } catch (error) {
      Alert.alert('Error', 'Failed to load wallets')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddWallet = async () => {
    if (!newWalletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      await walletService.createWallet({
        user_id: user.id,
        name: newWalletName.trim(),
        type: newWalletType,
        balance: 0,
        is_primary: wallets.length === 0, // First wallet is primary
      })

      setNewWalletName('')
      setShowAddForm(false)
      loadWallets()
      onWalletChange()
      Alert.alert('Success', 'Wallet created successfully')
    } catch (error) {
      Alert.alert('Error', 'Failed to create wallet')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetPrimary = async (walletId: string) => {
    setLoading(true)
    try {
      await walletService.updateWallet(walletId, { is_primary: true })
      loadWallets()
      onWalletChange()
      Alert.alert('Success', 'Primary wallet updated')
    } catch (error) {
      Alert.alert('Error', 'Failed to update primary wallet')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWallet = async (wallet: Wallet) => {
    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${wallet.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              await walletService.deleteWallet(wallet.id)
              loadWallets()
              onWalletChange()
              Alert.alert('Success', 'Wallet deleted successfully')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete wallet')
              console.error(error)
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleTransfer = async () => {
    if (!fromWallet || !toWallet || !transferAmount) {
      Alert.alert('Error', 'Please fill in all transfer details')
      return
    }

    if (fromWallet === toWallet) {
      Alert.alert('Error', 'Cannot transfer to the same wallet')
      return
    }

    const amount = parseFloat(transferAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      await walletService.transferBetweenWallets(fromWallet, toWallet, amount)
      setTransferAmount('')
      setFromWallet('')
      setToWallet('')
      setShowTransferForm(false)
      loadWallets()
      onWalletChange()
      Alert.alert('Success', 'Transfer completed successfully')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete transfer')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalBalance = () => {
    return wallets.reduce((total, wallet) => total + wallet.balance, 0)
  }

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'cash': return '💵'
      case 'bank': return '🏦'
      case 'ewallet': return '📱'
      default: return '💰'
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Wallets</Text>
          <TouchableOpacity onPress={() => setShowAddForm(true)}>
            <Text style={styles.addButton}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.totalBalanceCard}>
            <Text style={styles.totalBalanceLabel}>Total Balance</Text>
            <Text style={styles.totalBalanceValue}>RM {getTotalBalance().toFixed(2)}</Text>
            
            <TouchableOpacity
              style={styles.transferButton}
              onPress={() => setShowTransferForm(true)}
              disabled={wallets.length < 2}
            >
              <Text style={[
                styles.transferButtonText,
                wallets.length < 2 && styles.disabledButtonText
              ]}>
                Transfer Between Wallets
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.walletsList}>
              {wallets.map((wallet) => (
                <View key={wallet.id} style={styles.walletCard}>
                  <View style={styles.walletHeader}>
                    <View style={styles.walletInfo}>
                      <Text style={styles.walletIcon}>{getWalletIcon(wallet.type)}</Text>
                      <View>
                        <Text style={styles.walletName}>{wallet.name}</Text>
                        <Text style={styles.walletType}>{wallet.type.toUpperCase()}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.walletActions}>
                      <Text style={styles.walletBalance}>RM {wallet.balance.toFixed(2)}</Text>
                      {wallet.is_primary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.walletControls}>
                    {!wallet.is_primary && (
                      <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() => handleSetPrimary(wallet.id)}
                      >
                        <Text style={styles.controlButtonText}>Set Primary</Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                      style={[styles.controlButton, styles.deleteButton]}
                      onPress={() => handleDeleteWallet(wallet)}
                      disabled={wallets.length === 1}
                    >
                      <Text style={[
                        styles.controlButtonText,
                        styles.deleteButtonText,
                        wallets.length === 1 && styles.disabledButtonText
                      ]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Add Wallet Form */}
          {showAddForm && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Add New Wallet</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Wallet Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newWalletName}
                  onChangeText={setNewWalletName}
                  placeholder="e.g. Main Cash, Bank BCA"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Wallet Type</Text>
                <View style={styles.typeSelector}>
                  {walletTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeButton,
                        newWalletType === type.value && styles.typeButtonSelected,
                      ]}
                      onPress={() => setNewWalletType(type.value)}
                    >
                      <Text style={styles.typeEmoji}>{type.emoji}</Text>
                      <Text style={[
                        styles.typeText,
                        newWalletType === type.value && styles.typeTextSelected,
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.formCancelButton}
                  onPress={() => {
                    setShowAddForm(false)
                    setNewWalletName('')
                  }}
                >
                  <Text style={styles.formCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.formSaveButton}
                  onPress={handleAddWallet}
                  disabled={!newWalletName.trim()}
                >
                  <Text style={[
                    styles.formSaveButtonText,
                    !newWalletName.trim() && styles.disabledButtonText
                  ]}>
                    Create Wallet
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Transfer Form */}
          {showTransferForm && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Transfer Between Wallets</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>From Wallet</Text>
                <View style={styles.walletSelector}>
                  {wallets.map((wallet) => (
                    <TouchableOpacity
                      key={wallet.id}
                      style={[
                        styles.walletSelectorButton,
                        fromWallet === wallet.id && styles.walletSelectorButtonSelected,
                      ]}
                      onPress={() => setFromWallet(wallet.id)}
                    >
                      <Text style={styles.walletSelectorText}>
                        {getWalletIcon(wallet.type)} {wallet.name} (RM {wallet.balance.toFixed(2)})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>To Wallet</Text>
                <View style={styles.walletSelector}>
                  {wallets.filter(w => w.id !== fromWallet).map((wallet) => (
                    <TouchableOpacity
                      key={wallet.id}
                      style={[
                        styles.walletSelectorButton,
                        toWallet === wallet.id && styles.walletSelectorButtonSelected,
                      ]}
                      onPress={() => setToWallet(wallet.id)}
                    >
                      <Text style={styles.walletSelectorText}>
                        {getWalletIcon(wallet.type)} {wallet.name} (RM {wallet.balance.toFixed(2)})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={styles.textInput}
                  value={transferAmount}
                  onChangeText={setTransferAmount}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.formCancelButton}
                  onPress={() => {
                    setShowTransferForm(false)
                    setTransferAmount('')
                    setFromWallet('')
                    setToWallet('')
                  }}
                >
                  <Text style={styles.formCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.formSaveButton}
                  onPress={handleTransfer}
                  disabled={!fromWallet || !toWallet || !transferAmount}
                >
                  <Text style={[
                    styles.formSaveButtonText,
                    (!fromWallet || !toWallet || !transferAmount) && styles.disabledButtonText
                  ]}>
                    Transfer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  cancelButton: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
  },
  addButton: {
    fontSize: Typography.fontSizes.body,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  totalBalanceCard: {
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    alignItems: 'center',
  },
  totalBalanceLabel: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  totalBalanceValue: {
    fontSize: Typography.fontSizes.heading * 1.2,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  transferButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  transferButtonText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  disabledButtonText: {
    opacity: 0.5,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  walletsList: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  walletCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  walletIcon: {
    fontSize: 24,
  },
  walletName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  walletType: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
  },
  walletActions: {
    alignItems: 'flex-end',
  },
  walletBalance: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  primaryBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  primaryBadgeText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.bold,
  },
  walletControls: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  controlButton: {
    flex: 1,
    backgroundColor: Colors.primary + '20',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.error + '20',
  },
  controlButtonText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  deleteButtonText: {
    color: Colors.error,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeButtonSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  typeEmoji: {
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  typeText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
  },
  typeTextSelected: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  walletSelector: {
    gap: Spacing.sm,
  },
  walletSelectorButton: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletSelectorButtonSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  walletSelectorText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textPrimary,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  formCancelButton: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formCancelButtonText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
  },
  formSaveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  formSaveButtonText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
})