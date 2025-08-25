import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Share,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'

interface DailyStats {
  totalSales: number
  totalExpenses: number
  profit: number
  transactionCount: number
  orderCount: number
  topCategory: string
  cashBalance: number
  date: string
}

interface DailyClosingModalProps {
  visible: boolean
  onClose: () => void
  onClosingComplete: (stats: DailyStats) => void
}

export default function DailyClosingModal({ visible, onClose, onClosingComplete }: DailyClosingModalProps) {
  const { colors }: any = useTheme()
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [streak, setStreak] = useState(0)
  
  const styles = useMemo(() => createStyles(colors), [colors])

  useEffect(() => {
    if (visible) {
      loadDailyStats()
      loadStreak()
    }
  }, [visible])

  const loadDailyStats = async () => {
    setIsLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      // Get today's orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      // Calculate stats
      const sales = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0
      const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0
      
      // Get most frequent category
      const categories = transactions?.map(t => t.category) || []
      const topCategory = categories.length > 0 
        ? categories.reduce((a, b, i, arr) => 
            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
          )
        : 'No transactions'

      // Get cash wallet balance
      const { data: cashWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('type', 'cash')
        .single()

      const stats: DailyStats = {
        totalSales: sales,
        totalExpenses: expenses,
        profit: sales - expenses,
        transactionCount: transactions?.length || 0,
        orderCount: orders?.length || 0,
        topCategory,
        cashBalance: cashWallet?.balance || 0,
        date: today,
      }

      setDailyStats(stats)
    } catch (error) {
      console.error('Error loading daily stats:', error)
      Alert.alert('Error', 'Failed to load daily statistics')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStreak = async () => {
    try {
      // Get user's closing streak from profile or calculate
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('closing_streak')
        .single()

      setStreak(profile?.closing_streak || 0)
    } catch (error) {
      console.error('Error loading streak:', error)
    }
  }

  const completeDailyClosing = async () => {
    if (!dailyStats) return

    try {
      setIsLoading(true)

      // Save daily closing record
      await supabase.from('daily_closings').insert({
        date: dailyStats.date,
        total_sales: dailyStats.totalSales,
        total_expenses: dailyStats.totalExpenses,
        profit: dailyStats.profit,
        transaction_count: dailyStats.transactionCount,
        order_count: dailyStats.orderCount,
        cash_balance: dailyStats.cashBalance,
      })

      // Update streak
      const newStreak = streak + 1
      await supabase
        .from('user_profiles')
        .upsert({ closing_streak: newStreak })

      // Check for achievements
      checkAchievements(newStreak)

      Alert.alert(
        'Kedai Ditutup! 🎉',
        `Hari ini untung RM${dailyStats.profit.toFixed(2)}!\n\nStreak: ${newStreak} hari berturut-turut`,
        [
          { text: 'Kongsi Report', onPress: shareReport },
          { text: 'Selesai', onPress: () => {
            onClosingComplete(dailyStats)
            onClose()
          }}
        ]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to complete daily closing')
    } finally {
      setIsLoading(false)
    }
  }

  const checkAchievements = (currentStreak: number) => {
    const achievements = []
    
    if (currentStreak === 1) achievements.push('🎯 First Closing!')
    if (currentStreak === 7) achievements.push('🔥 One Week Streak!')
    if (currentStreak === 30) achievements.push('💎 One Month Champion!')
    if (dailyStats && dailyStats.profit > 100) achievements.push('💰 RM100+ Profit Day!')
    if (dailyStats && dailyStats.transactionCount >= 20) achievements.push('⚡ Busy Day (20+ transactions)!')

    if (achievements.length > 0) {
      setTimeout(() => {
        Alert.alert('Achievement Unlocked! 🏆', achievements.join('\n'))
      }, 1000)
    }
  }

  const shareReport = async () => {
    if (!dailyStats) return

    const reportText = `
🏪 PocketMoney Daily Report
📅 ${new Date(dailyStats.date).toLocaleDateString('ms-MY')}

💰 Sales: RM${dailyStats.totalSales.toFixed(2)}
💸 Expenses: RM${dailyStats.totalExpenses.toFixed(2)}
📊 Profit: RM${dailyStats.profit.toFixed(2)}

📈 Transactions: ${dailyStats.transactionCount}
🛒 Orders: ${dailyStats.orderCount}
💵 Cash Balance: RM${dailyStats.cashBalance.toFixed(2)}

🔥 Streak: ${streak + 1} days

Generated by PocketMoney App
    `.trim()

    try {
      await Share.share({
        message: reportText,
        title: 'Daily Business Report',
      })
    } catch (error) {
      console.error('Error sharing report:', error)
    }
  }

  const formatCurrency = (amount: number) => `RM${amount.toFixed(2)}`

  const getProfitColor = (profit: number) => {
    if (profit > 0) return colors.success
    if (profit < 0) return colors.error
    return colors.textSecondary
  }

  const getProfitEmoji = (profit: number) => {
    if (profit > 50) return '🤑'
    if (profit > 0) return '😊'
    if (profit === 0) return '😐'
    return '😔'
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.header}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Tutup Kedai</Text>
          <View style={styles.placeholder} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingEmoji}>📊</Text>
              <Text style={styles.loadingText}>Calculating today's performance...</Text>
            </View>
          ) : dailyStats ? (
            <>
              {/* Main Stats Card */}
              <LinearGradient
                colors={[getProfitColor(dailyStats.profit) + '20', getProfitColor(dailyStats.profit) + '10']}
                style={styles.mainStatsCard}
              >
                <Text style={styles.dateText}>
                  {new Date(dailyStats.date).toLocaleDateString('ms-MY', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                
                <View style={styles.profitSection}>
                  <Text style={styles.profitEmoji}>{getProfitEmoji(dailyStats.profit)}</Text>
                  <Text style={styles.profitLabel}>Today's Profit</Text>
                  <Text style={[styles.profitAmount, { color: getProfitColor(dailyStats.profit) }]}>
                    {formatCurrency(dailyStats.profit)}
                  </Text>
                </View>

                <View style={styles.streakBadge}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakText}>{streak + 1} day streak</Text>
                </View>
              </LinearGradient>

              {/* Breakdown Cards */}
              <View style={styles.breakdownSection}>
                <View style={styles.breakdownCard}>
                  <Text style={styles.breakdownEmoji}>💰</Text>
                  <Text style={styles.breakdownLabel}>Sales</Text>
                  <Text style={[styles.breakdownAmount, { color: colors.success }]}>
                    {formatCurrency(dailyStats.totalSales)}
                  </Text>
                  <Text style={styles.breakdownDetail}>{dailyStats.orderCount} orders</Text>
                </View>

                <View style={styles.breakdownCard}>
                  <Text style={styles.breakdownEmoji}>💸</Text>
                  <Text style={styles.breakdownLabel}>Expenses</Text>
                  <Text style={[styles.breakdownAmount, { color: colors.error }]}>
                    {formatCurrency(dailyStats.totalExpenses)}
                  </Text>
                  <Text style={styles.breakdownDetail}>{dailyStats.transactionCount} transactions</Text>
                </View>
              </View>

              {/* Additional Stats */}
              <View style={styles.additionalStats}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>💵 Cash Balance</Text>
                  <Text style={styles.statValue}>{formatCurrency(dailyStats.cashBalance)}</Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>📊 Top Category</Text>
                  <Text style={styles.statValue}>{dailyStats.topCategory}</Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>📈 Total Transactions</Text>
                  <Text style={styles.statValue}>{dailyStats.transactionCount}</Text>
                </View>
              </View>

              {/* Insights Card */}
              <View style={styles.insightsCard}>
                <Text style={styles.insightsTitle}>💡 Today's Insights</Text>
                <View style={styles.insightsList}>
                  {dailyStats.profit > 0 && (
                    <Text style={styles.insight}>
                      ✅ Profitable day! You made {formatCurrency(dailyStats.profit)} profit
                    </Text>
                  )}
                  {dailyStats.profit <= 0 && (
                    <Text style={styles.insight}>
                      ⚠️ Consider reviewing expenses to improve tomorrow's profit
                    </Text>
                  )}
                  {dailyStats.transactionCount > 15 && (
                    <Text style={styles.insight}>
                      🔥 Busy day with {dailyStats.transactionCount} transactions!
                    </Text>
                  )}
                  {dailyStats.transactionCount < 5 && (
                    <Text style={styles.insight}>
                      📢 Consider marketing to increase customer traffic
                    </Text>
                  )}
                  <Text style={styles.insight}>
                    🎯 Keep up the {streak + 1}-day closing streak!
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.shareButton} 
                  onPress={shareReport}
                >
                  <Text style={styles.shareButtonText}>📱 Share Report</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.completeButton} 
                  onPress={completeDailyClosing}
                  disabled={isLoading}
                >
                  <Text style={styles.completeButtonText}>
                    {isLoading ? 'Saving...' : '🔒 Complete Daily Closing'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tips */}
              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>💭 Tomorrow's Tips</Text>
                <Text style={styles.tip}>• Start fresh with a clear cash count</Text>
                <Text style={styles.tip}>• Review today's top-selling items</Text>
                <Text style={styles.tip}>• Plan for peak hours based on today's pattern</Text>
                <Text style={styles.tip}>• Keep up the daily closing habit for better insights</Text>
              </View>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorEmoji}>😔</Text>
              <Text style={styles.errorText}>Unable to load today's statistics</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadDailyStats}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  loadingText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  mainStatsCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  dateText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  profitSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  profitEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  profitLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  profitAmount: {
    fontSize: 32,
    fontFamily: Typography.fontFamily.bold,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '20',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  streakEmoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  streakText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.accent,
  },
  breakdownSection: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  breakdownLabel: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  breakdownAmount: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  breakdownDetail: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  additionalStats: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  statLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  insightsCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  insightsTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  insightsList: {
    gap: Spacing.sm,
  },
  insight: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  actionButtons: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  shareButton: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  tipsCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipsTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tip: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.lineHeights.body,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
})
