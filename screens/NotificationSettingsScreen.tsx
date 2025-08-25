import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface NotificationSettings {
  push_enabled: boolean
  daily_summary: boolean
  weekly_report: boolean
  expense_reminders: boolean
  order_alerts: boolean
  backup_reminders: boolean
  marketing_updates: boolean
  feature_announcements: boolean
  quiet_hours_enabled: boolean
  quiet_start: string
  quiet_end: string
}

export default function NotificationSettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { colors } = useTheme()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    push_enabled: true,
    daily_summary: true,
    weekly_report: true,
    expense_reminders: true,
    order_alerts: true,
    backup_reminders: true,
    marketing_updates: false,
    feature_announcements: true,
    quiet_hours_enabled: false,
    quiet_start: '22:00',
    quiet_end: '08:00',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // For now, just use local state - database column doesn't exist yet
      // TODO: Add notification_settings column to user_settings table
      console.log('Loading notification settings from local state')
    } catch (error) {
      console.error('Error loading notification settings:', error)
    }
  }

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      // For now, just use local state - database column doesn't exist yet
      // TODO: Add notification_settings column to user_settings table
      console.log('Saving notification settings to local state:', newSettings)
    } catch (error) {
      console.error('Error saving notification settings:', error)
      Alert.alert('Error', 'Failed to save settings')
    }
  }

  const updateSetting = async (key: keyof NotificationSettings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    await saveSettings(newSettings)
  }


  const notificationCategories = [
    {
      title: 'Business Alerts',
      icon: '🏪',
      settings: [
        {
          key: 'order_alerts' as keyof NotificationSettings,
          title: 'Order Notifications',
          description: 'Get notified about new orders and payments',
          enabled: settings.order_alerts,
        },
        {
          key: 'expense_reminders' as keyof NotificationSettings,
          title: 'Expense Reminders',
          description: 'Daily reminders to log your expenses',
          enabled: settings.expense_reminders,
        },
      ],
    },
    {
      title: 'Reports & Summaries',
      icon: '📊',
      settings: [
        {
          key: 'daily_summary' as keyof NotificationSettings,
          title: 'Daily Summary',
          description: 'End-of-day summary of transactions',
          enabled: settings.daily_summary,
        },
        {
          key: 'weekly_report' as keyof NotificationSettings,
          title: 'Weekly Report',
          description: 'Weekly business performance report',
          enabled: settings.weekly_report,
        },
      ],
    },
    {
      title: 'System & Maintenance',
      icon: '⚙️',
      settings: [
        {
          key: 'backup_reminders' as keyof NotificationSettings,
          title: 'Backup Reminders',
          description: 'Reminders to back up your data',
          enabled: settings.backup_reminders,
        },
        {
          key: 'feature_announcements' as keyof NotificationSettings,
          title: 'Feature Updates',
          description: 'Notifications about new features',
          enabled: settings.feature_announcements,
        },
      ],
    },
    {
      title: 'Marketing & Promotions',
      icon: '🎯',
      settings: [
        {
          key: 'marketing_updates' as keyof NotificationSettings,
          title: 'Promotional Offers',
          description: 'Special offers and promotions',
          enabled: settings.marketing_updates,
        },
      ],
    },
  ]

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Stay Updated</Text>
          <Text style={styles.headerSubtitle}>
            Control when and how you receive notifications
          </Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false} 
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Master Control</Text>
          
          <View style={styles.masterToggle}>
            <View style={styles.masterToggleInfo}>
              <Text style={styles.masterToggleTitle}>Push Notifications</Text>
              <Text style={styles.masterToggleDescription}>
                Enable all push notifications for this app
              </Text>
            </View>
            <Switch
              value={settings.push_enabled}
              onValueChange={(value) => updateSetting('push_enabled', value)}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={settings.push_enabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>

        {settings.push_enabled && (
          <>
            {notificationCategories.map((category, categoryIndex) => (
              <View key={categoryIndex} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {category.icon} {category.title}
                </Text>

                <View style={styles.notificationCard}>
                  {category.settings.map((setting, settingIndex) => (
                    <View key={settingIndex} style={[
                      styles.notificationOption,
                      settingIndex === category.settings.length - 1 && styles.notificationOptionLast
                    ]}>
                      <View style={styles.notificationInfo}>
                        <Text style={styles.notificationTitle}>{setting.title}</Text>
                        <Text style={styles.notificationDescription}>
                          {setting.description}
                        </Text>
                      </View>
                      <Switch
                        value={setting.enabled}
                        onValueChange={(value) => updateSetting(setting.key, value)}
                        trackColor={{ false: colors.border, true: colors.primary + '50' }}
                        thumbColor={setting.enabled ? colors.primary : colors.textSecondary}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌙 Quiet Hours</Text>

              <View style={styles.notificationCard}>
                <View style={styles.notificationOption}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>Do Not Disturb</Text>
                    <Text style={styles.notificationDescription}>
                      Silence notifications during specific hours
                    </Text>
                  </View>
                  <Switch
                    value={settings.quiet_hours_enabled}
                    onValueChange={(value) => updateSetting('quiet_hours_enabled', value)}
                    trackColor={{ false: colors.border, true: colors.primary + '50' }}
                    thumbColor={settings.quiet_hours_enabled ? colors.primary : colors.textSecondary}
                  />
                </View>

                {settings.quiet_hours_enabled && (
                  <View style={styles.timeSettings}>
                    <View style={styles.timeSettingRow}>
                      <Text style={styles.timeLabel}>From:</Text>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => Alert.alert('Time Picker', 'Time picker would open here')}
                      >
                        <Text style={styles.timeText}>{settings.quiet_start}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.timeSettingRow}>
                      <Text style={styles.timeLabel}>Until:</Text>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => Alert.alert('Time Picker', 'Time picker would open here')}
                      >
                        <Text style={styles.timeText}>{settings.quiet_end}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips & Best Practices</Text>
          
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>📱 Notification Tips</Text>
            
            <View style={styles.tipsList}>
              {[
                'Enable order alerts to never miss a sale',
                'Daily summaries help track your progress',
                'Use quiet hours for better work-life balance',
                'Expense reminders help maintain good habits'
              ].map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Text style={styles.tipIcon}>✨</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.resetButton} onPress={() => {
            Alert.alert(
              'Reset Settings',
              'Reset all notification settings to default?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: () => {
                    const defaultSettings: NotificationSettings = {
                      push_enabled: true,
                      daily_summary: true,
                      weekly_report: true,
                      expense_reminders: true,
                      order_alerts: true,
                      backup_reminders: true,
                      marketing_updates: false,
                      feature_announcements: true,
                      quiet_hours_enabled: false,
                      quiet_start: '22:00',
                      quiet_end: '08:00',
                    }
                    setSettings(defaultSettings)
                    saveSettings(defaultSettings)
                    Alert.alert('Success', 'Notification settings have been reset to default.')
                  }
                }
              ]
            )
          }}>
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg, // Reduced padding - SafeAreaView handles notch/Dynamic Island  
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  backIcon: {
    fontSize: 30,
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
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 0, // Space for home indicator
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  masterToggle: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  masterToggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  masterToggleTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  masterToggleDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  notificationCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  notificationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationOptionLast: {
    borderBottomWidth: 0,
  },
  notificationInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  notificationTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  notificationDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  timeSettings: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: Spacing.md,
  },
  timeSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  timeButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  tipsCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
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
  tipsList: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  resetButton: {
    backgroundColor: colors.error + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  resetButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.error,
  },
})