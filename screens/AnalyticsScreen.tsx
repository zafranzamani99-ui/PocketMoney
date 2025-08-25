import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  Share,
} from 'react-native'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'

const { width } = Dimensions.get('window')

interface AnalyticsData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  revenueChange: string
  expensesChange: string
  profitChange: string
}

interface CategoryData {
  name: string
  amount: number
  percentage: number
  color: string
}

interface CustomerData {
  name: string
  orders: number
  total: number
}

interface ChartData {
  day: string
  income: number
  expense: number
}

export default function AnalyticsScreen() {
  const { colors } = useTheme()
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [loading, setLoading] = useState(true)
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    revenueChange: '0%',
    expensesChange: '0%',
    profitChange: '0%'
  })
  
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [topCustomers, setTopCustomers] = useState<CustomerData[]>([])

  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => Math.max(d.income || 0, d.expense || 0))) : 100

  useEffect(() => {
    loadAnalyticsData()
  }, [period])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadOverviewData(),
        loadChartData(),
        loadCategoryData(),
        loadTopCustomers(),
      ])
    } catch (error) {
      console.error('Error loading analytics:', error)
      Alert.alert('Error', 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = new Date(now)
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case 'week':
        const dayOfWeek = now.getDay()
        startDate = new Date(now)
        startDate.setDate(now.getDate() - dayOfWeek)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        endDate = new Date(now)
        break
    }
    
    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
  }

  const loadOverviewData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { startDate, endDate } = getDateRange()

    // Get current period data
    const { data: currentRevenue } = await supabase
      .from('orders')
      .select('amount')
      .eq('user_id', user.id)
      .neq('status', 'pending')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const { data: currentExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const totalRevenue = currentRevenue?.reduce((sum, order) => sum + order.amount, 0) || 0
    const totalExpenses = currentExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // Get previous period for comparison
    const prevStartDate = new Date(new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime()))
    const prevEndDate = new Date(startDate)

    const { data: prevRevenue } = await supabase
      .from('orders')
      .select('amount')
      .eq('user_id', user.id)
      .neq('status', 'pending')
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString())

    const { data: prevExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString())

    const prevTotalRevenue = prevRevenue?.reduce((sum, order) => sum + order.amount, 0) || 0
    const prevTotalExpenses = prevExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0
    const prevNetProfit = prevTotalRevenue - prevTotalExpenses

    const revenueChange = prevTotalRevenue > 0 
      ? `${((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100).toFixed(1)}%`
      : '0%'
    const expensesChange = prevTotalExpenses > 0 
      ? `${((totalExpenses - prevTotalExpenses) / prevTotalExpenses * 100).toFixed(1)}%`
      : '0%'
    const profitChange = prevNetProfit !== 0 
      ? `${((netProfit - prevNetProfit) / Math.abs(prevNetProfit) * 100).toFixed(1)}%`
      : '0%'

    setAnalyticsData({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      revenueChange: totalRevenue >= prevTotalRevenue ? `+${revenueChange}` : revenueChange,
      expensesChange: totalExpenses >= prevTotalExpenses ? `+${expensesChange}` : expensesChange,
      profitChange: netProfit >= prevNetProfit ? `+${profitChange}` : profitChange,
    })
  }

  const loadChartData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { startDate, endDate } = getDateRange()
    const days = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d).toISOString()
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString()

      const { data: dayRevenue } = await supabase
        .from('orders')
        .select('amount')
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

      const { data: dayExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

      const income = dayRevenue?.reduce((sum, order) => sum + order.amount, 0) || 0
      const expense = dayExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0

      days.push({
        day: d.toLocaleDateString('en-MY', { weekday: 'short' }),
        income,
        expense
      })
    }

    setChartData(days)
  }

  const loadCategoryData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { startDate, endDate } = getDateRange()

    const { data: expenses } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (!expenses) return

    const categoryTotals = expenses.reduce((acc, expense) => {
      const category = expense.category || 'Other'
      acc[category] = (acc[category] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0)
    
    const colors_list = [colors.primary, colors.secondary, colors.accent, colors.success, colors.warning, colors.error]
    
    const categoryData = Object.entries(categoryTotals)
      .map(([name, amount], index) => ({
        name,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: colors_list[index % colors_list.length]
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5) // Top 5 categories

    setCategories(categoryData)
  }

  const loadTopCustomers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { startDate, endDate } = getDateRange()

    const { data: orders } = await supabase
      .from('orders')
      .select(`
        amount,
        customers (name)
      `)
      .eq('user_id', user.id)
      .neq('status', 'pending')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .not('customer_id', 'is', null)

    if (!orders) return

    const customerTotals = orders.reduce((acc, order) => {
      const customerName = order.customers?.name
      if (customerName) {
        if (!acc[customerName]) {
          acc[customerName] = { total: 0, orders: 0 }
        }
        acc[customerName].total += order.amount
        acc[customerName].orders += 1
      }
      return acc
    }, {} as Record<string, { total: number; orders: number }>)

    const customersData = Object.entries(customerTotals)
      .map(([name, data]) => ({
        name,
        orders: data.orders,
        total: data.total
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    setTopCustomers(customersData)
  }

  const exportReport = async () => {
    const reportText = `
PocketMoney ${period.charAt(0).toUpperCase() + period.slice(1)}ly Report

📊 OVERVIEW
Total Revenue: RM ${analyticsData.totalRevenue.toFixed(2)} (${analyticsData.revenueChange})
Total Expenses: RM ${analyticsData.totalExpenses.toFixed(2)} (${analyticsData.expensesChange})
Net Profit: RM ${analyticsData.netProfit.toFixed(2)} (${analyticsData.profitChange})
Profit Margin: ${analyticsData.profitMargin.toFixed(1)}%

💸 TOP EXPENSE CATEGORIES
${categories.map(cat => `${cat.name}: RM ${cat.amount.toFixed(2)} (${cat.percentage}%)`).join('\n')}

👥 TOP CUSTOMERS
${topCustomers.map(customer => `${customer.name}: RM ${customer.total.toFixed(2)} (${customer.orders} orders)`).join('\n')}

Generated with PocketMoney
    `.trim()

    try {
      await Share.share({
        message: reportText,
        title: `PocketMoney ${period.charAt(0).toUpperCase() + period.slice(1)}ly Report`,
      })
    } catch (error) {
      console.error('Error sharing report:', error)
      Alert.alert('Error', 'Failed to export report')
    }
  }

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics 📊</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={exportReport}
          >
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.periodSelectorContainer}>
        <View style={styles.periodSelector}>
          {(['day', 'week', 'month'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[
                styles.periodButtonText,
                period === p && styles.periodButtonTextActive,
              ]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.overviewCards}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Total Revenue</Text>
            <Text style={styles.overviewValue}>
              {loading ? 'Loading...' : `RM ${analyticsData.totalRevenue.toFixed(2)}`}
            </Text>
            <Text style={[
              styles.overviewChange, 
              analyticsData.revenueChange.startsWith('+') ? { color: colors.success } : { color: colors.error }
            ]}>
              {loading ? '...' : analyticsData.revenueChange}
            </Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Total Expenses</Text>
            <Text style={styles.overviewValue}>
              {loading ? 'Loading...' : `RM ${analyticsData.totalExpenses.toFixed(2)}`}
            </Text>
            <Text style={[
              styles.overviewChange,
              analyticsData.expensesChange.startsWith('-') ? { color: colors.success } : { color: colors.error }
            ]}>
              {loading ? '...' : analyticsData.expensesChange}
            </Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Net Profit</Text>
            <Text style={[
              styles.overviewValue,
              analyticsData.netProfit < 0 ? { color: colors.error } : {}
            ]}>
              {loading ? 'Loading...' : `RM ${analyticsData.netProfit.toFixed(2)}`}
            </Text>
            <Text style={[
              styles.overviewChange, 
              analyticsData.profitChange.startsWith('+') ? { color: colors.success } : { color: colors.error }
            ]}>
              {loading ? '...' : analyticsData.profitChange}
            </Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Profit Margin</Text>
            <Text style={styles.overviewValue}>
              {loading ? 'Loading...' : `${analyticsData.profitMargin.toFixed(1)}%`}
            </Text>
            <Text style={[
              styles.overviewChange,
              analyticsData.profitMargin >= 0 ? { color: colors.success } : { color: colors.error }
            ]}>
              {loading ? '...' : `${analyticsData.profitMargin >= 20 ? 'Excellent' : analyticsData.profitMargin >= 10 ? 'Good' : 'Needs improvement'}`}
            </Text>
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>{period.charAt(0).toUpperCase() + period.slice(1)}ly Trend</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chart}>
              {!loading && chartData.length > 0 ? chartData.map((data, index) => (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.incomeBar,
                        { height: maxValue > 0 ? Math.max(4, ((data.income || 0) / maxValue) * 100) : 4 }
                      ]}
                    />
                    <View
                      style={[
                        styles.expenseBar,
                        { height: maxValue > 0 ? Math.max(4, ((data.expense || 0) / maxValue) * 100) : 4 }
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{data.day}</Text>
                </View>
              )) : (
                <View style={styles.emptyChart}>
                  <Text style={styles.emptyChartText}>
                    {loading ? 'Loading chart data...' : 'No data to display'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.error }]} />
                <Text style={styles.legendText}>Expenses</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Expense Categories</Text>
          <View style={styles.categoriesList}>
            {!loading && categories.length > 0 ? categories.map((category, index) => (
              <View key={index} style={styles.categoryItem}>
                <View style={styles.categoryLeft}>
                  <View
                    style={[styles.categoryColor, { backgroundColor: category.color }]}
                  />
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>RM {category.amount.toFixed(2)}</Text>
                  <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
                </View>
              </View>
            )) : (
              <View style={styles.emptyCategoriesList}>
                <Text style={styles.emptyText}>
                  {loading ? 'Loading categories...' : 'No expense categories'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.topCustomers}>
          <Text style={styles.sectionTitle}>Top Customers</Text>
          <View style={styles.customersList}>
            {!loading && topCustomers.length > 0 ? topCustomers.map((customer, index) => (
              <View key={index} style={styles.customerItem}>
                <View style={styles.customerLeft}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerInitial}>
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerOrders}>{customer.orders} orders</Text>
                  </View>
                </View>
                <Text style={styles.customerTotal}>RM {customer.total.toFixed(2)}</Text>
              </View>
            )) : (
              <View style={styles.emptyCustomers}>
                <Text style={styles.emptyText}>
                  {loading ? 'Loading customers...' : 'No customer data available'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.lg : Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  exportButtonText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.light,
  },
  periodSelectorContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.sm,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  scrollView: {
    flex: 1,
  },
  overviewCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  overviewCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewLabel: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  overviewValue: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  overviewChange: {
    fontSize: Typography.fontSizes.small,
    color: colors.success,
  },
  chartSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  chartContainer: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: Spacing.md,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 2,
  },
  incomeBar: {
    width: 8,
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  expenseBar: {
    width: 8,
    backgroundColor: colors.error,
    borderRadius: 2,
  },
  chartLabel: {
    fontSize: Typography.fontSizes.small,
    color: colors.textSecondary,
    marginTop: Spacing.sm,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  categoriesSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  categoriesList: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoryName: {
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.medium,
    color: colors.textPrimary,
  },
  categoryPercentage: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  topCustomers: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  customersList: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitial: {
    fontSize: Typography.fontSizes.caption,
    fontWeight: Typography.fontWeights.bold,
    color: colors.primary,
  },
  customerName: {
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  customerOrders: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  customerTotal: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    flex: 1,
  },
  emptyChartText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  emptyCustomers: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  emptyCategoriesList: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
})