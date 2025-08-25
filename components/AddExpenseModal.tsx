import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'
import { PrimaryButton, SecondaryButton } from './buttons'

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
  const { colors }: any = useTheme()
  const insets = useSafeAreaInsets()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedWallet, setSelectedWallet] = useState('')
  const [loading, setLoading] = useState(false)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [walletsLoading, setWalletsLoading] = useState(false)
  const windowHeight = Dimensions.get('window').height
  const COLLAPSED_HEIGHT = 380
  const EXPANDED_HEIGHT = windowHeight // no gap
  const sheetHeight = useRef(new Animated.Value(EXPANDED_HEIGHT)).current
  const gestureStartHeight = useRef(EXPANDED_HEIGHT)
  const [expanded, setExpanded] = useState(true)

  const snapTo = (toHeight: number) => {
    Animated.spring(sheetHeight, {
      toValue: toHeight,
      useNativeDriver: false,
      tension: 120,
      friction: 18,
    }).start()
    setExpanded(toHeight > (COLLAPSED_HEIGHT + (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) / 2))
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => (
        Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx)
      ),
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_evt, gesture) => (
        Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx)
      ),
      onPanResponderGrant: () => {
        // @ts-ignore read current value
        sheetHeight.stopAnimation((v: number) => {
          gestureStartHeight.current = v
        })
      },
      onPanResponderMove: (_evt, gesture) => {
        const next = Math.max(
          COLLAPSED_HEIGHT,
          Math.min(EXPANDED_HEIGHT, gestureStartHeight.current - gesture.dy)
        )
        sheetHeight.setValue(next)
      },
      onPanResponderRelease: (_evt, gesture) => {
        const current = gestureStartHeight.current - gesture.dy
        const goingDown = gesture.vy > 0.2 || (gesture.dy > 120 && gesture.vy >= 0)
        const goingUp = gesture.vy < -0.2 || (gesture.dy < -120 && gesture.vy <= 0)
        if (goingDown) {
          snapTo(COLLAPSED_HEIGHT)
        } else if (goingUp) {
          snapTo(EXPANDED_HEIGHT)
        } else {
          // snap to nearest
          const mid = (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2
          snapTo(current < mid ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT)
        }
      },
    })
  ).current

  useEffect(() => {
    if (visible) {
      // reset to expanded with no gap
      sheetHeight.setValue(EXPANDED_HEIGHT)
      setExpanded(true)
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

  const styles = createStyles(colors)

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        {/* Backdrop to close when tapping outside */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        {/* Bottom Sheet */}
        <Animated.View style={[styles.sheet, expanded ? styles.sheetFull : styles.sheetRounded, { height: sheetHeight }]}>
          <SafeAreaView style={styles.sheetInner} edges={['bottom']}>
          {/* Handle (draggable area) */}
          <View style={styles.handleRow} {...panResponder.panHandlers}>
            <View style={styles.handleBg}>
              <View style={styles.handle} />
            </View>
          </View>
          <View style={styles.header} {...panResponder.panHandlers}>
            <TouchableOpacity onPress={handleClose} style={styles.backButton}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add Expense</Text>
            <View style={styles.headerSpacer} />
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
                placeholderTextColor={colors.textSecondary}
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

            {/* Action Buttons */}
            <View style={styles.section}>
              <View style={styles.actionButtons}>
                <SecondaryButton 
                  title="Cancel" 
                  onPress={handleClose}
                />
                <PrimaryButton 
                  title={loading ? 'Saving...' : 'Save'} 
                  onPress={handleSave}
                  loading={loading}
                  disabled={!amount || !selectedCategory}
                />
              </View>
            </View>
          </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject as any,
  },
  sheet: {
    backgroundColor: colors.background,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'stretch',
  },
  sheetRounded: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetFull: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  sheetInner: {
    flex: 1,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 92,
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  handleBg: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  headerSpacer: {
    width: 40, // Same width as back button for symmetry
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
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: Typography.fontSizes.heading,
    color: colors.textSecondary,
    marginRight: Spacing.sm,
  },
  amountText: {
    fontSize: Typography.fontSizes.heading * 1.5,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  operatorButton: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '40',
  },
  equalsButton: {
    backgroundColor: colors.primary,
  },
  calculatorButtonText: {
    fontSize: Typography.fontSizes.subheading,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  operatorButtonText: {
    color: colors.primary,
  },
  equalsButtonText: {
    color: colors.textPrimary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  descriptionInput: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: Spacing.sm,
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
  },
  categoryButtonTextSelected: {
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  walletList: {
    gap: Spacing.sm,
  },
  walletButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
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
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.xs,
  },
  walletCheck: {
    fontSize: Typography.fontSizes.subheading,
    color: colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  walletBalance: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  loadingContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  emptyWallets: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyWalletsText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.xs,
  },
  emptyWalletsSubtext: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
})