import React, { useState } from 'react'
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
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface Feature {
  name: string
  free: boolean | string
  premium: boolean | string
  icon: string
}

export default function PremiumUpgradeScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { colors } = useTheme()
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  const features: Feature[] = [
    {
      name: 'Receipt Scanning',
      free: '30/month',
      premium: 'Unlimited',
      icon: '📷'
    },
    {
      name: 'Wallets',
      free: '1 wallet',
      premium: 'Unlimited',
      icon: '💰'
    },
    {
      name: 'WhatsApp Order Extraction',
      free: false,
      premium: true,
      icon: '💬'
    },
    {
      name: 'Voice Input',
      free: false,
      premium: true,
      icon: '🎤'
    },
    {
      name: 'Google Sheets Sync',
      free: false,
      premium: true,
      icon: '📊'
    },
    {
      name: 'Advanced Analytics',
      free: false,
      premium: true,
      icon: '📈'
    },
    {
      name: 'Customer Management',
      free: '50 customers',
      premium: 'Unlimited',
      icon: '👥'
    },
    {
      name: 'Data Export',
      free: false,
      premium: true,
      icon: '📤'
    },
    {
      name: 'Automated Backups',
      free: false,
      premium: true,
      icon: '☁️'
    },
    {
      name: 'Priority Support',
      free: false,
      premium: true,
      icon: '🎧'
    },
    {
      name: 'Multi-Business Support',
      free: false,
      premium: true,
      icon: '🏢'
    },
    {
      name: 'Invoice Generation',
      free: false,
      premium: true,
      icon: '📋'
    }
  ]

  const plans = {
    monthly: {
      price: 9.90,
      period: 'month',
      discount: null,
    },
    yearly: {
      price: 99.90,
      period: 'year',
      discount: '17% OFF',
      monthlyEquivalent: 8.33,
    }
  }

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      // In a real app, this would integrate with payment systems like Stripe, PayPal, or local Malaysian payment gateways
      Alert.alert(
        'Upgrade to Premium',
        `You've selected the ${selectedPlan} plan for RM ${plans[selectedPlan].price}.\n\nThis would normally redirect to payment processing.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              Alert.alert(
                'Success!',
                'Thank you for upgrading! Premium features are now unlocked.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              )
            }
          }
        ]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to process upgrade')
    } finally {
      setLoading(false)
    }
  }

  const restorePurchases = () => {
    Alert.alert(
      'Restore Purchases',
      'Looking for previous purchases...',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => Alert.alert('Info', 'No previous purchases found.')
        }
      ]
    )
  }

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? '✅' : '❌'
    }
    return value
  }

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Upgrade to Premium</Text>
          <TouchableOpacity onPress={restorePurchases} style={styles.restoreButton}>
            <Text style={styles.restoreText}>Restore</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Unlock All Features</Text>
          <Text style={styles.heroSubtitle}>
            Take your business to the next level with premium tools
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.planSelector}>
          <TouchableOpacity
            style={[
              styles.planOption,
              selectedPlan === 'monthly' && styles.planOptionActive
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={[
              styles.planTitle,
              selectedPlan === 'monthly' && styles.planTitleActive
            ]}>
              Monthly
            </Text>
            <Text style={[
              styles.planPrice,
              selectedPlan === 'monthly' && styles.planPriceActive
            ]}>
              RM {plans.monthly.price}
            </Text>
            <Text style={[
              styles.planPeriod,
              selectedPlan === 'monthly' && styles.planPeriodActive
            ]}>
              per month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planOption,
              selectedPlan === 'yearly' && styles.planOptionActive
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            {plans.yearly.discount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{plans.yearly.discount}</Text>
              </View>
            )}
            <Text style={[
              styles.planTitle,
              selectedPlan === 'yearly' && styles.planTitleActive
            ]}>
              Yearly
            </Text>
            <Text style={[
              styles.planPrice,
              selectedPlan === 'yearly' && styles.planPriceActive
            ]}>
              RM {plans.yearly.price}
            </Text>
            <Text style={[
              styles.planPeriod,
              selectedPlan === 'yearly' && styles.planPeriodActive
            ]}>
              RM {plans.yearly.monthlyEquivalent}/month
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Feature Comparison</Text>
          
          <View style={styles.featuresTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.featureColumn]}>Feature</Text>
              <Text style={[styles.tableHeaderText, styles.planColumn]}>Free</Text>
              <Text style={[styles.tableHeaderText, styles.planColumn]}>Premium</Text>
            </View>

            {features.map((feature, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <Text style={styles.featureName}>{feature.name}</Text>
                </View>
                <View style={styles.planColumn}>
                  <Text style={[
                    styles.featureValue,
                    typeof feature.free === 'boolean' && !feature.free && styles.featureValueDisabled
                  ]}>
                    {renderFeatureValue(feature.free)}
                  </Text>
                </View>
                <View style={styles.planColumn}>
                  <Text style={[
                    styles.featureValue,
                    styles.featureValuePremium
                  ]}>
                    {renderFeatureValue(feature.premium)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Why Upgrade?</Text>
          
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>🚀</Text>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Scale Your Business</Text>
              <Text style={styles.benefitDescription}>
                Unlimited receipt scanning, wallets, and customer management
              </Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>⚡</Text>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Save Time</Text>
              <Text style={styles.benefitDescription}>
                WhatsApp order extraction and voice input for faster data entry
              </Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>📊</Text>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Better Insights</Text>
              <Text style={styles.benefitDescription}>
                Advanced analytics and automatic Google Sheets sync
              </Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>🛡️</Text>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Peace of Mind</Text>
              <Text style={styles.benefitDescription}>
                Automated backups and priority support when you need help
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.testimonialsSection}>
          <Text style={styles.sectionTitle}>What Our Users Say</Text>
          
          <View style={styles.testimonial}>
            <Text style={styles.testimonialText}>
              "PocketMoney Premium transformed how I manage my kedai runcit. The WhatsApp integration saves me hours every week!"
            </Text>
            <Text style={styles.testimonialAuthor}>- Siti, Grocery Store Owner</Text>
          </View>

          <View style={styles.testimonial}>
            <Text style={styles.testimonialText}>
              "The Google Sheets sync makes my accounting so much easier. My accountant loves it too!"
            </Text>
            <Text style={styles.testimonialAuthor}>- Ahmad, Restaurant Owner</Text>
          </View>
        </View>

        <View style={styles.guaranteeSection}>
          <Text style={styles.guaranteeTitle}>30-Day Money Back Guarantee</Text>
          <Text style={styles.guaranteeText}>
            Not satisfied? Get a full refund within 30 days, no questions asked.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgrade}
          disabled={loading}
        >
          <LinearGradient
            colors={[colors.accent, colors.primary]}
            style={styles.upgradeButtonGradient}
          >
            <Text style={styles.upgradeButtonText}>
              {loading ? 'Processing...' : `Upgrade for RM ${plans[selectedPlan].price}`}
            </Text>
            <Text style={styles.upgradeButtonSubtext}>
              {selectedPlan === 'yearly' ? 'Billed annually' : 'Billed monthly'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.footerNote}>
          Cancel anytime. No hidden fees.
        </Text>
      </View>
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
    marginTop: Spacing.md,
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
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  restoreButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  restoreText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  heroTitle: {
    fontSize: Typography.fontSizes.display,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  planSelector: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  planOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  planOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  discountBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  planTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  planTitleActive: {
    color: colors.primary,
  },
  planPrice: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  planPriceActive: {
    color: colors.primary,
  },
  planPeriod: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  planPeriodActive: {
    color: colors.primary,
  },
  featuresSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  featuresTable: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    padding: Spacing.md,
  },
  tableHeaderText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  tableRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  featureColumn: {
    flex: 2,
  },
  planColumn: {
    flex: 1,
    alignItems: 'center',
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  featureIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  featureName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  featureValue: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  featureValueDisabled: {
    color: colors.textSecondary,
  },
  featureValuePremium: {
    color: colors.success,
  },
  benefitsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
    marginTop: Spacing.xs,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  benefitDescription: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  testimonialsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  testimonial: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  testimonialText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: Typography.lineHeights.body,
    marginBottom: Spacing.md,
  },
  testimonialAuthor: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.primary,
    textAlign: 'right',
  },
  guaranteeSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  guaranteeTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.success,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  guaranteeText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.body,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  upgradeButton: {
    marginBottom: Spacing.md,
  },
  upgradeButtonGradient: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  upgradeButtonSubtext: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    opacity: 0.8,
  },
  footerNote: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
})