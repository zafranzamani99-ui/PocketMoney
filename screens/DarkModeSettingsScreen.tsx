import React, { useState, useEffect } from 'react'
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
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

type ThemeMode = 'light' | 'dark' | 'system'

export default function DarkModeSettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('dark')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadThemeSettings()
  }, [])

  const loadThemeSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('theme_mode')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data?.theme_mode) {
        setSelectedTheme(data.theme_mode)
      }
    } catch (error) {
      console.error('Error loading theme settings:', error)
    }
  }

  const saveThemeSettings = async (theme: ThemeMode) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          theme_mode: theme,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setSelectedTheme(theme)
      Alert.alert('Success', 'Theme settings updated! Restart the app to see changes.')
    } catch (error) {
      Alert.alert('Error', 'Failed to save theme settings')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const themeOptions = [
    {
      id: 'light' as ThemeMode,
      name: 'Light Mode',
      description: 'Clean, bright interface perfect for daytime use',
      icon: '☀️',
      preview: ['#FFFFFF', '#F5F5F5', '#E5E5E5'],
    },
    {
      id: 'dark' as ThemeMode,
      name: 'Dark Mode',
      description: 'Easy on the eyes, great for low-light environments',
      icon: '🌙',
      preview: ['#1A1A1A', '#2D2D2D', '#404040'],
    },
    {
      id: 'system' as ThemeMode,
      name: 'System Default',
      description: 'Automatically follows your device settings',
      icon: '📱',
      preview: ['#80D8C3', '#4DA8DA', '#FFD66B'],
    },
  ]

  const benefits = {
    light: [
      'Better readability in bright environments',
      'Classic, professional appearance',
      'Reduced battery usage on LCD screens',
      'Familiar interface design',
    ],
    dark: [
      'Reduced eye strain in low light',
      'Better battery life on OLED screens',
      'Modern, sleek appearance',
      'Less blue light emission',
    ],
    system: [
      'Automatically adjusts to time of day',
      'Matches your device preferences',
      'Seamless user experience',
      'No manual switching needed',
    ],
  }

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
          <Text style={styles.title}>Theme Settings</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Customize Your Experience</Text>
          <Text style={styles.headerSubtitle}>
            Choose the theme that works best for you
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Theme</Text>
          
          {themeOptions.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeOption,
                selectedTheme === theme.id && styles.themeOptionSelected,
              ]}
              onPress={() => saveThemeSettings(theme.id)}
              disabled={loading}
            >
              <View style={styles.themeHeader}>
                <View style={styles.themeInfo}>
                  <Text style={styles.themeIcon}>{theme.icon}</Text>
                  <View style={styles.themeDetails}>
                    <Text style={[
                      styles.themeName,
                      selectedTheme === theme.id && styles.themeNameSelected,
                    ]}>
                      {theme.name}
                    </Text>
                    <Text style={styles.themeDescription}>
                      {theme.description}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.themePreview}>
                  {theme.preview.map((color, index) => (
                    <View
                      key={index}
                      style={[
                        styles.previewColor,
                        { backgroundColor: color },
                        index === 0 && styles.previewColorFirst,
                        index === theme.preview.length - 1 && styles.previewColorLast,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {selectedTheme === theme.id && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedText}>✓ Currently Active</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits</Text>
          
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>
              {themeOptions.find(t => t.id === selectedTheme)?.icon} {' '}
              {themeOptions.find(t => t.id === selectedTheme)?.name} Benefits
            </Text>
            
            <View style={styles.benefitsList}>
              {benefits[selectedTheme].map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>✨</Text>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color Palette Preview</Text>
          
          <View style={styles.colorPalette}>
            <View style={styles.colorRow}>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: Colors.primary }]} />
                <Text style={styles.colorLabel}>Primary</Text>
              </View>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: Colors.secondary }]} />
                <Text style={styles.colorLabel}>Secondary</Text>
              </View>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: Colors.accent }]} />
                <Text style={styles.colorLabel}>Accent</Text>
              </View>
            </View>
            
            <View style={styles.colorRow}>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: Colors.success }]} />
                <Text style={styles.colorLabel}>Success</Text>
              </View>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: Colors.error }]} />
                <Text style={styles.colorLabel}>Error</Text>
              </View>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: Colors.textPrimary }]} />
                <Text style={styles.colorLabel}>Text</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Pro Tip</Text>
              <Text style={styles.tipText}>
                Dark mode can help reduce eye strain during nighttime use and may save battery 
                life on devices with OLED screens.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.accessibilityInfo}>
            <Text style={styles.accessibilityTitle}>♿ Accessibility</Text>
            <Text style={styles.accessibilityText}>
              All themes are designed to meet WCAG accessibility guidelines with sufficient 
              color contrast ratios for optimal readability.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              Alert.alert(
                'Reset Theme',
                'Reset theme to system default?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    onPress: () => saveThemeSettings('system'),
                  },
                ]
              )
            }}
          >
            <Text style={styles.resetButtonText}>Reset to System Default</Text>
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
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  themeOption: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  themeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  themeDetails: {
    flex: 1,
  },
  themeName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  themeNameSelected: {
    color: Colors.primary,
  },
  themeDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  themePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewColor: {
    width: 20,
    height: 20,
    marginLeft: -2,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  previewColorFirst: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    marginLeft: 0,
  },
  previewColorLast: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  selectedIndicator: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.primary + '30',
  },
  selectedText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
    textAlign: 'center',
  },
  benefitsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  benefitsTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  benefitsList: {
    gap: Spacing.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benefitIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  colorPalette: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  colorSample: {
    alignItems: 'center',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  colorLabel: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  tipCard: {
    backgroundColor: Colors.accent + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  tipIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  tipText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  accessibilityInfo: {
    backgroundColor: Colors.success + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  accessibilityTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  accessibilityText: {
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