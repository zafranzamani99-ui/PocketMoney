import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'
import { usePOSSettings } from '../contexts/POSSettingsContext'
import { supabase } from '../lib/supabase'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')
const isTablet = screenWidth >= 768

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
}

interface PresetItem {
  id: string
  name: string
  price: number
  emoji: string
  color: string
}

interface RecentItem {
  name: string
  price: number
  count: number
}

// Quick preset items for fast selection
const PRESET_ITEMS: PresetItem[] = [
  { id: '1', name: 'Balang Kecil', price: 2.00, emoji: '🥛', color: '#4CAF50' },
  { id: '2', name: 'Balang Besar', price: 5.00, emoji: '🍯', color: '#2196F3' },
  { id: '3', name: 'Botol Air', price: 1.00, emoji: '💧', color: '#00BCD4' },
  { id: '4', name: 'Makanan', price: 3.00, emoji: '🍱', color: '#FF9800' },
  { id: '5', name: 'Minuman', price: 2.50, emoji: '🥤', color: '#9C27B0' },
  { id: '6', name: 'Kuih', price: 1.50, emoji: '🧁', color: '#E91E63' },
  { id: '7', name: 'Roti', price: 2.00, emoji: '🥖', color: '#795548' },
  { id: '8', name: 'Buah', price: 4.00, emoji: '🍎', color: '#4CAF50' },
]

const QUICK_AMOUNTS = [5, 10, 20, 50]
const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', emoji: '💵' },
  { id: 'ewallet', name: 'E-Wallet', emoji: '📱' },
  { id: 'card', name: 'Card', emoji: '💳' },
]

export default function POSScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const { currentEvent } = usePOSSettings()
  const [cart, setCart] = useState<CartItem[]>([])
  const [customAmount, setCustomAmount] = useState('')
  const [selectedPayment, setSelectedPayment] = useState('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [showCalculator, setShowCalculator] = useState(false)
  const [isCartFullScreen, setIsCartFullScreen] = useState(false)

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Lightning-fast preset item addition
  const addPresetItem = (item: PresetItem) => {
    const newCartItem: CartItem = {
      id: Date.now().toString(),
      name: item.name,
      price: item.price,
      quantity: 1,
      category: 'preset'
    }

    const existingIndex = cart.findIndex(cartItem => 
      cartItem.name === item.name && cartItem.price === item.price
    )

    if (existingIndex >= 0) {
      const updatedCart = [...cart]
      updatedCart[existingIndex].quantity += 1
      setCart(updatedCart)
    } else {
      setCart([...cart, newCartItem])
    }
  }

  // Quick custom amount entry
  const addCustomAmount = (amount: number, name: string = 'Custom Item') => {
    const newItem: CartItem = {
      id: Date.now().toString(),
      name: name,
      price: amount,
      quantity: 1,
      category: 'custom'
    }
    setCart([...cart, newItem])
    setCustomAmount('')
  }

  const updateQuantity = (id: string, change: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + change)
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null
      }
      return item
    }).filter(Boolean) as CartItem[])
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const clearCart = () => {
    setCart([])
  }

  // Lightning-fast sale processing
  const processSale = async () => {
    if (cart.length === 0) {
      Alert.alert('Add items first!')
      return
    }

    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const { error } = await supabase.from('orders').insert({
        user_id: user.id,
        amount: cartTotal,
        payment_method: selectedPayment,
        status: 'completed',
        items: cart
      })

      if (error) throw error

      const totalAmount = cartTotal
      clearCart()
      setIsCartFullScreen(false)
      
      Alert.alert(
        '✅ PAYMENT RECEIVED!',
        `Successfully received RM${totalAmount.toFixed(2)}. Transaction completed.`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      Alert.alert('Error', 'Sale failed. Try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Calculator-style number input
  const NumberPad = () => {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '⌫']
    
    const handleNumberPress = (num: string) => {
      if (num === '⌫') {
        setCustomAmount(customAmount.slice(0, -1))
      } else if (num === '.' && customAmount.includes('.')) {
        return
      } else {
        setCustomAmount(customAmount + num)
      }
    }

    return (
      <View style={styles.numberPad}>
        {numbers.map((num, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.numberButton, num === '⌫' && styles.deleteButton]}
            onPress={() => handleNumberPress(num)}
          >
            <Text style={[styles.numberText, num === '⌫' && styles.deleteText]}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.addCustomButton}
          onPress={() => {
            const amount = parseFloat(customAmount)
            if (amount > 0) addCustomAmount(amount)
          }}
          disabled={!customAmount || parseFloat(customAmount) <= 0}
        >
          <Text style={styles.addCustomText}>ADD RM{customAmount || '0'}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container} edges={isTablet ? ['top'] : ['top', 'bottom']}>
      <View style={[styles.wrapper, isTablet && styles.tabletWrapper]}>
        {/* LIGHTNING FAST POS HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Point of Sales</Text>
          <View style={styles.headerRight}>
            <Text style={styles.total}>RM {cartTotal.toFixed(2)}</Text>
            {cart.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
                <Text style={styles.clearText}>CLEAR</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      {/* TOP CART - COMPACT WITH FULLSCREEN BUTTON */}
      {cart.length > 0 && !isCartFullScreen && (
        <View style={styles.topCart}>
          <TouchableOpacity style={styles.cartSummary} onPress={() => setIsCartFullScreen(true)}>
            <Text style={styles.cartTitle}>
              {cartItemCount} ITEMS • RM{cartTotal.toFixed(2)}
            </Text>
            <Text style={styles.viewCartText}>VIEW CART</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FULLSCREEN CART MODAL */}
      {isCartFullScreen && (
        <View style={styles.fullScreenCart}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartHeaderTitle}>Your Order</Text>
          </View>
          
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id}
            style={styles.fullCartList}
            renderItem={({ item }) => (
              <View style={styles.fullCartItem}>
                <View style={styles.cartItemLeft}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>RM{item.price} × {item.quantity}</Text>
                </View>
                <View style={styles.cartItemRight}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
                    <Text style={styles.qtyText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
                    <Text style={styles.qtyText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromCart(item.id)}>
                    <Text style={styles.removeText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
          
          <View style={styles.cartTotal}>
            <Text style={styles.totalText}>TOTAL: RM{cartTotal.toFixed(2)}</Text>
          </View>

          <View style={styles.fullScreenActions}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setIsCartFullScreen(false)}
            >
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.receiveBtn, isProcessing && styles.receiveBtnDisabled]}
              onPress={processSale}
              disabled={isProcessing}
            >
              <Text style={styles.receiveText}>
                {isProcessing ? 'PROCESSING...' : 'RECEIVE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MAIN CONTENT - FULL WIDTH */}
      {!isCartFullScreen && (
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* QUICK PRESET ITEMS */}
        <Text style={styles.sectionTitle}>QUICK ITEMS</Text>
        <View style={styles.presetGrid}>
          {currentEvent.quickItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.presetItem, { backgroundColor: item.color + '20', borderColor: item.color }]}
              onPress={() => addPresetItem(item)}
            >
              <Text style={styles.presetEmoji}>{item.emoji}</Text>
              <Text style={styles.presetName}>{item.name}</Text>
              <Text style={[styles.presetPrice, { color: item.color }]}>RM{item.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* QUICK AMOUNTS */}
        <Text style={styles.sectionTitle}>QUICK AMOUNTS</Text>
        <View style={styles.quickAmounts}>
          {currentEvent.quickAmounts.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={styles.quickAmount}
              onPress={() => addCustomAmount(amount, `RM${amount} Item`)}
            >
              <Text style={styles.quickAmountText}>RM{amount}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CALCULATOR */}
        <Text style={styles.sectionTitle}>CUSTOM AMOUNT</Text>
        <View style={styles.customAmount}>
          <Text style={styles.customAmountDisplay}>RM {customAmount || '0.00'}</Text>
        </View>
        <NumberPad />
        </ScrollView>
      )}

      {/* BOTTOM CONFIRM */}
      {cart.length > 0 && !isCartFullScreen && (
        <View style={styles.bottomConfirm}>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => setIsCartFullScreen(true)}
          >
            <Text style={styles.confirmText}>
              CONFIRM ORDER (RM{cartTotal.toFixed(2)})
            </Text>
          </TouchableOpacity>
        </View>
      )}
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
  },
  wrapper: {
    flex: 1,
  },
  tabletWrapper: {
    maxWidth: '98%',
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTablet ? Spacing.lg : Spacing.sm,
    paddingVertical: isTablet ? Spacing.md : Spacing.sm,
    backgroundColor: colors.primary,
    marginHorizontal: isTablet ? 0 : Spacing.sm,
    marginTop: isTablet ? 0 : Spacing.xs,
    marginBottom: isTablet ? Spacing.sm : Spacing.md,
    borderRadius: isTablet ? 0 : BorderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  backIcon: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  title: {
    fontSize: isTablet ? Typography.fontSizes.display : Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
    flex: 1,
    textAlign: 'left',
    marginLeft: Spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  total: {
    fontSize: isTablet ? Typography.fontSizes.heading : Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  clearBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.sm,
    minWidth: 65,
    alignItems: 'center',
  },
  clearText: {
    color: colors.light,
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSizes.bodySmall,
  },
  topCart: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  cartDetails: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: Spacing.xs,
    overflow: 'hidden',
    padding: Spacing.sm,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  bottomConfirm: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: isTablet ? Spacing.sm : Spacing.xs,
  },
  sectionTitle: {
    fontSize: isTablet ? Typography.fontSizes.body : Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textSecondary,
    marginBottom: isTablet ? Spacing.md : Spacing.sm,
    letterSpacing: 1,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
    justifyContent: 'space-between',
  },
  presetItem: {
    width: '23%',
    aspectRatio: 0.85,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetEmoji: {
    fontSize: isTablet ? 24 : 16,
    marginBottom: 2,
  },
  presetName: {
    fontSize: isTablet ? Typography.fontSizes.bodySmall : Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  presetPrice: {
    fontSize: isTablet ? Typography.fontSizes.bodySmall : Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: isTablet ? Spacing.md : Spacing.sm,
    marginBottom: isTablet ? Spacing.xl : Spacing.lg,
  },
  quickAmount: {
    flex: 1,
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: isTablet ? BorderRadius.lg : BorderRadius.md,
    paddingVertical: isTablet ? Spacing.lg : Spacing.md,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: isTablet ? Typography.fontSizes.subheading : Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.primary,
  },
  customAmount: {
    backgroundColor: colors.background,
    borderRadius: isTablet ? BorderRadius.lg : BorderRadius.md,
    padding: isTablet ? Spacing.lg : Spacing.md,
    alignItems: 'center',
    marginBottom: isTablet ? Spacing.lg : Spacing.md,
  },
  customAmountDisplay: {
    fontSize: isTablet ? Typography.fontSizes.display * 1.2 : Typography.fontSizes.display,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  // Number pad styles
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTablet ? Spacing.sm : Spacing.xs,
  },
  numberButton: {
    width: '31%',
    aspectRatio: isTablet ? 1.5 : 1.2,
    backgroundColor: colors.background,
    borderRadius: isTablet ? BorderRadius.lg : BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  deleteButton: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error,
  },
  numberText: {
    fontSize: isTablet ? Typography.fontSizes.display : Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  deleteText: {
    color: colors.error,
  },
  addCustomButton: {
    width: '100%',
    backgroundColor: colors.success,
    borderRadius: isTablet ? BorderRadius.lg : BorderRadius.md,
    paddingVertical: isTablet ? Spacing.lg : Spacing.md,
    alignItems: 'center',
    marginTop: isTablet ? Spacing.md : Spacing.sm,
  },
  addCustomText: {
    fontSize: isTablet ? Typography.fontSizes.subheading : Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  // Cart styles
  cartTitle: {
    fontSize: isTablet ? Typography.fontSizes.subheading : Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  cartList: {
    flex: 1,
    maxHeight: isTablet ? 200 : 150,
    marginBottom: Spacing.sm,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartItemLeft: {
    flex: 1,
  },
  cartItemName: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  cartItemPrice: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  cartItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  qtyBtn: {
    width: isTablet ? 32 : 28,
    height: isTablet ? 32 : 28,
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  qty: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    width: isTablet ? 32 : 28,
    height: isTablet ? 32 : 28,
    backgroundColor: colors.error,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  removeText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  // Checkout styles
  checkout: {
    marginTop: 'auto',
  },
  paymentTitle: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  paymentBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  paymentBtnActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  paymentEmoji: {
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  paymentText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  paymentTextActive: {
    color: colors.primary,
  },
  checkoutBtn: {
    backgroundColor: colors.success,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkoutBtnDisabled: {
    backgroundColor: colors.textSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  checkoutText: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  cartSummary: {
    backgroundColor: colors.primary + '25',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  viewCartBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  viewCartText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  fullScreenCart: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 1000,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cartHeaderTitle: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  confirmText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
    textAlign: 'center',
  },
  fullScreenActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: isTablet ? Spacing.md : Spacing.sm,
  },
  cancelBtn: {
    backgroundColor: colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    flex: 1,
  },
  cancelText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.light,
  },
  receiveBtn: {
    backgroundColor: colors.success,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    flex: 2,
  },
  receiveBtnDisabled: {
    opacity: 0.6,
  },
  receiveText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  fullCartList: {
    flex: 1,
  },
  fullCartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: colors.surface,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartTotal: {
    backgroundColor: colors.primary + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  totalText: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.primary,
  },
})