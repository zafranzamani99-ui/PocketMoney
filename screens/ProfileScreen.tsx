import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const { width: screenWidth } = Dimensions.get('window')
const isTablet = screenWidth >= 768
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'
import { RateApp } from '../utils/rateApp'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface User {
  id: string
  email: string
  business_name: string | null
  phone: string | null
  business_type: string | null
}

interface UserStats {
  transactionCount: number
  daysActive: number
  totalRevenue: number
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { colors } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [userStats, setUserStats] = useState<UserStats>({
    transactionCount: 0,
    daysActive: 0,
    totalRevenue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      // Load user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userError) throw userError
      setUser(userData)

      // Load user statistics
      await loadUserStats(authUser.id)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserStats = async (userId: string) => {
    try {
      // Get transaction count (expenses + orders)
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', userId)

      const { data: ordersData } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId)

      const transactionCount = (expensesData?.length || 0) + (ordersData?.length || 0)

      // Get total revenue from completed orders
      const { data: revenueData } = await supabase
        .from('orders')
        .select('amount')
        .eq('user_id', userId)
        .neq('status', 'pending')

      const totalRevenue = revenueData?.reduce((sum, order) => sum + order.amount, 0) || 0

      // Calculate days active (from account creation to now)
      const createdAt = new Date(user?.created_at || new Date())
      const now = new Date()
      const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

      setUserStats({
        transactionCount,
        daysActive: Math.max(1, daysActive), // At least 1 day
        totalRevenue
      })
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const getUserInitial = () => {
    if (user?.business_name) {
      return user.business_name.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = () => {
    return user?.business_name || user?.email?.split('@')[0] || 'User'
  }
  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${title}\n\n${message}`)
      if (confirmed && onConfirm) {
        onConfirm()
      }
    } else {
      if (onConfirm) {
        Alert.alert(title, message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK', onPress: onConfirm }
        ])
      } else {
        Alert.alert(title, message)
      }
    }
  }

  const handleSignOut = async () => {
    console.log('Sign out button pressed') // Debug log
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      async () => {
        await supabase.auth.signOut()
      }
    )
  }

  const handleItemPress = (label: string) => {
    console.log('Button pressed:', label) // Debug log
    
    switch (label) {
      case 'Analytics & Reports':
        // Navigate to the Dashboard for insights
        showAlert('Analytics & Reports', 'Analytics features are available on the Dashboard tab. Tap the Home tab to view your business insights.')
        break
      case 'Customer Management':
        // Navigate to the Orders tab for customer info
        showAlert('Customer Management', 'Customer information is available in the Orders tab. Tap the Orders tab to view and manage customer orders.')
        break
      case 'POS Settings':
        navigation.navigate('POSSettings' as never)
        break
      case 'Business Profile':
        navigation.navigate('BusinessProfile' as never)
        break
      case 'Primary Wallet':
        navigation.navigate('WalletManagement' as never)
        break
      case 'Business Type':
        showAlert('Business Type', 'Feature coming soon! Change your business category.')
        break
      case 'Upgrade to Premium':
        navigation.navigate('PremiumUpgrade' as never)
        break
      case 'Google Sheets Sync':
        navigation.navigate('GoogleSheetsSync' as never)
        break
      case 'Voice Input':
        showAlert('Premium Feature', 'Feature coming soon! Upgrade to Premium to use voice input.')
        break
      case 'Notifications':
        navigation.navigate('NotificationSettings' as never)
        break
      case 'Dark Mode':
        navigation.navigate('DarkModeSettings' as never)
        break
      case 'Language':
        navigation.navigate('LanguageSelection' as never)
        break
      case 'Privacy & Security':
        navigation.navigate('PrivacySecurity' as never)
        break
      case 'Help & FAQ':
        navigation.navigate('HelpFAQ' as never)
        break
      case 'Contact Support':
        navigation.navigate('ContactSupport' as never)
        break
      case 'Rate App':
        RateApp.promptForRating({
          title: 'Rate PocketMoney',
          message: 'We hope you\'re enjoying PocketMoney! Your rating helps us improve and reach more Malaysian businesses. Would you mind taking a moment to rate us?',
          cancelText: 'Not Now',
          rateText: '⭐ Rate Now',
          laterText: 'Remind Later'
        })
        break
      case 'Terms & Privacy':
        navigation.navigate('TermsPrivacy' as never)
        break
      case 'Database Test':
        navigation.navigate('DatabaseTest' as never)
        break
      default:
        showAlert('Coming Soon', 'This feature is coming soon!')
    }
  }

  const profileSections = [
    {
      title: 'Business Tools',
      items: [
        { icon: '📈', label: 'Analytics & Reports', value: 'View insights' },
        { icon: '👥', label: 'Customer Management', value: 'Manage customers' },
        { icon: '⚡', label: 'POS Settings', value: 'Quick items & pricing' },
      ],
    },
    {
      title: 'Business',
      items: [
        { icon: '🏪', label: 'Business Profile', value: user?.business_name || 'Not set' },
        { icon: '💰', label: 'Primary Wallet', value: 'Cash Wallet' },
        { icon: '📊', label: 'Business Type', value: user?.business_type || 'Not set' },
      ],
    },
    {
      title: 'Premium Features',
      items: [
        { icon: '⭐', label: 'Upgrade to Premium', value: 'RM 9.90/month', isPremium: true },
        { icon: '📄', label: 'Google Sheets Sync', value: 'Premium only', disabled: true },
        { icon: '🎤', label: 'Voice Input', value: 'Premium only', disabled: true },
      ],
    },
    {
      title: 'Settings',
      items: [
        { icon: '🔔', label: 'Notifications', value: 'Enabled' },
        { icon: '🌙', label: 'Dark Mode', value: 'On' },
        { icon: '🗣️', label: 'Language', value: 'English' },
        { icon: '🔒', label: 'Privacy & Security', value: '' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: '❓', label: 'Help & FAQ', value: '' },
        { icon: '💬', label: 'Contact Support', value: '' },
        { icon: '⭐', label: 'Rate App', value: '' },
        { icon: '📄', label: 'Terms & Privacy', value: '' },
        { icon: '🧪', label: 'Database Test', value: 'Debug' },
      ],
    },
  ]

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.mainContainer, isTablet && styles.tabletContainer]}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>{loading ? '...' : getUserInitial()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{loading ? 'Loading...' : getUserDisplayName()}</Text>
            <Text style={styles.userEmail}>{loading ? 'Loading...' : (user?.email || 'No email')}</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planText}>Free Plan</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCards}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loading ? '...' : userStats.transactionCount.toString()}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loading ? '...' : userStats.daysActive.toString()}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loading ? '...' : `RM ${userStats.totalRevenue.toFixed(0)}`}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
        </View>

        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.sectionItem,
                    item.disabled && styles.sectionItemDisabled,
                    itemIndex === section.items.length - 1 && styles.sectionItemLast,
                  ]}
                  disabled={item.disabled}
                  onPress={() => handleItemPress(item.label)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionItemLeft}>
                    <Text style={styles.sectionItemIcon}>{item.icon}</Text>
                    <Text style={[
                      styles.sectionItemLabel,
                      item.disabled && styles.sectionItemLabelDisabled,
                    ]}>
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.sectionItemRight}>
                    {item.isPremium && (
                      <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>Premium</Text>
                      </View>
                    )}
                    <Text style={[
                      styles.sectionItemValue,
                      item.disabled && styles.sectionItemValueDisabled,
                    ]}>
                      {item.value}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
  },
  mainContainer: {
    flex: 1,
  },
  tabletContainer: {
    maxWidth: '95%',
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes.display,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userInitial: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  planBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  planText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.accent,
  },
  statsCards: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionItemDisabled: {
    opacity: 0.5,
  },
  sectionItemLast: {
    borderBottomWidth: 0,
  },
  sectionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionItemIcon: {
    fontSize: 18,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  sectionItemLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  sectionItemLabelDisabled: {
    color: colors.textSecondary,
  },
  sectionItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionItemValue: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  sectionItemValueDisabled: {
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: Typography.fontSizes.subheading,
    color: colors.textSecondary,
  },
  premiumBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  premiumBadgeText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.primary,
  },
  signOutButton: {
    backgroundColor: colors.error + '20',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  signOutText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.error,
    textAlign: 'center',
  },
})