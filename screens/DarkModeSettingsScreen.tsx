import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'
import { useTheme } from '../contexts/ThemeContext'

type NavigationProp = StackNavigationProp<RootStackParamList>
type ThemeMode = 'light' | 'dark' | 'system'

export default function DarkModeSettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { theme, colors, setTheme } = useTheme()
  const [loading, setLoading] = useState(false)

  // Remove the loadThemeSettings useEffect as theme context handles this

  // Remove loadThemeSettings function as theme context handles this

  const handleThemeChange = async (newTheme: ThemeMode) => {
    setLoading(true)
    try {
      await setTheme(newTheme)
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

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false} 
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Theme</Text>
          
          {themeOptions.map((themeOption) => (
            <TouchableOpacity
              key={themeOption.id}
              style={[
                styles.themeOption,
                theme === themeOption.id && styles.themeOptionSelected,
              ]}
              onPress={() => handleThemeChange(themeOption.id)}
              disabled={loading}
            >
              <View style={styles.themeHeader}>
                <View style={styles.themeInfo}>
                  <Text style={styles.themeIcon}>{themeOption.icon}</Text>
                  <View style={styles.themeDetails}>
                    <Text style={[
                      styles.themeName,
                      theme === themeOption.id && styles.themeNameSelected,
                    ]}>
                      {themeOption.name}
                    </Text>
                    <Text style={styles.themeDescription}>
                      {themeOption.description}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.themePreview}>
                  {themeOption.preview.map((color, index) => (
                    <View
                      key={index}
                      style={[
                        styles.previewColor,
                        { backgroundColor: color },
                        index === 0 && styles.previewColorFirst,
                        index === themeOption.preview.length - 1 && styles.previewColorLast,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {theme === themeOption.id && (
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
              {themeOptions.find(t => t.id === theme)?.icon} {' '}
              {themeOptions.find(t => t.id === theme)?.name} Benefits
            </Text>
            
            <View style={styles.benefitsList}>
              {benefits[theme].map((benefit, index) => (
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
                <View style={[styles.colorCircle, { backgroundColor: colors.primary }]} />
                <Text style={styles.colorLabel}>Primary</Text>
              </View>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: colors.secondary }]} />
                <Text style={styles.colorLabel}>Secondary</Text>
              </View>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: colors.accent }]} />
                <Text style={styles.colorLabel}>Accent</Text>
              </View>
            </View>
            
            <View style={styles.colorRow}>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: colors.success }]} />
                <Text style={styles.colorLabel}>Success</Text>
              </View>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: colors.error }]} />
                <Text style={styles.colorLabel}>Error</Text>
              </View>
              <View style={styles.colorSample}>
                <View style={[styles.colorCircle, { backgroundColor: colors.textPrimary }]} />
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

        <View style={[styles.section, styles.lastSection]}>
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
                    onPress: () => handleThemeChange('system'),
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
  lastSection: {
    paddingBottom: 0, // Remove bottom padding from last section
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  themeOption: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  themeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
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
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  themeNameSelected: {
    color: colors.primary,
  },
  themeDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
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
    borderColor: colors.background,
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
    borderTopColor: colors.primary + '30',
  },
  selectedText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.primary,
    textAlign: 'center',
  },
  benefitsCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitsTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  colorPalette: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderColor: colors.border,
  },
  colorLabel: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  tipCard: {
    backgroundColor: colors.accent + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.accent + '30',
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
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  tipText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  accessibilityInfo: {
    backgroundColor: colors.success + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  accessibilityTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  accessibilityText: {
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