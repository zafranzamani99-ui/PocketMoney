import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Modal,
  TextInput,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'

interface Order {
  id: string
  amount: number
  status: 'pending' | 'paid' | 'completed'
  payment_method: string | null
  created_at: string
  notes?: string
  customers?: {
    name: string
    phone: string | null
    email?: string
  }
  order_items?: {
    id: string
    name: string
    price: number
    quantity: number
  }[]
}

interface OrderDetailProps {
  route: {
    params: {
      order: Order
    }
  }
  navigation: any
}

export default function OrderDetailScreen({ route, navigation }: OrderDetailProps) {
  const { order: initialOrder } = route.params
  const [order, setOrder] = useState(initialOrder)
  const { colors } = useTheme()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Refs for input navigation
  const priceInputRef = useRef<TextInput>(null)
  const quantityInputRef = useRef<TextInput>(null)

  // Edit form states
  const [editOrder, setEditOrder] = useState({
    notes: order.notes || '',
    payment_method: order.payment_method || 'cash',
  })

  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    quantity: '1',
  })

  useEffect(() => {
    loadOrderDetails()
  }, [])

  const loadOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, phone, email),
          order_items (id, name, price, quantity)
        `)
        .eq('id', order.id)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error('Error loading order details:', error)
    }
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return colors.accent
      case 'paid': return colors.primary
      case 'completed': return colors.success
      default: return colors.textSecondary
    }
  }

  const getStatusEmoji = (status: Order['status']) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'paid': return '💰'
      case 'completed': return '✅'
      default: return '📝'
    }
  }

  const updateOrderStatus = async (newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id)

      if (error) throw error
      
      setOrder({ ...order, status: newStatus })
      Alert.alert('Success', `Order status updated to ${newStatus}`)
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status')
      console.error(error)
    }
  }

  const handleStatusUpdate = (newStatus: Order['status']) => {
    const statusText = newStatus.charAt(0).toUpperCase() + newStatus.slice(1)
    Alert.alert(
      'Update Status',
      `Mark this order as ${statusText}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => updateOrderStatus(newStatus),
        },
      ]
    )
  }

  const handleCallCustomer = () => {
    if (order.customers?.phone) {
      Linking.openURL(`tel:${order.customers.phone}`)
    }
  }

  const handleWhatsAppCustomer = () => {
    if (order.customers?.phone) {
      const phoneNumber = order.customers.phone.replace(/[^\d]/g, '')
      const url = `whatsapp://send?phone=60${phoneNumber}&text=Hi ${order.customers.name}, regarding your order...`
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'WhatsApp is not installed')
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-MY', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-MY', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const saveOrderChanges = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_method: editOrder.payment_method,
          notes: editOrder.notes || null,
        })
        .eq('id', order.id)

      if (error) throw error

      setOrder({
        ...order,
        payment_method: editOrder.payment_method,
        notes: editOrder.notes,
      })
      setShowEditModal(false)
      Alert.alert('Success', 'Order updated successfully!')
    } catch (error) {
      Alert.alert('Error', 'Failed to update order')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const addItem = async () => {
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

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          name: newItem.name,
          price: price,
          quantity: quantity,
        })
        .select()
        .single()

      if (error) throw error

      // Update order total
      const newTotal = order.amount + (price * quantity)
      await supabase
        .from('orders')
        .update({ amount: newTotal })
        .eq('id', order.id)

      setShowItemModal(false)
      setNewItem({name: '', price: '', quantity: '1'})
      loadOrderDetails()
      Alert.alert('Success', 'Item added successfully!')
    } catch (error) {
      Alert.alert('Error', 'Failed to add item')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const updateItem = async () => {
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

    setLoading(true)
    try {
      const { error } = await supabase
        .from('order_items')
        .update({
          name: newItem.name,
          price: price,
          quantity: quantity,
        })
        .eq('id', editingItem.id)

      if (error) throw error

      // Recalculate order total
      const { data: items } = await supabase
        .from('order_items')
        .select('price, quantity')
        .eq('order_id', order.id)

      if (items) {
        const newTotal = items.reduce((sum: number, item: any) => 
          sum + (item.price * item.quantity), 0)
        await supabase
          .from('orders')
          .update({ amount: newTotal })
          .eq('id', order.id)
      }

      setShowItemModal(false)
      setEditingItem(null)
      setNewItem({name: '', price: '', quantity: '1'})
      loadOrderDetails()
      Alert.alert('Success', 'Item updated successfully!')
    } catch (error) {
      Alert.alert('Error', 'Failed to update item')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              const { error } = await supabase
                .from('order_items')
                .delete()
                .eq('id', editingItem.id)

              if (error) throw error

              // Recalculate order total
              const { data: items } = await supabase
                .from('order_items')
                .select('price, quantity')
                .eq('order_id', order.id)

              const newTotal = items ? items.reduce((sum: number, item: any) => 
                sum + (item.price * item.quantity), 0) : 0
              
              await supabase
                .from('orders')
                .update({ amount: newTotal })
                .eq('id', order.id)

              setShowItemModal(false)
              setEditingItem(null)
              setNewItem({name: '', price: '', quantity: '1'})
              loadOrderDetails()
              Alert.alert('Success', 'Item deleted successfully!')
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item')
              console.error(error)
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  const { date, time } = formatDate(order.created_at)
  const styles = createStyles(colors)

  // Create a scrollable container that works on all platforms
  const ScrollableContainer = ({ children }: { children: React.ReactNode }) => {
    if (Platform.OS === 'web') {
      return (
        <div style={{
          flex: 1,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          height: '100%',
          maxHeight: 'calc(100vh - 100px)'
        }}>
          {children}
        </div>
      )
    } else {
      return (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEnabled={!showItemModal}
        >
          {children}
        </ScrollView>
      )
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setShowEditModal(true)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollableContainer>
        <LinearGradient
          colors={[getStatusColor(order.status) + '20', getStatusColor(order.status) + '10']}
          style={styles.orderCard}
        >
          <Text style={styles.orderEmoji}>{getStatusEmoji(order.status)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {order.status.toUpperCase()}
          </Text>
          <Text style={styles.orderAmount}>RM {order.amount.toFixed(2)}</Text>
        </LinearGradient>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order ID</Text>
            <Text style={styles.detailValue}>#{order.id.slice(-8).toUpperCase()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{date}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{time}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>RM {order.amount.toFixed(2)}</Text>
          </View>

          {order.payment_method && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{order.payment_method}</Text>
            </View>
          )}

          {order.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.detailValue}>{order.notes}</Text>
            </View>
          )}
        </View>

        {/* Order Items */}
        {order.order_items && order.order_items.length > 0 && (
          <View style={styles.itemsCard}>
            <View style={styles.itemsHeader}>
              <Text style={styles.sectionTitle}>Items</Text>
              <TouchableOpacity 
                style={styles.addItemButton}
                onPress={() => setShowItemModal(true)}
              >
                <Text style={styles.addItemText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            
            {order.order_items.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => {
                  setEditingItem(item)
                  setNewItem({
                    name: item.name,
                    price: item.price.toString(),
                    quantity: item.quantity.toString(),
                  })
                  setShowItemModal(true)
                }}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} × RM {item.price.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  RM {(item.quantity * item.price).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Add Item Section for orders with no items */}
        {(!order.order_items || order.order_items.length === 0) && (
          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.emptyItemsContainer}>
              <Text style={styles.emptyItemsText}>No items added yet</Text>
              <TouchableOpacity 
                style={styles.addItemButton}
                onPress={() => setShowItemModal(true)}
              >
                <Text style={styles.addItemText}>+ Add First Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {order.customers && (
          <View style={styles.customerCard}>
            <Text style={styles.sectionTitle}>Customer</Text>
            
            <View style={styles.customerInfo}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerInitial}>
                  {order.customers.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>{order.customers.name}</Text>
                {order.customers.phone && (
                  <Text style={styles.customerPhone}>{order.customers.phone}</Text>
                )}
                {order.customers.email && (
                  <Text style={styles.customerEmail}>{order.customers.email}</Text>
                )}
              </View>
            </View>

            {order.customers.phone && (
              <View style={styles.customerActions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleCallCustomer}>
                  <Text style={styles.actionEmoji}>📞</Text>
                  <Text style={styles.actionText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleWhatsAppCustomer}>
                  <Text style={styles.actionEmoji}>💬</Text>
                  <Text style={styles.actionText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.statusActions}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          
          <View style={styles.statusButtons}>
            {order.status !== 'pending' && (
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}
                onPress={() => handleStatusUpdate('pending')}
              >
                <Text style={styles.statusButtonEmoji}>⏳</Text>
                <Text style={[styles.statusButtonText, { color: colors.accent }]}>
                  Mark Pending
                </Text>
              </TouchableOpacity>
            )}

            {order.status === 'pending' && (
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}
                onPress={() => handleStatusUpdate('paid')}
              >
                <Text style={styles.statusButtonEmoji}>💰</Text>
                <Text style={[styles.statusButtonText, { color: colors.primary }]}>
                  Mark Paid
                </Text>
              </TouchableOpacity>
            )}

            {order.status === 'paid' && (
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}
                onPress={() => handleStatusUpdate('completed')}
              >
                <Text style={styles.statusButtonEmoji}>✅</Text>
                <Text style={[styles.statusButtonText, { color: colors.success }]}>
                  Mark Completed
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollableContainer>

      {/* Edit Order Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Order</Text>

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {[{id: 'cash', label: 'Cash', icon: '💵'}, {id: 'card', label: 'Card', icon: '💳'}, 
                {id: 'ewallet', label: 'E-Wallet', icon: '📱'}, {id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦'}].map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethod,
                    editOrder.payment_method === method.id && styles.paymentMethodActive
                  ]}
                  onPress={() => setEditOrder({...editOrder, payment_method: method.id})}
                >
                  <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                  <Text style={[
                    styles.paymentMethodText,
                    editOrder.payment_method === method.id && styles.paymentMethodTextActive
                  ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Order notes..."
              placeholderTextColor={colors.textSecondary}
              value={editOrder.notes}
              onChangeText={(text) => setEditOrder({...editOrder, notes: text})}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveOrderChanges}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Item Modal */}
      <View style={[styles.modalOverlay, { display: showItemModal ? 'flex' : 'none' }]}>
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss()
          setShowItemModal(false)
          setEditingItem(null)
          setNewItem({name: '', price: '', quantity: '1'})
        }}>
          <View style={styles.modalOverlayBackground} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Item Name *"
              placeholderTextColor={colors.textSecondary}
              value={newItem.name}
              onChangeText={(text) => setNewItem({...newItem, name: text})}
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
              onChangeText={(text) => setNewItem({...newItem, price: text})}
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
              onChangeText={(text) => setNewItem({...newItem, quantity: text})}
              keyboardType="number-pad"
              returnKeyType="done"
              blurOnSubmit={true}
              selectTextOnFocus={true}
              onSubmitEditing={Keyboard.dismiss}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowItemModal(false)
                  setEditingItem(null)
                  setNewItem({name: '', price: '', quantity: '1'})
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              {editingItem && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={deleteItem}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingItem ? updateItem : addItem}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : (editingItem ? 'Update' : 'Add')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? Spacing.md : Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.lg : Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  editButtonText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  orderCard: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.sm,
  },
  orderAmount: {
    fontSize: Typography.fontSizes.display,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  itemsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  addItemButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  addItemText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  emptyItemsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyItemsText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  itemDetails: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  itemTotal: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.success,
  },
  customerCard: {
    backgroundColor: colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  customerInitial: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  customerDetails: {
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
  customerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionEmoji: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  statusActions: {
    backgroundColor: colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusButtons: {
    gap: Spacing.md,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  statusButtonEmoji: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  statusButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalOverlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
    width: '100%',
    zIndex: 1001,
  },
  modalTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  paymentMethod: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  paymentMethodIcon: {
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  paymentMethodText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  paymentMethodTextActive: {
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  saveButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  cancelButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  saveButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  deleteButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
})