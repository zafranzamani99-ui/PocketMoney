import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'
import AddExpenseModal from '../components/AddExpenseModal'
import ReceiptScannerModal from '../components/ReceiptScannerModal'
import WhatsAppParserModal from '../components/WhatsAppParserModal'
import WalletManagementModal from '../components/WalletManagementModal'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface Order {
  id: string
  amount: number
  status: 'pending' | 'paid' | 'completed'
  customers?: {
    name: string
  }
  created_at: string
}

interface DashboardStats {
  todaySales: number
  todayExpenses: number
  todayProfit: number
  salesChange: string
  expensesChange: string
  profitMargin: number
}

interface RecentTransaction {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: string
  time: string
}

interface User {
  business_name: string | null
  email: string
}

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [showWhatsAppParser, setShowWhatsAppParser] = useState(false)
  const [showWalletManagement, setShowWalletManagement] = useState(false)
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    todaySales: 0,
    todayExpenses: 0,
    todayProfit: 0,
    salesChange: '+0%',
    expensesChange: '+0%',
    profitMargin: 0
  })
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)

  const handleExpenseSuccess = () => {
    setShowAddExpense(false)
    // Refresh dashboard data
  }

  const handleReceiptSuccess = (extractedData: any) => {
    setShowReceiptScanner(false)
    // Handle extracted receipt data
    console.log('Receipt data:', extractedData)
  }

  const handleWhatsAppSuccess = (orderData: any) => {
    setShowWhatsAppParser(false)
    // Handle parsed order data
    console.log('Order data:', orderData)
  }

  const handleWalletChange = () => {
    // Refresh wallet data on dashboard
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    await Promise.all([
      loadUserProfile(),
      loadPendingOrders(),
      loadDashboardStats(),
      loadRecentTransactions()
    ])
    setStatsLoading(false)
  }

  const loadUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data, error } = await supabase
        .from('users')
        .select('business_name, email')
        .eq('id', authUser.id)
        .single()

      if (error) throw error
      setUser(data)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const loadDashboardStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString()

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString()
      const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString()

      // Get today's sales (completed orders)
      const { data: todaySalesData } = await supabase
        .from('orders')
        .select('amount')
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      const todaySales = todaySalesData?.reduce((sum, order) => sum + order.amount, 0) || 0

      // Get yesterday's sales for comparison
      const { data: yesterdaySalesData } = await supabase
        .from('orders')
        .select('amount')
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd)

      const yesterdaySales = yesterdaySalesData?.reduce((sum, order) => sum + order.amount, 0) || 0

      // Get today's expenses
      const { data: todayExpensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)

      const todayExpenses = todayExpensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0

      // Get yesterday's expenses for comparison
      const { data: yesterdayExpensesData } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd)

      const yesterdayExpenses = yesterdayExpensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0

      const todayProfit = todaySales - todayExpenses
      const profitMargin = todaySales > 0 ? (todayProfit / todaySales) * 100 : 0

      // Calculate percentage changes
      const salesChange = yesterdaySales > 0 
        ? `${((todaySales - yesterdaySales) / yesterdaySales * 100).toFixed(0)}%` 
        : '+0%'
      const expensesChange = yesterdayExpenses > 0 
        ? `${((todayExpenses - yesterdayExpenses) / yesterdayExpenses * 100).toFixed(0)}%` 
        : '+0%'

      setDashboardStats({
        todaySales,
        todayExpenses,
        todayProfit,
        salesChange: todaySales >= yesterdaySales ? `+${salesChange}` : salesChange,
        expensesChange: todayExpenses >= yesterdayExpenses ? `+${expensesChange}` : expensesChange,
        profitMargin
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    }
  }

  const loadRecentTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get recent expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('id, amount, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      // Get recent orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id,
          amount,
          created_at,
          customers (name)
        `)
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3)

      const expenses = (expensesData || []).map(expense => ({
        id: expense.id,
        type: 'expense' as const,
        description: expense.description || 'Expense',
        amount: `RM ${expense.amount.toFixed(2)}`,
        time: formatTime(expense.created_at)
      }))

      const income = (ordersData || []).map(order => ({
        id: order.id,
        type: 'income' as const,
        description: order.customers?.name ? `Sale to ${order.customers.name}` : 'Sale',
        amount: `RM ${order.amount.toFixed(2)}`,
        time: formatTime(order.created_at)
      }))

      // Combine and sort by time
      const allTransactions = [...expenses, ...income]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 3)

      setRecentTransactions(allTransactions)
    } catch (error) {
      console.error('Error loading recent transactions:', error)
    }
  }

  const loadPendingOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          amount,
          status,
          created_at,
          customers (name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3)

      if (error) throw error
      setPendingOrders(data || [])
    } catch (error) {
      console.error('Error loading pending orders:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning! ☀️'
    if (hour < 18) return 'Good afternoon! 🌤️'
    return 'Good evening! 🌙'
  }


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.businessName}>
            {user?.business_name || user?.email || 'Welcome'}
          </Text>
        </View>

        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Today's Sales</Text>
            <Text style={styles.summaryValue}>
              {statsLoading ? 'Loading...' : `RM ${dashboardStats.todaySales.toFixed(2)}`}
            </Text>
            <Text style={[styles.summaryChange, 
              dashboardStats.salesChange.startsWith('+') ? { color: Colors.success } : { color: Colors.error }
            ]}>
              {statsLoading ? '...' : `${dashboardStats.salesChange} from yesterday`}
            </Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Today's Expenses</Text>
            <Text style={styles.summaryValue}>
              {statsLoading ? 'Loading...' : `RM ${dashboardStats.todayExpenses.toFixed(2)}`}
            </Text>
            <Text style={[styles.summaryChange,
              dashboardStats.expensesChange.startsWith('-') ? { color: Colors.success } : { color: Colors.error }
            ]}>
              {statsLoading ? '...' : `${dashboardStats.expensesChange} from yesterday`}
            </Text>
          </View>
        </View>

        <View style={styles.profitCard}>
          <Text style={styles.profitLabel}>Today's Profit</Text>
          <Text style={[styles.profitValue, 
            dashboardStats.todayProfit < 0 ? { color: Colors.error } : {}
          ]}>
            {statsLoading ? 'Loading...' : `RM ${dashboardStats.todayProfit.toFixed(2)}`}
          </Text>
          <View style={styles.profitBar}>
            <View style={[styles.profitBarFill, { 
              width: `${Math.max(0, Math.min(100, dashboardStats.profitMargin))}%` 
            }]} />
          </View>
          <Text style={styles.profitPercentage}>
            {statsLoading ? 'Calculating...' : `${dashboardStats.profitMargin.toFixed(0)}% profit margin`}
          </Text>
        </View>

        {pendingOrders.length > 0 && (
          <View style={styles.pendingOrders}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Orders ⏳</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.ordersList}>
              {pendingOrders.map((order) => (
                <TouchableOpacity 
                  key={order.id} 
                  style={styles.orderItem}
                  onPress={() => navigation.navigate('OrderDetail', { order })}
                >
                  <View style={styles.orderLeft}>
                    <View style={styles.orderIndicator} />
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderCustomer}>
                        {order.customers?.name || 'Customer'}
                      </Text>
                      <Text style={styles.orderTime}>
                        {formatTimeAgo(order.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={styles.orderAmount}>RM {order.amount.toFixed(2)}</Text>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Orders')}
            >
              <Text style={styles.actionEmoji}>📋</Text>
              <Text style={styles.actionText}>Add Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowAddExpense(true)}
            >
              <Text style={styles.actionEmoji}>➕</Text>
              <Text style={styles.actionText}>Add Expense</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowWhatsAppParser(true)}
            >
              <Text style={styles.actionEmoji}>💬</Text>
              <Text style={styles.actionText}>WhatsApp Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowWalletManagement(true)}
            >
              <Text style={styles.actionEmoji}>💰</Text>
              <Text style={styles.actionText}>Wallets</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.recentTransactions}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionsList}>
            {recentTransactions.length > 0 ? recentTransactions.slice(0, 3).map((transaction, index) => (
              <View key={index} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.transactionEmoji}>
                    {transaction.type === 'income' ? '💰' : '💸'}
                  </Text>
                  <View>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionTime}>{transaction.time}</Text>
                  </View>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                ]}>
                  {transaction.type === 'income' ? '+' : '-'}{transaction.amount}
                </Text>
              </View>
            )) : (
              <View style={styles.emptyTransactions}>
                <Text style={styles.emptyText}>No recent transactions</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <AddExpenseModal
        visible={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSuccess={handleExpenseSuccess}
      />

      <ReceiptScannerModal
        visible={showReceiptScanner}
        onClose={() => setShowReceiptScanner(false)}
        onSuccess={handleReceiptSuccess}
      />

      <WhatsAppParserModal
        visible={showWhatsAppParser}
        onClose={() => setShowWhatsAppParser(false)}
        onSuccess={handleWhatsAppSuccess}
      />

      <WalletManagementModal
        visible={showWalletManagement}
        onClose={() => setShowWalletManagement(false)}
        onWalletChange={handleWalletChange}
      />

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  businessName: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  summaryCards: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  summaryChange: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
  },
  profitCard: {
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  profitLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  profitValue: {
    fontSize: Typography.fontSizes.display,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  profitBar: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    marginBottom: Spacing.sm,
  },
  profitBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  profitPercentage: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  pendingOrders: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  ordersList: {
    gap: Spacing.sm,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.accent + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginRight: Spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderCustomer: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  orderTime: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  orderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderAmount: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.accent,
  },
  chevron: {
    fontSize: Typography.fontSizes.subheading,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  quickActions: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionButton: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  recentTransactions: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.secondary,
  },
  transactionsList: {
    gap: Spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  transactionEmoji: {
    fontSize: 20,
  },
  transactionDescription: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  transactionTime: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  transactionAmount: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
  },
  incomeAmount: {
    color: Colors.success,
  },
  expenseAmount: {
    color: Colors.error,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
})