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
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface Language {
  code: string
  name: string
  nativeName: string
  flag: string
  region: string
  popularity: 'high' | 'medium' | 'low'
  progress: number
}

export default function LanguageSelectionScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { colors } = useTheme()
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadLanguageSettings()
  }, [])

  const loadLanguageSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_settings')
        .select('language')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data?.language) {
        setSelectedLanguage(data.language)
      }
    } catch (error) {
      console.error('Error loading language settings:', error)
    }
  }

  const saveLanguageSettings = async (languageCode: string) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          language: languageCode,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setSelectedLanguage(languageCode)
      Alert.alert('Success', 'Language updated! Restart the app to see changes.')
    } catch (error) {
      Alert.alert('Error', 'Failed to save language settings')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const languages: Language[] = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      region: 'International',
      popularity: 'high',
      progress: 100,
    },
    {
      code: 'ms',
      name: 'Malay',
      nativeName: 'Bahasa Malaysia',
      flag: '🇲🇾',
      region: 'Malaysia',
      popularity: 'high',
      progress: 100,
    },
    {
      code: 'zh-cn',
      name: 'Chinese (Simplified)',
      nativeName: '简体中文',
      flag: '🇨🇳',
      region: 'China',
      popularity: 'high',
      progress: 95,
    },
    {
      code: 'zh-tw',
      name: 'Chinese (Traditional)',
      nativeName: '繁體中文',
      flag: '🇹🇼',
      region: 'Taiwan',
      popularity: 'medium',
      progress: 90,
    },
    {
      code: 'ta',
      name: 'Tamil',
      nativeName: 'தமிழ்',
      flag: '🇮🇳',
      region: 'India/Malaysia',
      popularity: 'medium',
      progress: 85,
    },
    {
      code: 'id',
      name: 'Indonesian',
      nativeName: 'Bahasa Indonesia',
      flag: '🇮🇩',
      region: 'Indonesia',
      popularity: 'medium',
      progress: 80,
    },
    {
      code: 'th',
      name: 'Thai',
      nativeName: 'ภาษาไทย',
      flag: '🇹🇭',
      region: 'Thailand',
      popularity: 'medium',
      progress: 75,
    },
    {
      code: 'vi',
      name: 'Vietnamese',
      nativeName: 'Tiếng Việt',
      flag: '🇻🇳',
      region: 'Vietnam',
      popularity: 'medium',
      progress: 70,
    },
    {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      flag: '🇮🇳',
      region: 'India',
      popularity: 'medium',
      progress: 65,
    },
    {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      flag: '🇸🇦',
      region: 'Middle East',
      popularity: 'low',
      progress: 60,
    },
    {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flag: '🇯🇵',
      region: 'Japan',
      popularity: 'low',
      progress: 55,
    },
    {
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      flag: '🇰🇷',
      region: 'South Korea',
      popularity: 'low',
      progress: 50,
    },
  ]

  const getPopularityColor = (popularity: string) => {
    switch (popularity) {
      case 'high': return colors.success
      case 'medium': return colors.accent
      case 'low': return colors.error
      default: return colors.textSecondary
    }
  }

  const getPopularityLabel = (popularity: string) => {
    switch (popularity) {
      case 'high': return 'Fully Supported'
      case 'medium': return 'Good Support'
      case 'low': return 'Basic Support'
      default: return 'Unknown'
    }
  }

  const groupedLanguages = {
    featured: languages.filter(lang => lang.popularity === 'high'),
    supported: languages.filter(lang => lang.popularity === 'medium'),
    beta: languages.filter(lang => lang.popularity === 'low'),
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
          <Text style={styles.title}>Language</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Choose Your Language</Text>
          <Text style={styles.headerSubtitle}>
            Select your preferred language for the app
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
          <Text style={styles.sectionTitle}>🌟 Featured Languages</Text>
          <Text style={styles.sectionDescription}>
            Fully translated with complete feature support
          </Text>
          
          {groupedLanguages.featured.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageOption,
                selectedLanguage === language.code && styles.languageOptionSelected,
              ]}
              onPress={() => saveLanguageSettings(language.code)}
              disabled={loading}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <View style={styles.languageDetails}>
                  <Text style={[
                    styles.languageName,
                    selectedLanguage === language.code && styles.languageNameSelected,
                  ]}>
                    {language.name}
                  </Text>
                  <Text style={styles.languageNativeName}>
                    {language.nativeName}
                  </Text>
                  <Text style={styles.languageRegion}>
                    {language.region}
                  </Text>
                </View>
              </View>
              
              <View style={styles.languageStatus}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getPopularityColor(language.popularity) + '20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getPopularityColor(language.popularity) }
                  ]}>
                    {getPopularityLabel(language.popularity)}
                  </Text>
                </View>
                
                {selectedLanguage === language.code && (
                  <Text style={styles.selectedIndicator}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌍 Supported Languages</Text>
          <Text style={styles.sectionDescription}>
            Well-translated with most features available
          </Text>
          
          {groupedLanguages.supported.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageOption,
                selectedLanguage === language.code && styles.languageOptionSelected,
              ]}
              onPress={() => saveLanguageSettings(language.code)}
              disabled={loading}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <View style={styles.languageDetails}>
                  <Text style={[
                    styles.languageName,
                    selectedLanguage === language.code && styles.languageNameSelected,
                  ]}>
                    {language.name}
                  </Text>
                  <Text style={styles.languageNativeName}>
                    {language.nativeName}
                  </Text>
                  <Text style={styles.languageRegion}>
                    {language.region}
                  </Text>
                </View>
              </View>
              
              <View style={styles.languageStatus}>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      { 
                        width: `${language.progress}%`,
                        backgroundColor: getPopularityColor(language.popularity)
                      }
                    ]} />
                  </View>
                  <Text style={styles.progressText}>{language.progress}%</Text>
                </View>
                
                {selectedLanguage === language.code && (
                  <Text style={styles.selectedIndicator}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚧 Beta Languages</Text>
          <Text style={styles.sectionDescription}>
            Partially translated, some features may be in English
          </Text>
          
          {groupedLanguages.beta.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageOption,
                styles.languageOptionBeta,
                selectedLanguage === language.code && styles.languageOptionSelected,
              ]}
              onPress={() => {
                Alert.alert(
                  'Beta Language',
                  `${language.name} is still in beta. Some features may not be fully translated. Continue?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Continue', onPress: () => saveLanguageSettings(language.code) }
                  ]
                )
              }}
              disabled={loading}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <View style={styles.languageDetails}>
                  <View style={styles.betaHeader}>
                    <Text style={[
                      styles.languageName,
                      selectedLanguage === language.code && styles.languageNameSelected,
                    ]}>
                      {language.name}
                    </Text>
                    <View style={styles.betaBadge}>
                      <Text style={styles.betaBadgeText}>BETA</Text>
                    </View>
                  </View>
                  <Text style={styles.languageNativeName}>
                    {language.nativeName}
                  </Text>
                  <Text style={styles.languageRegion}>
                    {language.region}
                  </Text>
                </View>
              </View>
              
              <View style={styles.languageStatus}>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      { 
                        width: `${language.progress}%`,
                        backgroundColor: getPopularityColor(language.popularity)
                      }
                    ]} />
                  </View>
                  <Text style={styles.progressText}>{language.progress}%</Text>
                </View>
                
                {selectedLanguage === language.code && (
                  <Text style={styles.selectedIndicator}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.helpCard}>
            <Text style={styles.helpIcon}>🌐</Text>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Help Us Improve</Text>
              <Text style={styles.helpText}>
                Don't see your language? We're always looking to add more languages. 
                Contact us to request a new language or help with translations.
              </Text>
              <TouchableOpacity style={styles.helpButton}>
                <Text style={styles.helpButtonText}>Request Language</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>💡 Language Tips</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tip}>• App restart may be required for full language change</Text>
              <Text style={styles.tip}>• Number formats follow your device's regional settings</Text>
              <Text style={styles.tip}>• Currency symbols are based on Malaysian Ringgit (RM)</Text>
              <Text style={styles.tip}>• Date formats adapt to your selected language</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              Alert.alert(
                'Reset Language',
                'Reset to device default language?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    onPress: () => saveLanguageSettings('en'),
                  },
                ]
              )
            }}
          >
            <Text style={styles.resetButtonText}>Reset to English</Text>
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
    marginTop: Spacing.xl,
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
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  languageOption: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  languageOptionBeta: {
    opacity: 0.8,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  languageDetails: {
    flex: 1,
  },
  betaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  languageName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  languageNameSelected: {
    color: colors.primary,
  },
  betaBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  betaBadgeText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  languageNativeName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  languageRegion: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  languageStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  selectedIndicator: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  helpCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  helpIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  helpText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
    marginBottom: Spacing.md,
  },
  helpButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  helpButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tip: {
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