import { supabase } from '../lib/supabase'
import { Alert } from 'react-native'

interface Achievement {
  id: string
  title: string
  description: string
  emoji: string
  reward_type: 'premium_days' | 'badge' | 'feature_unlock'
  reward_value: number
  requirement_type: 'receipt_count' | 'transaction_count' | 'streak_days' | 'revenue_amount' | 'customer_count'
  requirement_value: number
  is_unlocked: boolean
  unlocked_at?: string
}

interface UserStats {
  receipts_scanned: number
  transactions_count: number
  current_streak: number
  total_revenue: number
  customers_count: number
  premium_days_remaining: number
}

class GamificationService {
  private achievements: Achievement[] = [
    {
      id: 'first_receipt',
      title: 'First Scan',
      description: 'Scan your first receipt',
      emoji: '📄',
      reward_type: 'premium_days',
      reward_value: 7,
      requirement_type: 'receipt_count',
      requirement_value: 1,
      is_unlocked: false,
    },
    {
      id: 'receipt_master',
      title: 'Receipt Master',
      description: 'Scan 10 receipts',
      emoji: '📸',
      reward_type: 'premium_days',
      reward_value: 3,
      requirement_type: 'receipt_count',
      requirement_value: 10,
      is_unlocked: false,
    },
    {
      id: 'first_sale',
      title: 'First Sale',
      description: 'Record your first transaction',
      emoji: '🎯',
      reward_type: 'premium_days',
      reward_value: 3,
      requirement_type: 'transaction_count',
      requirement_value: 1,
      is_unlocked: false,
    },
    {
      id: 'transaction_pro',
      title: 'Transaction Pro',
      description: 'Record 50 transactions',
      emoji: '💰',
      reward_type: 'premium_days',
      reward_value: 7,
      requirement_type: 'transaction_count',
      requirement_value: 50,
      is_unlocked: false,
    },
    {
      id: 'week_streak',
      title: 'Week Warrior',
      description: '7-day tracking streak',
      emoji: '🔥',
      reward_type: 'premium_days',
      reward_value: 14,
      requirement_type: 'streak_days',
      requirement_value: 7,
      is_unlocked: false,
    },
    {
      id: 'month_streak',
      title: 'Monthly Master',
      description: '30-day tracking streak',
      emoji: '⭐',
      reward_type: 'premium_days',
      reward_value: 30,
      requirement_type: 'streak_days',
      requirement_value: 30,
      is_unlocked: false,
    },
    {
      id: 'profitable_day',
      title: 'First Profit',
      description: 'Earn your first RM 100',
      emoji: '💸',
      reward_type: 'premium_days',
      reward_value: 3,
      requirement_type: 'revenue_amount',
      requirement_value: 100,
      is_unlocked: false,
    },
    {
      id: 'big_earner',
      title: 'Big Earner',
      description: 'Reach RM 1,000 in revenue',
      emoji: '💎',
      reward_type: 'premium_days',
      reward_value: 14,
      requirement_type: 'revenue_amount',
      requirement_value: 1000,
      is_unlocked: false,
    },
    {
      id: 'customer_collector',
      title: 'Customer Collector',
      description: 'Add 10 customers',
      emoji: '👥',
      reward_type: 'premium_days',
      reward_value: 7,
      requirement_type: 'customer_count',
      requirement_value: 10,
      is_unlocked: false,
    },
  ]

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Get receipts count
      const { count: receiptsCount } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Get transactions count (expenses + orders)
      const { count: expensesCount } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Get total revenue from orders
      const { data: orders } = await supabase
        .from('orders')
        .select('amount')
        .eq('user_id', userId)

      const totalRevenue = orders?.reduce((sum, order) => sum + order.amount, 0) || 0

      // Get customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Calculate current streak (simplified - last 7 days with activity)
      const currentStreak = await this.calculateStreak(userId)

      // Get premium days remaining
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('premium_expires_at')
        .eq('user_id', userId)
        .single()

      let premiumDaysRemaining = 0
      if (userSettings?.premium_expires_at) {
        const expiresAt = new Date(userSettings.premium_expires_at)
        const now = new Date()
        const diffTime = expiresAt.getTime() - now.getTime()
        premiumDaysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      }

      return {
        receipts_scanned: receiptsCount || 0,
        transactions_count: (expensesCount || 0) + (ordersCount || 0),
        current_streak: currentStreak,
        total_revenue: totalRevenue,
        customers_count: customersCount || 0,
        premium_days_remaining: premiumDaysRemaining,
      }
    } catch (error) {
      console.error('Failed to get user stats:', error)
      return {
        receipts_scanned: 0,
        transactions_count: 0,
        current_streak: 0,
        total_revenue: 0,
        customers_count: 0,
        premium_days_remaining: 0,
      }
    }
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId)

      const unlockedIds = new Set(userAchievements?.map(a => a.achievement_id) || [])

      return this.achievements.map(achievement => ({
        ...achievement,
        is_unlocked: unlockedIds.has(achievement.id),
        unlocked_at: userAchievements?.find(a => a.achievement_id === achievement.id)?.unlocked_at,
      }))
    } catch (error) {
      console.error('Failed to get user achievements:', error)
      return this.achievements
    }
  }

  async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    try {
      const stats = await this.getUserStats(userId)
      const achievements = await this.getUserAchievements(userId)
      const newlyUnlocked: Achievement[] = []

      for (const achievement of achievements) {
        if (achievement.is_unlocked) continue

        let shouldUnlock = false

        switch (achievement.requirement_type) {
          case 'receipt_count':
            shouldUnlock = stats.receipts_scanned >= achievement.requirement_value
            break
          case 'transaction_count':
            shouldUnlock = stats.transactions_count >= achievement.requirement_value
            break
          case 'streak_days':
            shouldUnlock = stats.current_streak >= achievement.requirement_value
            break
          case 'revenue_amount':
            shouldUnlock = stats.total_revenue >= achievement.requirement_value
            break
          case 'customer_count':
            shouldUnlock = stats.customers_count >= achievement.requirement_value
            break
        }

        if (shouldUnlock) {
          await this.unlockAchievement(userId, achievement)
          newlyUnlocked.push({ ...achievement, is_unlocked: true })
        }
      }

      return newlyUnlocked
    } catch (error) {
      console.error('Failed to check achievements:', error)
      return []
    }
  }

  private async unlockAchievement(userId: string, achievement: Achievement): Promise<void> {
    try {
      // Record achievement unlock
      await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_id: achievement.id,
        unlocked_at: new Date().toISOString(),
      })

      // Apply reward
      if (achievement.reward_type === 'premium_days') {
        await this.addPremiumDays(userId, achievement.reward_value)
      }

      // Log achievement unlock
      await supabase.from('gamification_logs').insert({
        user_id: userId,
        action: 'achievement_unlocked',
        achievement_id: achievement.id,
        reward_type: achievement.reward_type,
        reward_value: achievement.reward_value,
        created_at: new Date().toISOString(),
      })

      console.log(`Achievement unlocked: ${achievement.title}`)
    } catch (error) {
      console.error('Failed to unlock achievement:', error)
    }
  }

  private async addPremiumDays(userId: string, days: number): Promise<void> {
    try {
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('premium_expires_at')
        .eq('user_id', userId)
        .single()

      let newExpiryDate: Date

      if (userSettings?.premium_expires_at) {
        const currentExpiry = new Date(userSettings.premium_expires_at)
        const now = new Date()
        
        // If premium hasn't expired yet, extend from expiry date
        // If expired, extend from today
        const baseDate = currentExpiry > now ? currentExpiry : now
        newExpiryDate = new Date(baseDate)
        newExpiryDate.setDate(newExpiryDate.getDate() + days)
      } else {
        // First time premium
        newExpiryDate = new Date()
        newExpiryDate.setDate(newExpiryDate.getDate() + days)
      }

      await supabase.from('user_settings').upsert({
        user_id: userId,
        premium_expires_at: newExpiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      })

      console.log(`Added ${days} premium days. New expiry: ${newExpiryDate}`)
    } catch (error) {
      console.error('Failed to add premium days:', error)
    }
  }

  private async calculateStreak(userId: string): Promise<number> {
    try {
      // Get the last 30 days of activity
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: expenses } = await supabase
        .from('expenses')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      const { data: orders } = await supabase
        .from('orders')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      // Combine and get unique days
      const allDates = [
        ...(expenses || []).map(e => e.created_at.split('T')[0]),
        ...(orders || []).map(o => o.created_at.split('T')[0]),
      ]

      const uniqueDays = Array.from(new Set(allDates)).sort().reverse()

      // Calculate consecutive days from today
      let streak = 0
      const today = new Date().toISOString().split('T')[0]
      let checkDate = today

      for (const day of uniqueDays) {
        if (day === checkDate) {
          streak++
          const date = new Date(checkDate)
          date.setDate(date.getDate() - 1)
          checkDate = date.toISOString().split('T')[0]
        } else {
          break
        }
      }

      return streak
    } catch (error) {
      console.error('Failed to calculate streak:', error)
      return 0
    }
  }

  async showAchievementNotification(achievement: Achievement): Promise<void> {
    Alert.alert(
      '🎉 Achievement Unlocked!',
      `${achievement.emoji} ${achievement.title}\n\n${achievement.description}\n\nReward: ${achievement.reward_value} days premium access!`,
      [{ text: 'Awesome!', style: 'default' }]
    )
  }

  async getProgressToNextAchievement(userId: string): Promise<{ achievement: Achievement; progress: number } | null> {
    try {
      const stats = await this.getUserStats(userId)
      const achievements = await this.getUserAchievements(userId)

      // Find the closest unachieved achievement
      let closest: { achievement: Achievement; progress: number } | null = null

      for (const achievement of achievements) {
        if (achievement.is_unlocked) continue

        let currentValue = 0
        switch (achievement.requirement_type) {
          case 'receipt_count':
            currentValue = stats.receipts_scanned
            break
          case 'transaction_count':
            currentValue = stats.transactions_count
            break
          case 'streak_days':
            currentValue = stats.current_streak
            break
          case 'revenue_amount':
            currentValue = stats.total_revenue
            break
          case 'customer_count':
            currentValue = stats.customers_count
            break
        }

        const progress = Math.min(100, (currentValue / achievement.requirement_value) * 100)

        if (!closest || progress > closest.progress) {
          closest = { achievement, progress }
        }
      }

      return closest
    } catch (error) {
      console.error('Failed to get progress to next achievement:', error)
      return null
    }
  }

  // Called whenever user performs an action
  async onUserAction(userId: string, action: 'receipt_scanned' | 'transaction_added' | 'customer_added'): Promise<void> {
    try {
      const newAchievements = await this.checkAndUnlockAchievements(userId)
      
      // Show notifications for new achievements
      for (const achievement of newAchievements) {
        await this.showAchievementNotification(achievement)
      }
    } catch (error) {
      console.error('Failed to process user action:', error)
    }
  }
}

export const gamificationService = new GamificationService()
export type { Achievement, UserStats }