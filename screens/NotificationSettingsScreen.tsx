import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('notification_settings')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data?.notification_settings) {
        setSettings({ ...settings, ...data.notification_settings })
      }
    } catch (error) {
      console.error('Error loading notification settings:', error)
    }
  }

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          notification_settings: newSettings,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
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

  const testNotification = () => {
    Alert.alert(
      'Test Notification',
      'This is how your notifications will look! 📱',
      [{ text: 'OK' }]
    )
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

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity onPress={testNotification} style={styles.testButton}>
            <Text style={styles.testText}>Test</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Stay Updated</Text>
          <Text style={styles.headerSubtitle}>
            Control when and how you receive notifications
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
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
              trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
              thumbColor={settings.push_enabled ? Colors.primary : Colors.textSecondary}
            />
          </View>
        </View>

        {settings.push_enabled && (
          <>
            {notificationCategories.map((category, categoryIndex) => (
              <View key={categoryIndex} style={styles.section}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                </View>

                <View style={styles.settingsCard}>
                  {category.settings.map((setting, settingIndex) => (
                    <View key={settingIndex} style={[
                      styles.settingItem,
                      settingIndex === category.settings.length - 1 && styles.settingItemLast
                    ]}>
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingTitle}>{setting.title}</Text>
                        <Text style={styles.settingDescription}>
                          {setting.description}
                        </Text>
                      </View>
                      <Switch
                        value={setting.enabled}
                        onValueChange={(value) => updateSetting(setting.key, value)}
                        trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                        thumbColor={setting.enabled ? Colors.primary : Colors.textSecondary}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.section}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryIcon}>🌙</Text>
                <Text style={styles.categoryTitle}>Quiet Hours</Text>
              </View>

              <View style={styles.settingsCard}>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Do Not Disturb</Text>
                    <Text style={styles.settingDescription}>
                      Silence notifications during specific hours
                    </Text>
                  </View>
                  <Switch
                    value={settings.quiet_hours_enabled}
                    onValueChange={(value) => updateSetting('quiet_hours_enabled', value)}
                    trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                    thumbColor={settings.quiet_hours_enabled ? Colors.primary : Colors.textSecondary}
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
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📱 Notification Tips</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tip}>• Enable order alerts to never miss a sale</Text>
              <Text style={styles.tip}>• Daily summaries help track your progress</Text>
              <Text style={styles.tip}>• Use quiet hours for better work-life balance</Text>
              <Text style={styles.tip}>• Expense reminders help maintain good habits</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    paddingTop: Platform.OS === 'android' ? Spacing.xl : Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  testButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  testText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  masterToggle: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  masterToggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  masterToggleTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  masterToggleDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  categoryTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  settingsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  timeSettings: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
    color: Colors.textPrimary,
  },
  timeButton: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tip: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  resetButton: {
    backgroundColor: Colors.error + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  resetButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.error,
  },
})