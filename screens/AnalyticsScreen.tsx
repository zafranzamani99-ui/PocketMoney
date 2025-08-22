import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'

const { width } = Dimensions.get('window')

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')

  const [categories, setCategories] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])

  const maxValue = weeklyData.length > 0 ? Math.max(...weeklyData.map(d => Math.max(d.income || 0, d.expense || 0))) : 100

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
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
            <Text style={styles.overviewValue}>RM 0.00</Text>
            <Text style={styles.overviewChange}>No data available</Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Total Expenses</Text>
            <Text style={styles.overviewValue}>RM 0.00</Text>
            <Text style={styles.overviewChange}>No data available</Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Net Profit</Text>
            <Text style={styles.overviewValue}>RM 0.00</Text>
            <Text style={styles.overviewChange}>No data available</Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Profit Margin</Text>
            <Text style={styles.overviewValue}>0%</Text>
            <Text style={styles.overviewChange}>No data available</Text>
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Weekly Trend</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chart}>
              {weeklyData.length > 0 ? weeklyData.map((data, index) => (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.incomeBar,
                        { height: ((data.income || 0) / maxValue) * 100 }
                      ]}
                    />
                    <View
                      style={[
                        styles.expenseBar,
                        { height: ((data.expense || 0) / maxValue) * 100 }
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{data.day}</Text>
                </View>
              )) : (
                <View style={styles.emptyChart}>
                  <Text style={styles.emptyChartText}>No data to display</Text>
                </View>
              )}
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: Colors.success }]} />
                <Text style={styles.legendText}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: Colors.error }]} />
                <Text style={styles.legendText}>Expenses</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Expense Categories</Text>
          <View style={styles.categoriesList}>
            {categories.map((category, index) => (
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
            ))}
          </View>
        </View>

        <View style={styles.topCustomers}>
          <Text style={styles.sectionTitle}>Top Customers</Text>
          <View style={styles.customersList}>
            {topCustomers.length > 0 ? topCustomers.map((customer, index) => (
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
                <Text style={styles.emptyText}>No customer data available</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'ios' ? Spacing.md : Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.lg : Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
  },
  periodButtonTextActive: {
    color: Colors.textPrimary,
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overviewLabel: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  overviewValue: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  overviewChange: {
    fontSize: Typography.fontSizes.small,
    color: Colors.success,
  },
  chartSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  expenseBar: {
    width: 8,
    backgroundColor: Colors.error,
    borderRadius: 2,
  },
  chartLabel: {
    fontSize: Typography.fontSizes.small,
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
  },
  categoriesSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  categoriesList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    color: Colors.textPrimary,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  categoryPercentage: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
  },
  topCustomers: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  customersList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitial: {
    fontSize: Typography.fontSizes.caption,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  customerName: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  customerOrders: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
  },
  customerTotal: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
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
    color: Colors.textSecondary,
  },
  emptyCustomers: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
})