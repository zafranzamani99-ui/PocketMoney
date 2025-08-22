import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { gamificationService, Achievement, UserStats } from '../services/gamificationService'
import { supabase } from '../lib/supabase'

interface AchievementsModalProps {
  visible: boolean
  onClose: () => void
}

export default function AchievementsModal({ visible, onClose }: AchievementsModalProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'all' | 'unlocked' | 'locked'>('all')

  useEffect(() => {
    if (visible) {
      loadData()
    }
  }, [visible])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const [userAchievements, userStats] = await Promise.all([
        gamificationService.getUserAchievements(user.id),
        gamificationService.getUserStats(user.id)
      ])

      setAchievements(userAchievements)
      setStats(userStats)
    } catch (error) {
      console.error('Failed to load achievements data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAchievements = achievements.filter(achievement => {
    switch (selectedTab) {
      case 'unlocked':
        return achievement.is_unlocked
      case 'locked':
        return !achievement.is_unlocked
      default:
        return true
    }
  })

  const getProgressValue = (achievement: Achievement): number => {
    if (!stats) return 0
    if (achievement.is_unlocked) return 100

    switch (achievement.requirement_type) {
      case 'receipt_count':
        return Math.min(100, (stats.receipts_scanned / achievement.requirement_value) * 100)
      case 'transaction_count':
        return Math.min(100, (stats.transactions_count / achievement.requirement_value) * 100)
      case 'streak_days':
        return Math.min(100, (stats.current_streak / achievement.requirement_value) * 100)
      case 'revenue_amount':
        return Math.min(100, (stats.total_revenue / achievement.requirement_value) * 100)
      case 'customer_count':
        return Math.min(100, (stats.customers_count / achievement.requirement_value) * 100)
      default:
        return 0
    }
  }

  const getCurrentValue = (achievement: Achievement): number => {
    if (!stats) return 0

    switch (achievement.requirement_type) {
      case 'receipt_count':
        return stats.receipts_scanned
      case 'transaction_count':
        return stats.transactions_count
      case 'streak_days':
        return stats.current_streak
      case 'revenue_amount':
        return stats.total_revenue
      case 'customer_count':
        return stats.customers_count
      default:
        return 0
    }
  }

  const formatRequirementText = (achievement: Achievement): string => {
    const current = getCurrentValue(achievement)
    const target = achievement.requirement_value

    switch (achievement.requirement_type) {
      case 'receipt_count':
        return `${current}/${target} receipts scanned`
      case 'transaction_count':
        return `${current}/${target} transactions recorded`
      case 'streak_days':
        return `${current}/${target} day streak`
      case 'revenue_amount':
        return `RM ${current.toFixed(0)}/RM ${target} revenue`
      case 'customer_count':
        return `${current}/${target} customers added`
      default:
        return ''
    }
  }

  const formatReward = (achievement: Achievement): string => {
    switch (achievement.reward_type) {
      case 'premium_days':
        return `${achievement.reward_value} days premium`
      case 'badge':
        return 'Special badge'
      case 'feature_unlock':
        return 'Feature unlock'
      default:
        return 'Reward'
    }
  }

  const unlockedCount = achievements.filter(a => a.is_unlocked).length
  const totalPremiumDays = stats?.premium_days_remaining || 0

  const renderAchievement = (achievement: Achievement) => {
    const progress = getProgressValue(achievement)
    const isUnlocked = achievement.is_unlocked

    return (
      <View key={achievement.id} style={[
        styles.achievementCard,
        isUnlocked && styles.achievementCardUnlocked
      ]}>
        <View style={styles.achievementHeader}>
          <Text style={[
            styles.achievementEmoji,
            !isUnlocked && styles.achievementEmojiLocked
          ]}>
            {achievement.emoji}
          </Text>
          <View style={styles.achievementInfo}>
            <Text style={[
              styles.achievementTitle,
              !isUnlocked && styles.achievementTitleLocked
            ]}>
              {achievement.title}
            </Text>
            <Text style={styles.achievementDescription}>
              {achievement.description}
            </Text>
          </View>
          {isUnlocked && (
            <View style={styles.unlockedBadge}>
              <Text style={styles.unlockedBadgeText}>✓</Text>
            </View>
          )}
        </View>

        <View style={styles.achievementProgress}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {formatRequirementText(achievement)}
            </Text>
            <Text style={styles.rewardText}>
              Reward: {formatReward(achievement)}
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View style={[
              styles.progressBarFill,
              { width: `${progress}%` },
              isUnlocked && styles.progressBarFillComplete
            ]} />
          </View>
        </View>

        {isUnlocked && achievement.unlocked_at && (
          <Text style={styles.unlockedDate}>
            Unlocked on {new Date(achievement.unlocked_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Achievements</Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{unlockedCount}</Text>
                <Text style={styles.statLabel}>Achievements</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalPremiumDays}</Text>
                <Text style={styles.statLabel}>Premium Days</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.current_streak || 0}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
            </View>

            <View style={styles.tabContainer}>
              {(['all', 'unlocked', 'locked'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    selectedTab === tab && styles.tabActive,
                  ]}
                  onPress={() => setSelectedTab(tab)}
                >
                  <Text style={[
                    styles.tabText,
                    selectedTab === tab && styles.tabTextActive,
                  ]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.achievementsList}>
              {filteredAchievements.map(renderAchievement)}
            </View>

            {stats && (
              <View style={styles.overallProgress}>
                <Text style={styles.overallProgressTitle}>Your Progress</Text>
                <View style={styles.progressStats}>
                  <View style={styles.progressStat}>
                    <Text style={styles.progressStatLabel}>Receipts Scanned</Text>
                    <Text style={styles.progressStatValue}>{stats.receipts_scanned}</Text>
                  </View>
                  <View style={styles.progressStat}>
                    <Text style={styles.progressStatLabel}>Transactions</Text>
                    <Text style={styles.progressStatValue}>{stats.transactions_count}</Text>
                  </View>
                  <View style={styles.progressStat}>
                    <Text style={styles.progressStatLabel}>Revenue</Text>
                    <Text style={styles.progressStatValue}>RM {stats.total_revenue.toFixed(0)}</Text>
                  </View>
                  <View style={styles.progressStat}>
                    <Text style={styles.progressStatLabel}>Customers</Text>
                    <Text style={styles.progressStatValue}>{stats.customers_count}</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  closeButton: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
  },
  placeholder: {
    width: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  achievementsList: {
    gap: Spacing.md,
  },
  achievementCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    opacity: 0.7,
  },
  achievementCardUnlocked: {
    opacity: 1,
    borderColor: Colors.success,
    backgroundColor: Colors.success + '10',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  achievementEmoji: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  achievementEmojiLocked: {
    opacity: 0.5,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  achievementTitleLocked: {
    color: Colors.textSecondary,
  },
  achievementDescription: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
  },
  unlockedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedBadgeText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.bold,
  },
  achievementProgress: {
    marginBottom: Spacing.sm,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
  },
  rewardText: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressBarFillComplete: {
    backgroundColor: Colors.success,
  },
  unlockedDate: {
    fontSize: Typography.fontSizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  overallProgress: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overallProgressTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  progressStats: {
    gap: Spacing.md,
  },
  progressStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStatLabel: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
  },
  progressStatValue: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
})