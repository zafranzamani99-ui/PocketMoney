import React, { useMemo, useState } from 'react'

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'

import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

type SupportCategory = 'technical' | 'billing' | 'feature' | 'bug' | 'general'

interface SupportOption {
  id: string
  title: string
  description: string
  icon: string
  action: () => void
  available?: boolean
  responseTime?: string
}

export default function ContactSupportScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory>('general')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { colors }: any = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const categories = [
    { id: 'technical' as SupportCategory, label: 'Technical Issue', icon: '⚙️' },
    { id: 'billing' as SupportCategory, label: 'Billing & Premium', icon: '💳' },
    { id: 'feature' as SupportCategory, label: 'Feature Request', icon: '💡' },
    { id: 'bug' as SupportCategory, label: 'Bug Report', icon: '🐛' },
    { id: 'general' as SupportCategory, label: 'General Inquiry', icon: '❓' },
  ]

  const supportOptions: SupportOption[] = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Support',
      description: 'Chat with our Malaysian support team',
      icon: '💬',
      responseTime: 'Usually within 2 hours',
      available: true,
      action: () => {
        Linking.openURL('https://wa.me/60123456789?text=Hello%2C%20I%20need%20help%20with%20PocketMoney')
      }
    },
    {
      id: 'email',
      title: 'Email Support',
      description: 'Send detailed questions via email',
      icon: '📧',
      responseTime: 'Usually within 24 hours',
      available: true,
      action: () => {
        const emailSubject = subject || `PocketMoney Support - ${categories.find(c => c.id === selectedCategory)?.label}`
        const emailBody = message || 'Please describe your issue here...'
        Linking.openURL(`mailto:support@pocketmoney.app?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`)
      }
    },
    {
      id: 'phone',
      title: 'Phone Support',
      description: 'Talk to our support team directly',
      icon: '📞',
      responseTime: 'Mon-Fri, 9AM-6PM (GMT+8)',
      available: true,
      action: () => {
        Alert.alert(
          'Phone Support',
          'Call our Malaysia support line at:\n+60 3-1234-5678\n\nAvailable Mon-Fri, 9AM-6PM (GMT+8)',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call Now', onPress: () => Linking.openURL('tel:+60312345678') }
          ]
        )
      }
    },
    {
      id: 'live_chat',
      title: 'Live Chat',
      description: 'Real-time chat with support agents',
      icon: '💬',
      responseTime: 'Available now',
      available: false,
      action: () => {
        Alert.alert('Coming Soon', 'Live chat feature is launching soon! Use WhatsApp or email for immediate support.')
      }
    },
    {
      id: 'community',
      title: 'Community Forum',
      description: 'Get help from other users',
      icon: '👥',
      responseTime: 'Community responses',
      available: true,
      action: () => {
        Linking.openURL('https://community.pocketmoney.app')
      }
    },
    {
      id: 'video_call',
      title: 'Video Support',
      description: 'Screen sharing for complex issues',
      icon: '🎥',
      responseTime: 'By appointment only',
      available: true,
      action: () => {
        Alert.alert(
          'Video Support',
          'Schedule a video call for complex technical issues. Our team will share screen and guide you through solutions.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Book Appointment', onPress: () => Linking.openURL('https://calendly.com/pocketmoney-support') }
          ]
        )
      }
    }
  ]

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Required Fields', 'Please fill in both subject and message.')
      return
    }

    setLoading(true)
    try {
      // Simulate ticket submission
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      Alert.alert(
        'Support Ticket Submitted',
        `Your support ticket has been submitted successfully!\n\nTicket ID: #${Date.now()}\n\nWe'll respond within 24 hours via email.`,
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to submit support ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getUrgentHelp = () => {
    Alert.alert(
      'Urgent Support',
      'For urgent business-critical issues:\n\n• Call: +60 3-1234-5678\n• WhatsApp: +60 12-345-6789\n• Email: urgent@pocketmoney.app',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', onPress: () => Linking.openURL('tel:+60312345678') },
        { text: 'WhatsApp', onPress: () => Linking.openURL('https://wa.me/60123456789?text=URGENT%3A%20') }
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Contact Support</Text>
          <TouchableOpacity onPress={getUrgentHelp} style={styles.urgentButton}>
            <Text style={styles.urgentText}>Urgent</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>We're Here to Help</Text>
          <Text style={styles.headerSubtitle}>
            Get support from our Malaysian team
          </Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Quick Support Options</Text>
          
          {supportOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.supportOption,
                !option.available && styles.supportOptionDisabled
              ]}
              onPress={option.action}
              disabled={!option.available}
            >
              <Text style={styles.supportIcon}>{option.icon}</Text>
              <View style={styles.supportInfo}>
                <View style={styles.supportHeader}>
                  <Text style={styles.supportTitle}>{option.title}</Text>
                  {!option.available && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Soon</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.supportDescription}>{option.description}</Text>
                <Text style={styles.supportResponseTime}>⏱️ {option.responseTime}</Text>
              </View>
              <Text style={styles.supportChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Submit Support Ticket</Text>
          
          <View style={styles.ticketForm}>
            <View style={styles.categorySection}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView horizontal style={styles.categoryFilter} showsHorizontalScrollIndicator={false}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category.id && styles.categoryButtonActive
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === category.id && styles.categoryButtonTextActive
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Subject</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Brief description of your issue"
                placeholderTextColor={colors.textSecondary}
                value={subject}
                onChangeText={setSubject}
                maxLength={100}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Message</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Please describe your issue in detail. Include steps to reproduce if it's a bug."
                placeholderTextColor={colors.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{message.length}/1000</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={submitTicket}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>📊 Support Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Current Response Time:</Text>
              <Text style={styles.statusValue}>{'< 2 hours'}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>System Status:</Text>
              <Text style={[styles.statusValue, { color: colors.success }]}>✅ All Systems Operational</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Support Hours:</Text>
              <Text style={styles.statusValue}>24/7 for Premium users</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Get Faster Support</Text>
              <View style={styles.tipsList}>
                <Text style={styles.tip}>• Include screenshots for visual issues</Text>
                <Text style={styles.tip}>• Mention your device model and OS version</Text>
                <Text style={styles.tip}>• Describe the exact steps to reproduce the problem</Text>
                <Text style={styles.tip}>• Check our FAQ first for common solutions</Text>
                <Text style={styles.tip}>• Premium users get priority support</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyTitle}>🚨 Emergency Support</Text>
            <Text style={styles.emergencyText}>
              For business-critical issues affecting your operations, use our emergency support channels:
            </Text>
            <View style={styles.emergencyActions}>
              <TouchableOpacity 
                style={styles.emergencyButton}
                onPress={() => Linking.openURL('tel:+60312345678')}
              >
                <Text style={styles.emergencyButtonText}>Emergency Hotline</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.emergencyButton, styles.emergencyButtonSecondary]}
                onPress={() => Linking.openURL('https://wa.me/60123456789?text=EMERGENCY%3A%20')}
              >
                <Text style={[styles.emergencyButtonText, styles.emergencyButtonTextSecondary]}>
                  WhatsApp Emergency
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    marginTop: Spacing.lg, // Push title down
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
  urgentButton: {
    backgroundColor: colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  urgentText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
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
  contentContainer: {
    paddingBottom: Spacing.xxl,
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
  supportOption: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  supportOptionDisabled: {
    opacity: 0.6,
  },
  supportIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  supportInfo: {
    flex: 1,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  supportTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    flex: 1,
  },
  comingSoonBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  comingSoonText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  supportDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  supportResponseTime: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  supportChevron: {
    fontSize: Typography.fontSizes.subheading,
    color: colors.textSecondary,
  },
  ticketForm: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categorySection: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  categoryFilter: {
    marginBottom: Spacing.sm,
  },
  categoryButton: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  categoryButtonText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  categoryButtonTextActive: {
    color: colors.textPrimary,
  },
  formField: {
    marginBottom: Spacing.lg,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  statusCard: {
    backgroundColor: colors.success + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  statusTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
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
    marginBottom: Spacing.sm,
  },
  tipsList: {
    gap: Spacing.xs,
  },
  tip: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  emergencyCard: {
    backgroundColor: colors.error + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  emergencyTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.error,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emergencyText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emergencyActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  emergencyButton: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  emergencyButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
  },
  emergencyButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  emergencyButtonTextSecondary: {
    color: colors.error,
  },
})