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
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import CalendarFilter from '../components/CalendarFilter'
import TransactionDetailModal from '../components/TransactionDetailModal'
import AddExpenseModal from '../components/AddExpenseModal'
import StandardizedHeader from '../components/StandardizedHeader'


interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string | null
  created_at: string
  receipt_url?: string | null
  payment_method?: string | null
  customer?: string
  notes?: string
}

export default function TransactionsScreen() {
  const { colors } = useTheme()
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showTransactionDetail, setShowTransactionDetail] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [loading, setLoading] = useState(false)

  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = filter === 'all' || transaction.type === filter
    const matchesSearch = transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.category?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Compare dates properly - transaction.created_at is like "2023-12-25T10:30:00Z"
    // selectedDate is like "2023-12-25"
    const matchesDate = !selectedDate || transaction.created_at.split('T')[0] === selectedDate
    
    return matchesFilter && matchesSearch && matchesDate
  })

  const handleTransactionPress = (transaction: any) => {
    setSelectedTransaction(transaction)
    setShowTransactionDetail(true)
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Load expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          id,
          amount,
          category,
          description,
          created_at,
          receipt_url
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (expensesError) throw expensesError

      // Load orders as income
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          amount,
          created_at,
          payment_method,
          notes,
          customers (name)
        `)
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Transform expenses
      const expenses: Transaction[] = (expensesData || []).map(expense => ({
        id: expense.id,
        type: 'expense' as const,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        created_at: expense.created_at,
        receipt_url: expense.receipt_url,
        payment_method: null,
        customer: null,
        notes: null
      }))

      // Transform orders to income transactions
      const income: Transaction[] = (ordersData || []).map(order => ({
        id: order.id,
        type: 'income' as const,
        amount: order.amount,
        category: 'Sales',
        description: order.customers?.name ? `Order from ${order.customers.name}` : 'Order',
        created_at: order.created_at,
        receipt_url: null,
        payment_method: order.payment_method,
        customer: order.customers?.name || null,
        notes: order.notes
      }))

      // Combine and sort by date
      const allTransactions = [...expenses, ...income]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setTransactions(allTransactions)
    } catch (error) {
      Alert.alert('Error', 'Failed to load transactions')
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return 'All Dates'
    const date = new Date(selectedDate)
    return date.toLocaleDateString('en-MY', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const clearDateFilter = () => {
    setSelectedDate('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-MY', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const getCategoryIcon = () => {
      if (item.type === 'income') return '💰'
      
      const category = item.category?.toLowerCase() || ''
      if (category.includes('food') || category.includes('restaurant')) return '🍽️'
      if (category.includes('transport') || category.includes('fuel')) return '🚗'
      if (category.includes('shopping') || category.includes('retail')) return '🛍️'
      if (category.includes('utilities') || category.includes('bill')) return '💡'
      if (category.includes('entertainment') || category.includes('movie')) return '🎬'
      if (category.includes('health') || category.includes('medical')) return '🏥'
      if (category.includes('office') || category.includes('business')) return '🏢'
      return '💸'
    }

    return (
      <TouchableOpacity 
        style={styles.transactionCard}
        onPress={() => handleTransactionPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionCardContent}>
          {/* Transaction Icon */}
          <View style={[
            styles.transactionIconContainer,
            item.type === 'income' ? styles.incomeIconContainer : styles.expenseIconContainer
          ]}>
            <Text style={styles.transactionEmoji}>{getCategoryIcon()}</Text>
          </View>

          {/* Transaction Info */}
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>
              {item.description || 'Transaction'}
            </Text>
            <View style={styles.transactionMeta}>
              <Text style={styles.transactionCategory}>{item.category}</Text>
              <Text style={styles.transactionSeparator}>•</Text>
              <Text style={styles.transactionDateTime}>
                {formatDate(item.created_at)} • {formatTime(item.created_at)}
              </Text>
            </View>
            
            {item.receipt_url && (
              <View style={styles.receiptIndicator}>
                <Text style={styles.receiptIcon}>📄</Text>
                <Text style={styles.receiptText}>Receipt attached</Text>
              </View>
            )}
          </View>

          {/* Amount Section */}
          <View style={styles.transactionAmountSection}>
            <Text style={[
              styles.transactionAmount,
              item.type === 'income' ? styles.incomeAmount : styles.expenseAmount
            ]}>
              <Text style={[
                styles.transactionAmountPrefix,
                item.type === 'income' ? styles.incomeAmount : styles.expenseAmount
              ]}>
                {item.type === 'income' ? '+' : '-'}
              </Text>
              RM {item.amount.toFixed(2)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.mainContainer, isTablet && styles.tabletContainer]}>
        <StandardizedHeader
          title="Transactions"
          rightComponent={
            <TouchableOpacity 
              style={[styles.dateButton, selectedDate && styles.dateButtonActive]}
              onPress={() => setShowCalendar(true)}
            >
              <Text style={styles.dateButtonIcon}>📅</Text>
              <Text style={[styles.dateButtonText, selectedDate && styles.dateButtonTextActive]}>
                {formatSelectedDate()}
              </Text>
            </TouchableOpacity>
          }
        />

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'income', 'expense'] as const).map((filterOption) => (
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
              {filterOption === 'all' ? 'All' : filterOption === 'income' ? 'Income' : 'Expenses'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Income</Text>
          <Text style={[styles.summaryValue, styles.incomeAmount]}>
            +RM {transactions
              .filter(t => t.type === 'income')
              .reduce((sum, t) => sum + (t.amount || 0), 0)
              .toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={[styles.summaryValue, styles.expenseAmount]}>
            -RM {transactions
              .filter(t => t.type === 'expense')
              .reduce((sum, t) => sum + (t.amount || 0), 0)
              .toFixed(2)}
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        style={styles.transactionsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.transactionsListContent}
        refreshing={loading}
        onRefresh={loadTransactions}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💸</Text>
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptyText}>
              Start adding expenses or processing orders to see your transaction history here.
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

      <TransactionDetailModal
        visible={showTransactionDetail}
        onClose={() => setShowTransactionDetail(false)}
        transaction={selectedTransaction}
      />

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setShowAddExpense(true)}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      <AddExpenseModal
        visible={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSuccess={() => {
          setShowAddExpense(false)
          loadTransactions()
        }}
      />
      </View>
    </SafeAreaView>
  )
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

  // Search & Filter
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

  // Summary Cards
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
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
  summaryLabel: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
  },

  // Transaction List
  transactionsList: {
    flex: 1,
  },
  transactionsListContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },

  // Beautiful Transaction Cards
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  transactionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },

  // Transaction Icon
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  incomeIconContainer: {
    backgroundColor: colors.success + '15',
  },
  expenseIconContainer: {
    backgroundColor: colors.error + '15',
  },
  transactionEmoji: {
    fontSize: 20,
  },

  // Transaction Details
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  transactionSeparator: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
    marginHorizontal: Spacing.xs,
  },
  transactionDateTime: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },

  // Amount Section
  transactionAmountSection: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 2,
  },
  transactionAmountPrefix: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
  },
  incomeAmount: {
    color: colors.success,
  },
  expenseAmount: {
    color: colors.error,
  },

  // Receipt Indicator
  receiptIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  receiptIcon: {
    fontSize: 10,
    marginRight: 2,
  },
  receiptText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
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