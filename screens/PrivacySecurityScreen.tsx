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

interface SecuritySettings {
  biometric_enabled: boolean
  auto_lock_timeout: number // in minutes
  require_auth_for_reports: boolean
  require_auth_for_settings: boolean
  data_encryption: boolean
  analytics_sharing: boolean
  crash_reporting: boolean
  usage_statistics: boolean
  marketing_data: boolean
}

export default function PrivacySecurityScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<SecuritySettings>({
    biometric_enabled: true,
    auto_lock_timeout: 5,
    require_auth_for_reports: false,
    require_auth_for_settings: true,
    data_encryption: true,
    analytics_sharing: false,
    crash_reporting: true,
    usage_statistics: false,
    marketing_data: false,
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
        .select('security_settings')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data?.security_settings) {
        setSettings({ ...settings, ...data.security_settings })
      }
    } catch (error) {
      console.error('Error loading security settings:', error)
    }
  }

  const saveSettings = async (newSettings: SecuritySettings) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          security_settings: newSettings,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving security settings:', error)
      Alert.alert('Error', 'Failed to save settings')
    }
  }

  const updateSetting = async (key: keyof SecuritySettings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    await saveSettings(newSettings)
  }

  const exportData = () => {
    Alert.alert(
      'Export Data',
      'This will create a file containing all your business data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setLoading(true)
            try {
              // In real implementation, this would generate and download a data export
              await new Promise(resolve => setTimeout(resolve, 2000))
              Alert.alert('Success', 'Data export completed! Check your downloads folder.')
            } catch (error) {
              Alert.alert('Error', 'Failed to export data')
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  const deleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted forever.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Type "DELETE" to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Deletion',
                  style: 'destructive',
                  onPress: async () => {
                    Alert.alert('Account Deleted', 'Your account and all data have been permanently deleted.')
                  }
                }
              ]
            )
          }
        }
      ]
    )
  }

  const timeoutOptions = [
    { value: 1, label: '1 minute' },
    { value: 5, label: '5 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 0, label: 'Never' },
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Privacy & Security</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Protect Your Data</Text>
          <Text style={styles.headerSubtitle}>
            Manage your privacy and security preferences
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryIcon}>🔐</Text>
            <Text style={styles.categoryTitle}>Authentication</Text>
          </View>

          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Biometric Authentication</Text>
                <Text style={styles.settingDescription}>
                  Use Face ID or fingerprint to secure your app
                </Text>
              </View>
              <Switch
                value={settings.biometric_enabled}
                onValueChange={(value) => updateSetting('biometric_enabled', value)}
                trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                thumbColor={settings.biometric_enabled ? Colors.primary : Colors.textSecondary}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Auto-Lock Timer</Text>
                <Text style={styles.settingDescription}>
                  Automatically lock the app after inactivity
                </Text>
                <View style={styles.timeoutSelector}>
                  {timeoutOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.timeoutOption,
                        settings.auto_lock_timeout === option.value && styles.timeoutOptionActive
                      ]}
                      onPress={() => updateSetting('auto_lock_timeout', option.value)}
                    >
                      <Text style={[
                        styles.timeoutOptionText,
                        settings.auto_lock_timeout === option.value && styles.timeoutOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Require Auth for Reports</Text>
                <Text style={styles.settingDescription}>
                  Require authentication to view financial reports
                </Text>
              </View>
              <Switch
                value={settings.require_auth_for_reports}
                onValueChange={(value) => updateSetting('require_auth_for_reports', value)}
                trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                thumbColor={settings.require_auth_for_reports ? Colors.primary : Colors.textSecondary}
              />
            </View>

            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Require Auth for Settings</Text>
                <Text style={styles.settingDescription}>
                  Require authentication to change app settings
                </Text>
              </View>
              <Switch
                value={settings.require_auth_for_settings}
                onValueChange={(value) => updateSetting('require_auth_for_settings', value)}
                trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                thumbColor={settings.require_auth_for_settings ? Colors.primary : Colors.textSecondary}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryIcon}>🛡️</Text>
            <Text style={styles.categoryTitle}>Data Protection</Text>
          </View>

          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Data Encryption</Text>
                <Text style={styles.settingDescription}>
                  Encrypt sensitive data stored on your device
                </Text>
              </View>
              <View style={styles.lockIcon}>
                <Text style={styles.lockText}>🔒</Text>
                <Text style={styles.enabledText}>Always On</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryIcon}>📊</Text>
            <Text style={styles.categoryTitle}>Data Sharing</Text>
          </View>

          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Analytics Sharing</Text>
                <Text style={styles.settingDescription}>
                  Share anonymous usage data to help improve the app
                </Text>
              </View>
              <Switch
                value={settings.analytics_sharing}
                onValueChange={(value) => updateSetting('analytics_sharing', value)}
                trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                thumbColor={settings.analytics_sharing ? Colors.primary : Colors.textSecondary}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Crash Reporting</Text>
                <Text style={styles.settingDescription}>
                  Send crash reports to help fix bugs and improve stability
                </Text>
              </View>
              <Switch
                value={settings.crash_reporting}
                onValueChange={(value) => updateSetting('crash_reporting', value)}
                trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                thumbColor={settings.crash_reporting ? Colors.primary : Colors.textSecondary}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Usage Statistics</Text>
                <Text style={styles.settingDescription}>
                  Share feature usage statistics for product improvement
                </Text>
              </View>
              <Switch
                value={settings.usage_statistics}
                onValueChange={(value) => updateSetting('usage_statistics', value)}
                trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                thumbColor={settings.usage_statistics ? Colors.primary : Colors.textSecondary}
              />
            </View>

            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Marketing Data</Text>
                <Text style={styles.settingDescription}>
                  Allow use of data for marketing and promotional purposes
                </Text>
              </View>
              <Switch
                value={settings.marketing_data}
                onValueChange={(value) => updateSetting('marketing_data', value)}
                trackColor={{ false: Colors.border, true: Colors.primary + '50' }}
                thumbColor={settings.marketing_data ? Colors.primary : Colors.textSecondary}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryIcon}>📤</Text>
            <Text style={styles.categoryTitle}>Data Management</Text>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={exportData}
            disabled={loading}
          >
            <Text style={styles.actionButtonIcon}>📊</Text>
            <View style={styles.actionButtonText}>
              <Text style={styles.actionButtonTitle}>
                {loading ? 'Exporting...' : 'Export My Data'}
              </Text>
              <Text style={styles.actionButtonDescription}>
                Download a copy of all your business data
              </Text>
            </View>
            <Text style={styles.actionButtonChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonIcon}>🔄</Text>
            <View style={styles.actionButtonText}>
              <Text style={styles.actionButtonTitle}>Data Backup Status</Text>
              <Text style={styles.actionButtonDescription}>
                Last backup: 2 hours ago
              </Text>
            </View>
            <Text style={styles.actionButtonChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>🔒 Your Data is Secure</Text>
            <View style={styles.securityFeatures}>
              <View style={styles.securityFeature}>
                <Text style={styles.securityFeatureIcon}>🔐</Text>
                <Text style={styles.securityFeatureText}>
                  End-to-end encryption for sensitive data
                </Text>
              </View>
              <View style={styles.securityFeature}>
                <Text style={styles.securityFeatureIcon}>🏦</Text>
                <Text style={styles.securityFeatureText}>
                  Bank-level security protocols
                </Text>
              </View>
              <View style={styles.securityFeature}>
                <Text style={styles.securityFeatureIcon}>🌍</Text>
                <Text style={styles.securityFeatureText}>
                  GDPR compliant data handling
                </Text>
              </View>
              <View style={styles.securityFeature}>
                <Text style={styles.securityFeatureIcon}>🔍</Text>
                <Text style={styles.securityFeatureText}>
                  Regular security audits and updates
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>⚠️ Danger Zone</Text>
            <Text style={styles.dangerDescription}>
              These actions are permanent and cannot be undone
            </Text>
            
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={deleteAccount}
            >
              <Text style={styles.dangerButtonText}>Delete Account & All Data</Text>
            </TouchableOpacity>
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
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  placeholder: {
    width: 40,
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
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingInfo: {
    flex: 1,
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
  timeoutSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  timeoutOption: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeoutOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeoutOptionText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  timeoutOptionTextActive: {
    color: Colors.textPrimary,
  },
  lockIcon: {
    alignItems: 'center',
  },
  lockText: {
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  enabledText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.success,
  },
  actionButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  actionButtonDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  actionButtonChevron: {
    fontSize: Typography.fontSizes.subheading,
    color: Colors.textSecondary,
  },
  securityInfo: {
    backgroundColor: Colors.success + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  securityTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  securityFeatures: {
    gap: Spacing.md,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityFeatureIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  securityFeatureText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    flex: 1,
  },
  dangerZone: {
    backgroundColor: Colors.error + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  dangerTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.error,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  dangerDescription: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  dangerButton: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
})