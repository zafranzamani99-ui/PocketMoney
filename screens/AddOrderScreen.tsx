import React, { useState, useEffect, useCallback } from 'react'
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
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'

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

export default function AddOrderScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)

  // Order details
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')

  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
  })

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

  const updateNewCustomerName = useCallback((text: string) => {
    setNewCustomer(prev => ({ ...prev, name: text }))
  }, [])

  const updateNewCustomerPhone = useCallback((text: string) => {
    setNewCustomer(prev => ({ ...prev, phone: text }))
  }, [])

  const updateNewCustomerEmail = useCallback((text: string) => {
    setNewCustomer(prev => ({ ...prev, email: text }))
  }, [])

  const updateNewItemName = useCallback((text: string) => {
    setNewItem(prev => ({ ...prev, name: text }))
  }, [])

  const updateNewItemPrice = useCallback((text: string) => {
    setNewItem(prev => ({ ...prev, price: text }))
  }, [])

  const updateNewItemQuantity = useCallback((text: string) => {
    setNewItem(prev => ({ ...prev, quantity: text }))
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

  const addCustomer = async () => {
    if (!newCustomer.name.trim()) {
      Alert.alert('Error', 'Customer name is required')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { data, error } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: newCustomer.name,
          phone: newCustomer.phone || null,
          email: newCustomer.email || null,
        })
        .select()
        .single()

      if (error) throw error

      setNewCustomer({ name: '', phone: '', email: '' })
      setShowCustomerModal(false)
      loadCustomers()
      setSelectedCustomer(data)
      Alert.alert('Success', 'Customer added successfully!')
    } catch (error) {
      Alert.alert('Error', 'Failed to add customer')
      console.error(error)
    }
  }

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
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer')
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
          customer_id: selectedCustomer.id,
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
        `Order for ${selectedCustomer.name} created successfully!\n\nTotal: RM ${total.toFixed(2)}`,
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

  // Create a scrollable container that works on all platforms
  const ScrollableContainer = ({ children }: { children: React.ReactNode }) => {
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
      const { ScrollView } = require('react-native')
      return (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      )
    }
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
          <Text style={styles.title}>New Order</Text>
          <TouchableOpacity 
            onPress={createOrder} 
            style={styles.saveButton}
            disabled={loading}
          >
            <Text style={styles.saveText}>{loading ? 'Creating...' : 'Create'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Create New Order</Text>
          <Text style={styles.headerSubtitle}>
            Add items and customer details
          </Text>
        </View>
      </LinearGradient>

      <ScrollableContainer>
        <View style={styles.content}>
          {/* Customer Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            
            {selectedCustomer ? (
              <View style={styles.selectedCustomer}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                  {selectedCustomer.phone && (
                    <Text style={styles.customerPhone}>📱 {selectedCustomer.phone}</Text>
                  )}
                  {selectedCustomer.email && (
                    <Text style={styles.customerEmail}>✉️ {selectedCustomer.email}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.changeButton}
                  onPress={() => setSelectedCustomer(null)}
                >
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.customerSelector}>
                <ScrollView horizontal style={styles.customersScroll} showsHorizontalScrollIndicator={false}>
                  {customers.map(customer => (
                    <TouchableOpacity
                      key={customer.id}
                      style={styles.customerOption}
                      onPress={() => setSelectedCustomer(customer)}
                    >
                      <Text style={styles.customerOptionName}>{customer.name}</Text>
                      {customer.phone && (
                        <Text style={styles.customerOptionPhone}>{customer.phone}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity 
                    style={styles.addCustomerButton}
                    onPress={() => setShowCustomerModal(true)}
                  >
                    <Text style={styles.addCustomerIcon}>+</Text>
                    <Text style={styles.addCustomerText}>Add Customer</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
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
              style={styles.notesInput}
              placeholder="Add any special instructions or notes..."
              placeholderTextColor={Colors.textSecondary}
              value={notes}
              onChangeText={updateNotes}
              multiline
              blurOnSubmit={false}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
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
        </View>
      </ScrollableContainer>

      {/* Add Customer Modal */}
      <Modal visible={showCustomerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Customer</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Customer Name *"
              placeholderTextColor={Colors.textSecondary}
              value={newCustomer.name}
              onChangeText={updateNewCustomerName}
              returnKeyType="next"
              blurOnSubmit={false}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number"
              placeholderTextColor={Colors.textSecondary}
              value={newCustomer.phone}
              onChangeText={updateNewCustomerPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
              blurOnSubmit={false}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Email Address"
              placeholderTextColor={Colors.textSecondary}
              value={newCustomer.email}
              onChangeText={updateNewCustomerEmail}
              keyboardType="email-address"
              returnKeyType="done"
              autoCapitalize="none"
              blurOnSubmit={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCustomerModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addCustomer}
              >
                <Text style={styles.confirmButtonText}>Add Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal visible={showItemModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Item</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Item Name *"
              placeholderTextColor={Colors.textSecondary}
              value={newItem.name}
              onChangeText={updateNewItemName}
              returnKeyType="next"
              blurOnSubmit={false}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Price (RM) *"
              placeholderTextColor={Colors.textSecondary}
              value={newItem.price}
              onChangeText={updateNewItemPrice}
              keyboardType="decimal-pad"
              returnKeyType="next"
              blurOnSubmit={false}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Quantity"
              placeholderTextColor={Colors.textSecondary}
              value={newItem.quantity}
              onChangeText={updateNewItemQuantity}
              keyboardType="number-pad"
              returnKeyType="done"
              blurOnSubmit={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowItemModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addItem}
              >
                <Text style={styles.confirmButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  saveText: {
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
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  selectedCustomer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  customerPhone: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  customerEmail: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  changeButton: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  changeButtonText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
  },
  customerSelector: {},
  customersScroll: {
    marginBottom: Spacing.md,
  },
  customerOption: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginRight: Spacing.md,
    minWidth: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customerOptionName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  customerOptionPhone: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  addCustomerButton: {
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  addCustomerIcon: {
    fontSize: 20,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  addCustomerText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
  },
  addItemButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  addItemText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  orderItem: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  itemPrice: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quantityButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  quantityText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
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
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.error,
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyItemsText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  emptyItemsSubtext: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  paymentMethod: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  paymentMethodIcon: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  paymentMethodText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  paymentMethodTextActive: {
    color: Colors.primary,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  orderSummary: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
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
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
  },
  summaryLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  totalLabel: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  cancelButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  confirmButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
})