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
} from 'react-native'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { supabase } from '../lib/supabase'

interface AddExpenseModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

const categories = [
  '🍽️ Food & Beverages',
  '🚗 Transport',
  '📦 Inventory',
  '💡 Utilities',
  '📱 Marketing',
  '🏢 Rent',
  '🔧 Equipment',
  '📄 Office Supplies',
  '👥 Staff',
  '🏦 Banking',
  '📊 Professional Services',
  '🎯 Other',
]

interface Wallet {
  id: string
  name: string
  type: 'cash' | 'bank' | 'ewallet' | 'credit'
  balance: number
}

export default function AddExpenseModal({ visible, onClose, onSuccess }: AddExpenseModalProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedWallet, setSelectedWallet] = useState('')
  const [loading, setLoading] = useState(false)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [walletsLoading, setWalletsLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      loadWallets()
    }
  }, [visible])

  const loadWallets = async () => {
    setWalletsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { data, error } = await supabase
        .from('wallets')
        .select('id, name, type, balance')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('name')

      if (error) throw error
      setWallets(data || [])
      
      // Set default wallet to the first one (primary wallet)
      if (data && data.length > 0 && !selectedWallet) {
        setSelectedWallet(data[0].id)
      }
    } catch (error) {
      console.error('Error loading wallets:', error)
      Alert.alert('Error', 'Failed to load wallets')
    } finally {
      setWalletsLoading(false)
    }
  }

  const calculatorButtons = [
    ['C', '⌫', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['00', '0', '.', '='],
  ]

  const safeEvaluate = (expression: string): number => {
    // Replace display operators with JavaScript operators
    const jsExpression = expression.replace(/×/g, '*').replace(/÷/g, '/')
    
    // Basic validation - only allow numbers, operators, parentheses, and decimal points
    const allowedChars = /^[0-9+\-*/.() %]+$/
    if (!allowedChars.test(jsExpression)) {
      throw new Error('Invalid characters in expression')
    }
    
    // Use Function constructor as safer alternative to eval
    try {
      const result = new Function('return ' + jsExpression)()
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid result')
      }
      return result
    } catch (error) {
      throw new Error('Calculation error')
    }
  }

  const handleCalculatorPress = (value: string) => {
    if (value === 'C') {
      setAmount('')
    } else if (value === '⌫') {
      setAmount(prev => prev.slice(0, -1))
    } else if (value === '=') {
      try {
        const result = safeEvaluate(amount)
        setAmount(result.toString())
      } catch {
        Alert.alert('Error', 'Invalid calculation')
      }
    } else if (['+', '-', '×', '÷', '%'].includes(value)) {
      if (amount && !['+', '-', '×', '÷', '%'].includes(amount.slice(-1))) {
        setAmount(prev => prev + value)
      }
    } else {
      setAmount(prev => prev + value)
    }
  }

  const handleSave = async () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Error', 'Please fill in amount and category')
      return
    }

    const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''))
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        amount: numericAmount,
        category: selectedCategory,
        description: description.trim() || null,
        wallet_id: selectedWallet,
      })

      if (error) throw error

      Alert.alert('Success', 'Expense added successfully')
      onSuccess()
      resetForm()
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setAmount('')
    setDescription('')
    setSelectedCategory('')
    setSelectedWallet(wallets.length > 0 ? wallets[0].id : '')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Expense</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.disabledButton]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.amountSection}>
            <Text style={styles.sectionLabel}>Amount</Text>
            <View style={styles.amountDisplay}>
              <Text style={styles.currency}>RM</Text>
              <Text style={styles.amountText}>{amount || '0'}</Text>
            </View>
          </View>

          <View style={styles.calculator}>
            {calculatorButtons.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.calculatorRow}>
                {row.map((button) => (
                  <TouchableOpacity
                    key={button}
                    style={[
                      styles.calculatorButton,
                      button === '=' && styles.equalsButton,
                      ['C', '⌫', '%', '÷', '×', '-', '+'].includes(button) && styles.operatorButton,
                    ]}
                    onPress={() => handleCalculatorPress(button)}
                  >
                    <Text style={[
                      styles.calculatorButtonText,
                      button === '=' && styles.equalsButtonText,
                      ['C', '⌫', '%', '÷', '×', '-', '+'].includes(button) && styles.operatorButtonText,
                    ]}>
                      {button}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="What did you buy?"
              placeholderTextColor={Colors.textSecondary}
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === category && styles.categoryButtonTextSelected,
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Wallet</Text>
            {walletsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading wallets...</Text>
              </View>
            ) : (
              <View style={styles.walletList}>
                {wallets.map((wallet) => (
                  <TouchableOpacity
                    key={wallet.id}
                    style={[
                      styles.walletButton,
                      selectedWallet === wallet.id && styles.walletButtonSelected,
                    ]}
                    onPress={() => setSelectedWallet(wallet.id)}
                  >
                    <View style={styles.walletInfo}>
                      <Text style={styles.walletEmoji}>
                        {wallet.type === 'cash' ? '💵' : 
                         wallet.type === 'bank' ? '🏦' : 
                         wallet.type === 'credit' ? '💳' : '📱'}
                      </Text>
                      <View>
                        <Text style={styles.walletName}>{wallet.name}</Text>
                        <Text style={styles.walletBalance}>RM {wallet.balance.toFixed(2)}</Text>
                      </View>
                    </View>
                    {selectedWallet === wallet.id && (
                      <Text style={styles.walletCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
                {wallets.length === 0 && (
                  <View style={styles.emptyWallets}>
                    <Text style={styles.emptyWalletsText}>No wallets found</Text>
                    <Text style={styles.emptyWalletsSubtext}>Please add a wallet first</Text>
                  </View>
                )}
              </View>
            )}
          </View>
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
  saveButton: {
    fontSize: Typography.fontSizes.body,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  sectionLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: Typography.fontSizes.heading,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  amountText: {
    fontSize: Typography.fontSizes.heading * 1.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    minWidth: 100,
  },
  calculator: {
    marginBottom: Spacing.xl,
  },
  calculatorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  calculatorButton: {
    flex: 1,
    height: 60,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  operatorButton: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary + '40',
  },
  equalsButton: {
    backgroundColor: Colors.primary,
  },
  calculatorButtonText: {
    fontSize: Typography.fontSizes.subheading,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  operatorButtonText: {
    color: Colors.primary,
  },
  equalsButtonText: {
    color: Colors.textPrimary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  descriptionInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  categoryButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryButtonText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
  },
  categoryButtonTextSelected: {
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  walletList: {
    gap: Spacing.sm,
  },
  walletButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  walletEmoji: {
    fontSize: 20,
  },
  walletName: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.xs,
  },
  walletCheck: {
    fontSize: Typography.fontSizes.subheading,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  walletBalance: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  loadingContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  emptyWallets: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyWalletsText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.xs,
  },
  emptyWalletsSubtext: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },
})