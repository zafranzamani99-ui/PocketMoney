import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Platform,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const { width: screenWidth } = Dimensions.get('window')
const isTablet = screenWidth >= 768
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'
import CalendarFilter from '../components/CalendarFilter'
import StandardizedHeader from '../components/StandardizedHeader'
import PaymentConfirmationModal from '../components/PaymentConfirmationModal'
import OrderCompletionModal from '../components/OrderCompletionModal'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface Order {
  id: string
  amount: number
  status: 'pending' | 'paid' | 'completed'
  payment_method: string | null
  created_at: string
  customers?: {
    name: string
    phone: string | null
  }
}

interface Colors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  surfaceElevated: string
  textPrimary: string
  textSecondary: string
  success: string
  warning: string
  error: string
  border: string
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContainer: {
    flex: 1,
  },
  tabletContainer: {
    maxWidth: '95%',
    alignSelf: 'center',
    width: '100%',
  },
  
  // Header Controls
  headerControls: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateButtonActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  dateButtonIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  dateButtonText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  dateButtonTextActive: {
    color: colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },

  // Quick Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },

  // Search & Filters
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  filterButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.semiBold,
  },

  // Orders List
  ordersList: {
    flex: 1,
  },
  ordersListContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  
  // Beautiful Order Cards
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  
  orderMainInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  orderSeparator: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
    marginHorizontal: Spacing.xs,
  },
  
  orderAmountSection: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.success,
    marginBottom: 2,
  },
  
  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  statusBadgePending: {
    backgroundColor: colors.warning + '20',
  },
  statusBadgePaid: {
    backgroundColor: colors.primary + '20',
  },
  statusBadgeCompleted: {
    backgroundColor: colors.success + '20',
  },
  statusEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.semiBold,
  },
  statusTextPending: {
    color: colors.warning,
  },
  statusTextPaid: {
    color: colors.primary,
  },
  statusTextCompleted: {
    color: colors.success,
  },

  // Order Details Section  
  orderDetailsSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  paymentMethodIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
    width: 16,
  },
  paymentMethodText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },

  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  phoneIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
    width: 16,
  },
  phoneText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },

  // Action Buttons
  orderActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonWithBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  actionButtonText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.primary,
  },
  actionButtonTextSecondary: {
    color: colors.textSecondary,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.lg,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  // Floating Action Button
  floatingButton: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 28,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginTop: -2,
  },
})

export default function OrdersScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { colors } = useTheme()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, phone)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      Alert.alert('Error', 'Failed to load orders')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      loadOrders()
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status')
      console.error(error)
    }
  }

  const handleMarkPaid = (order: Order) => {
    setSelectedOrder(order)
    setShowPaymentModal(true)
  }

  const handleCompleteOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowCompletionModal(true)
  }

  const confirmPayment = () => {
    if (selectedOrder) {
      updateOrderStatus(selectedOrder.id, 'paid')
    }
    // Don't clear selectedOrder immediately - let modal handle it
  }

  const confirmCompletion = () => {
    if (selectedOrder) {
      updateOrderStatus(selectedOrder.id, 'completed')
    }
    // Don't clear selectedOrder immediately - let modal handle it
  }

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter
    const matchesSearch = order.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.payment_method?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDate = !selectedDate || order.created_at.startsWith(selectedDate)
    return matchesFilter && matchesSearch && matchesDate
  })

  const formatSelectedDate = () => {
    if (!selectedDate) return 'All Dates'
    const date = new Date(selectedDate)
    return date.toLocaleDateString('en-MY', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = today.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const renderOrder = ({ item }: { item: Order }) => {
    const getStatusBadgeStyle = () => {
      switch (item.status) {
        case 'pending': return styles.statusBadgePending
        case 'paid': return styles.statusBadgePaid  
        case 'completed': return styles.statusBadgeCompleted
        default: return styles.statusBadgePending
      }
    }

    const getStatusTextStyle = () => {
      switch (item.status) {
        case 'pending': return styles.statusTextPending
        case 'paid': return styles.statusTextPaid
        case 'completed': return styles.statusTextCompleted  
        default: return styles.statusTextPending
      }
    }

    const getPaymentIcon = () => {
      if (!item.payment_method) return '💳'
      const method = item.payment_method.toLowerCase()
      if (method.includes('cash')) return '💵'
      if (method.includes('card') || method.includes('credit')) return '💳'
      if (method.includes('bank') || method.includes('transfer')) return '🏦'
      if (method.includes('ewallet') || method.includes('grab') || method.includes('touch')) return '📱'
      return '💳'
    }

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { order: item })}
        activeOpacity={0.7}
      >
        {/* Header Section */}
        <View style={styles.orderCardHeader}>
          <View style={styles.orderMainInfo}>
            <Text style={styles.customerName}>
              {item.customers?.name || 'Walk-in Customer'}
            </Text>
            <View style={styles.orderMeta}>
              <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
              <Text style={styles.orderSeparator}>•</Text>
              <View style={[styles.statusBadge, getStatusBadgeStyle()]}>
                <Text style={styles.statusEmoji}>{getStatusEmoji(item.status)}</Text>
                <Text style={[styles.statusText, getStatusTextStyle()]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.orderAmountSection}>
            <Text style={styles.amountText}>RM {item.amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.orderDetailsSection}>
          {item.payment_method && (
            <View style={styles.paymentMethodContainer}>
              <Text style={styles.paymentMethodIcon}>{getPaymentIcon()}</Text>
              <Text style={styles.paymentMethodText}>{item.payment_method}</Text>
            </View>
          )}

          {item.customers?.phone && (
            <View style={styles.phoneContainer}>
              <Text style={styles.phoneIcon}>📞</Text>
              <Text style={styles.phoneText}>{item.customers.phone}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.orderActions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonWithBorder]}
                onPress={() => handleMarkPaid(item)}
              >
                <Text style={styles.actionButtonText}>Mark Paid</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('OrderDetail', { order: item })}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>View Details</Text>
              </TouchableOpacity>
            </>
          )}
          
          {item.status === 'paid' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonWithBorder]}
                onPress={() => handleCompleteOrder(item)}
              >
                <Text style={styles.actionButtonText}>Complete Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('OrderDetail', { order: item })}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>View Details</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'completed' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonWithBorder]}
                onPress={() => updateOrderStatus(item.id, 'pending')}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Mark Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('OrderDetail', { order: item })}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>View Details</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const totalRevenue = orders
    .filter(o => o.status !== 'pending')
    .reduce((sum, o) => sum + o.amount, 0)

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.mainContainer, isTablet && styles.tabletContainer]}>
        <StandardizedHeader
          title="Orders"
          rightComponent={
            <TouchableOpacity 
              style={[
                styles.dateButton, 
                selectedDate && styles.dateButtonActive,
              ]}
              onPress={() => setShowCalendar(true)}
            >
              <Text style={styles.dateButtonIcon}>📅</Text>
              <Text style={[styles.dateButtonText, selectedDate && styles.dateButtonTextActive]}>
                {formatSelectedDate()}
              </Text>
            </TouchableOpacity>
          }
        />
        
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>RM {totalRevenue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
        </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'pending', 'paid', 'completed'] as const).map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterButton,
              filter === filterOption && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[
              styles.filterButtonText,
              filter === filterOption && styles.filterButtonTextActive,
            ]}>
              {filterOption === 'all' ? 'All' : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        style={styles.ordersList}
        contentContainerStyle={styles.ordersListContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadOrders}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>
              Start taking orders to see them here. Use WhatsApp parser to import orders automatically.
            </Text>
          </View>
        }
      />

      <CalendarFilter
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onDateSelect={setSelectedDate}
        selectedDate={selectedDate}
      />

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => navigation.navigate('AddOrder')}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        visible={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false)
          setSelectedOrder(null) // Clear after modal closes
        }}
        onConfirm={confirmPayment}
        amount={selectedOrder?.amount || 0}
        customerName={selectedOrder?.customers?.name}
      />

      {/* Order Completion Modal */}
      <OrderCompletionModal
        visible={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false)
          setSelectedOrder(null) // Clear after modal closes
        }}
        onConfirm={confirmCompletion}
        orderAmount={selectedOrder?.amount || 0}
        customerName={selectedOrder?.customers?.name || 'customer'}
      />
      </View>
    </SafeAreaView>
  )
}
