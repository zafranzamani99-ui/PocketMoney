import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
import { RootStackParamList } from '../navigation/AppNavigator'
import { ButtonContainer, PrimaryButton, SecondaryButton } from '../components/buttons'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

// Create a scrollable container that works on all platforms
const ScrollableContainer = ({ children, scrollViewRef }: { children: React.ReactNode, scrollViewRef?: React.RefObject<ScrollView> }) => {
  if (Platform.OS === 'web') {
    return (
      <div style={{
        flex: 1,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        height: '100%',
        maxHeight: 'calc(100vh - 200px)'
      }}>
        {children}
      </div>
    )
  } else {
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={true}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          enableOnAndroid={true}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }
}

export default function AddOrderScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  
  // Refs for input navigation
  const priceInputRef = useRef<TextInput>(null)
  const quantityInputRef = useRef<TextInput>(null)
  const notesInputRef = useRef<TextInput>(null)
  const scrollViewRef = useRef<ScrollView>(null)
  const [loading, setLoading] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Order details
  const [customerName, setCustomerName] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')


  // New item form
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    quantity: '1',
  })

  // Memoized handlers to prevent input focus loss
  const updateNotes = useCallback((text: string) => {
    setNotes(text)
  }, [])

  const updateCustomerName = useCallback((text: string) => {
    setCustomerName(text)
    setShowSuggestions(text.length > 0)
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const getFilteredCustomers = () => {
    if (!customerName) return []
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(customerName.toLowerCase())
    ).slice(0, 5) // Show max 5 suggestions
  }

  const selectCustomer = (customer: Customer) => {
    setCustomerName(customer.name)
    setShowSuggestions(false)
  }

  const updateNewItemName = useCallback((text: string) => {
    setNewItem(prev => ({ ...prev, name: text }))
  }, [])

  const updateNewItemPrice = useCallback((text: string) => {
    setNewItem(prev => ({ ...prev, price: text }))
  }, [])

  const updateNewItemQuantity = useCallback((text: string) => {
    setNewItem(prev => ({ ...prev, quantity: text }))
  }, [])



  const addItem = () => {
    if (!newItem.name.trim() || !newItem.price.trim()) {
      Alert.alert('Error', 'Item name and price are required')
      return
    }

    const price = parseFloat(newItem.price)
    const quantity = parseInt(newItem.quantity) || 1

    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price')
      return
    }

    const item: OrderItem = {
      id: Date.now().toString(),
      name: newItem.name,
      price,
      quantity,
    }

    setOrderItems([...orderItems, item])
    setNewItem({ name: '', price: '', quantity: '1' })
    setShowItemModal(false)
  }

  const removeItem = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId))
  }

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }

    setOrderItems(orderItems.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ))
  }

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const createOrder = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter a customer name')
      return
    }

    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const total = calculateTotal()

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          customer_name: customerName,
          amount: total,
          status: 'pending',
          payment_method: paymentMethod,
          notes: notes || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Add order items
      const orderItemsData = orderItems.map(item => ({
        order_id: orderData.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)

      if (itemsError) throw itemsError

      Alert.alert(
        'Order Created',
        `Order for ${customerName} created successfully!\n\nTotal: RM ${total.toFixed(2)}`,
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to create order')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: '💵' },
    { id: 'card', label: 'Card', icon: '💳' },
    { id: 'ewallet', label: 'E-Wallet', icon: '📱' },
    { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  ]

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
          <Text style={styles.title}>New Order</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Create New Order</Text>
          <Text style={styles.headerSubtitle}>
            Add items and customer details
          </Text>
        </View>
      </LinearGradient>

      <ScrollableContainer scrollViewRef={scrollViewRef}>
        <View style={styles.content}>
          {/* Customer Name Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Name</Text>
            <View style={styles.customerInputContainer}>
              <TextInput
                style={styles.customerInput}
                value={customerName}
                onChangeText={updateCustomerName}
                placeholder="Enter customer name"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="next"
                autoCapitalize="words"
                autoCorrect={false}
                selectTextOnFocus={true}
                onFocus={() => setShowSuggestions(customerName.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              
              {/* Customer Suggestions Dropdown */}
              {showSuggestions && getFilteredCustomers().length > 0 && (
                <View style={styles.suggestionsDropdown}>
                  {getFilteredCustomers().map((customer) => (
                    <TouchableOpacity
                      key={customer.id}
                      style={styles.suggestionItem}
                      onPress={() => selectCustomer(customer)}
                    >
                      <Text style={styles.suggestionName}>{customer.name}</Text>
                      {customer.phone && (
                        <Text style={styles.suggestionPhone}>{customer.phone}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <Text style={styles.customerNote}>
              Manage customers in the CRM section
            </Text>
          </View>

          {/* Order Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Items</Text>
              <TouchableOpacity 
                style={styles.addItemButton}
                onPress={() => setShowItemModal(true)}
              >
                <Text style={styles.addItemText}>+ Add Item</Text>
              </TouchableOpacity>
            </View>

            {orderItems.map(item => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>RM {item.price.toFixed(2)} each</Text>
                </View>
                
                <View style={styles.quantityControls}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => updateItemQuantity(item.id, item.quantity - 1)}
                  >
                    <Text style={styles.quantityButtonText}>−</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.itemTotal}>
                  <Text style={styles.itemTotalText}>RM {(item.price * item.quantity).toFixed(2)}</Text>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeItem(item.id)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {orderItems.length === 0 && (
              <View style={styles.emptyItems}>
                <Text style={styles.emptyItemsText}>No items added yet</Text>
                <Text style={styles.emptyItemsSubtext}>Tap "Add Item" to start building the order</Text>
              </View>
            )}
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {paymentMethods.map(method => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethod,
                    paymentMethod === method.id && styles.paymentMethodActive
                  ]}
                  onPress={() => setPaymentMethod(method.id)}
                >
                  <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                  <Text style={[
                    styles.paymentMethodText,
                    paymentMethod === method.id && styles.paymentMethodTextActive
                  ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              ref={notesInputRef}
              style={styles.notesInput}
              placeholder="Add any special instructions or notes..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={updateNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              blurOnSubmit={false}
              autoCorrect={true}
              autoCapitalize="sentences"
              selectTextOnFocus={true}
              returnKeyType="default"
            />
          </View>

          {/* Order Summary */}
          {orderItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.orderSummary}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items ({orderItems.length})</Text>
                  <Text style={styles.summaryValue}>RM {calculateTotal().toFixed(2)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>RM {calculateTotal().toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.section}>
            <View style={styles.actionButtons}>
              <SecondaryButton 
                title="Cancel" 
                onPress={() => navigation.goBack()}
              />
              <PrimaryButton 
                title="Create Order" 
                onPress={createOrder}
                loading={loading}
                disabled={!customerName.trim() || orderItems.length === 0}
              />
            </View>
          </View>
        </View>
      </ScrollableContainer>


      {/* Add Item Modal */}
      <Modal visible={showItemModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss()
          setShowItemModal(false)
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Item</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Item Name *"
              placeholderTextColor={colors.textSecondary}
              value={newItem.name}
              onChangeText={updateNewItemName}
              returnKeyType="next"
              blurOnSubmit={false}
              autoCapitalize="words"
              autoCorrect={false}
              selectTextOnFocus={true}
              onSubmitEditing={() => priceInputRef.current?.focus()}
            />

            <TextInput
              ref={priceInputRef}
              style={styles.modalInput}
              placeholder="Price (RM) *"
              placeholderTextColor={colors.textSecondary}
              value={newItem.price}
              onChangeText={updateNewItemPrice}
              keyboardType="decimal-pad"
              returnKeyType="next"
              blurOnSubmit={false}
              selectTextOnFocus={true}
              onSubmitEditing={() => quantityInputRef.current?.focus()}
            />

            <TextInput
              ref={quantityInputRef}
              style={styles.modalInput}
              placeholder="Quantity"
              placeholderTextColor={colors.textSecondary}
              value={newItem.quantity}
              onChangeText={updateNewItemQuantity}
              keyboardType="number-pad"
              returnKeyType="done"
              blurOnSubmit={true}
              selectTextOnFocus={true}
              onSubmitEditing={Keyboard.dismiss}
            />

            <View style={styles.modalActions}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setShowItemModal(false)}
                size="small"
              />
              <PrimaryButton
                title="Add Item"
                onPress={addItem}
                size="small"
              />
            </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xxl, // Add top padding to avoid notch
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
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 40, // Same width as backButton for symmetry
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
  content: {
    paddingVertical: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.lg,
  },
  selectedCustomer: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  customerPhone: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  customerEmail: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  changeButton: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  changeButtonText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.primary,
  },
  customerSelector: {},
  customersScroll: {
    marginBottom: Spacing.md,
  },
  customerOption: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginRight: Spacing.md,
    minWidth: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerOptionName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  customerOptionPhone: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  addCustomerButton: {
    backgroundColor: colors.primary + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  addCustomerIcon: {
    fontSize: 20,
    color: colors.primary,
    marginBottom: Spacing.xs,
  },
  addCustomerText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.primary,
  },
  customerInputContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  customerInput: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.sm,
  },
  customerNote: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    zIndex: 1001,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  suggestionItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  suggestionPhone: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  addItemButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  addItemText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  orderItem: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  itemPrice: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  quantityText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
    marginHorizontal: Spacing.md,
    minWidth: 20,
    textAlign: 'center',
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  itemTotalText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.success,
    marginBottom: Spacing.xs,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.medium,
    color: colors.error,
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyItemsText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  emptyItemsSubtext: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  paymentMethod: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  paymentMethodText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  paymentMethodTextActive: {
    color: colors.primary,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  orderSummary: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
  },
  summaryLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  totalLabel: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.success,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
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
  modalInput: {
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
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
})