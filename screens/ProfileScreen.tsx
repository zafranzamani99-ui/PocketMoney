import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'
import { RateApp } from '../utils/rateApp'

type NavigationProp = StackNavigationProp<RootStackParamList>

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>()
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
      ],
    },
    {
      title: 'Business',
      items: [
        { icon: '🏪', label: 'Business Profile', value: 'Ali\'s Warung' },
        { icon: '💰', label: 'Primary Wallet', value: 'Cash Wallet' },
        { icon: '📊', label: 'Business Type', value: 'Food & Beverage' },
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>A</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Ali Rahman</Text>
            <Text style={styles.userEmail}>ali@warungtradisional.com</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planText}>Free Plan</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCards}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>127</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>15</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>RM 1,261</Text>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.lg : Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userInitial: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  planBadge: {
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  planText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.accent,
  },
  statsCards: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    color: Colors.textPrimary,
  },
  sectionItemLabelDisabled: {
    color: Colors.textSecondary,
  },
  sectionItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionItemValue: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  sectionItemValueDisabled: {
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: Typography.fontSizes.subheading,
    color: Colors.textSecondary,
  },
  premiumBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  premiumBadgeText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
  },
  signOutButton: {
    backgroundColor: Colors.error + '20',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  signOutText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.error,
    textAlign: 'center',
  },
})