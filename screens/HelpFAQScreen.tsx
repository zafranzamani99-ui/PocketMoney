import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface FAQItem {
  id: string
  category: string
  question: string
  answer: string
  tags: string[]
  popular: boolean
}

export default function HelpFAQScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const faqItems: FAQItem[] = [
    {
      id: '1',
      category: 'Getting Started',
      question: 'How do I set up my business profile?',
      answer: 'Go to Profile > Business Profile to enter your business information. Fill in your business name, type, contact details, and legal information. This helps personalize your experience and is useful for generating reports.',
      tags: ['setup', 'profile', 'business'],
      popular: true,
    },
    {
      id: '2',
      category: 'Getting Started',
      question: 'How do I add my first wallet?',
      answer: 'Go to Profile > Primary Wallet or use the quick action "Wallets" on the dashboard. Tap the + button to add a new wallet. You can add cash, bank accounts, e-wallets, or credit cards. Your first wallet automatically becomes the primary wallet.',
      tags: ['wallet', 'setup', 'money'],
      popular: true,
    },
    {
      id: '3',
      category: 'Receipt Scanning',
      question: 'How accurate is the receipt scanning?',
      answer: 'Our AI-powered receipt scanning is highly accurate for Malaysian receipts. It can extract store name, date, total amount, GST/SST, and itemized purchases. If the scan isn\'t perfect, you can always edit the details manually.',
      tags: ['receipt', 'scanning', 'ai', 'accuracy'],
      popular: true,
    },
    {
      id: '4',
      category: 'Receipt Scanning',
      question: 'What if the receipt scan is wrong?',
      answer: 'You can edit any scanned receipt data. Tap on the transaction, then tap "Edit" to modify the amount, category, date, or description. Your corrections help improve the AI for future scans.',
      tags: ['receipt', 'edit', 'correction'],
      popular: false,
    },
    {
      id: '5',
      category: 'WhatsApp Integration',
      question: 'How does WhatsApp order extraction work?',
      answer: 'Take a screenshot of WhatsApp conversations containing orders, then use the "WhatsApp Orders" feature. Our AI recognizes common Malaysian order patterns like "nak order", payment confirmations, and customer details.',
      tags: ['whatsapp', 'orders', 'extraction'],
      popular: true,
    },
    {
      id: '6',
      category: 'WhatsApp Integration',
      question: 'Which languages work with WhatsApp extraction?',
      answer: 'Currently supports English and Bahasa Malaysia. Common phrases like "nak order", "dah transfer", "COD", and bank transfer confirmations are recognized. Chinese language support is coming soon.',
      tags: ['whatsapp', 'language', 'support'],
      popular: false,
    },
    {
      id: '7',
      category: 'Premium Features',
      question: 'What do I get with Premium?',
      answer: 'Premium unlocks unlimited receipt scanning, unlimited wallets, WhatsApp order extraction, voice input, Google Sheets sync, advanced analytics, customer management, data export, automated backups, and priority support.',
      tags: ['premium', 'features', 'upgrade'],
      popular: true,
    },
    {
      id: '8',
      category: 'Premium Features',
      question: 'How does Google Sheets sync work?',
      answer: 'Premium users can automatically sync transactions to Google Sheets. We create monthly sheets with all your transaction data, making it easy to share with accountants or analyze in spreadsheet software.',
      tags: ['google sheets', 'sync', 'premium'],
      popular: true,
    },
    {
      id: '9',
      category: 'Data & Privacy',
      question: 'Is my financial data secure?',
      answer: 'Yes! We use bank-level encryption, store data securely on Malaysian servers, and never share your financial information. You can enable biometric authentication for extra security.',
      tags: ['security', 'privacy', 'encryption'],
      popular: true,
    },
    {
      id: '10',
      category: 'Data & Privacy',
      question: 'Can I export my data?',
      answer: 'Yes, go to Profile > Privacy & Security > Export My Data. This creates a complete backup of all your transactions, customers, and business data in CSV format.',
      tags: ['export', 'data', 'backup'],
      popular: false,
    },
    {
      id: '11',
      category: 'Troubleshooting',
      question: 'The app is running slowly, what should I do?',
      answer: 'Try closing and reopening the app, ensure you have the latest version, clear some storage space on your device, and restart your phone if needed. Contact support if problems persist.',
      tags: ['performance', 'slow', 'troubleshooting'],
      popular: false,
    },
    {
      id: '12',
      category: 'Troubleshooting',
      question: 'I can\'t sign in to my account',
      answer: 'Check your internet connection, ensure you\'re using the correct email/password, try resetting your password, or use biometric login if enabled. Contact support if you\'re still having issues.',
      tags: ['login', 'signin', 'password', 'troubleshooting'],
      popular: false,
    },
    {
      id: '13',
      category: 'Business Features',
      question: 'How do I manage customers?',
      answer: 'Go to the Customers tab to add, edit, and track your customers. You can store names, phone numbers, track total spending, and see order history. WhatsApp integration automatically creates customer profiles.',
      tags: ['customers', 'management', 'crm'],
      popular: false,
    },
    {
      id: '14',
      category: 'Business Features',
      question: 'Can I track different business locations?',
      answer: 'Currently, PocketMoney is designed for single-location businesses. Multi-location support is planned for future releases. Contact us if this is important for your business.',
      tags: ['locations', 'multiple', 'business'],
      popular: false,
    },
  ]

  const categories = ['All', ...Array.from(new Set(faqItems.map(item => item.category)))]

  const filteredItems = faqItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === null || 
      selectedCategory === 'All' || 
      item.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const popularItems = faqItems.filter(item => item.popular)

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const openVideoTutorial = () => {
    Linking.openURL('https://youtube.com/watch?v=example')
  }

  const openUserGuide = () => {
    Linking.openURL('https://pocketmoney.help/user-guide')
  }

  const contactSupport = () => {
    navigation.navigate('ContactSupport')
  }

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
          <Text style={styles.title}>Help & FAQ</Text>
          <TouchableOpacity onPress={contactSupport} style={styles.supportButton}>
            <Text style={styles.supportText}>Support</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>How can we help you?</Text>
          <Text style={styles.headerSubtitle}>
            Find answers to common questions
          </Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={openVideoTutorial}>
            <Text style={styles.quickActionIcon}>🎥</Text>
            <Text style={styles.quickActionTitle}>Video Tutorials</Text>
            <Text style={styles.quickActionDescription}>Step-by-step guides</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction} onPress={openUserGuide}>
            <Text style={styles.quickActionIcon}>📖</Text>
            <Text style={styles.quickActionTitle}>User Guide</Text>
            <Text style={styles.quickActionDescription}>Complete documentation</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction} onPress={contactSupport}>
            <Text style={styles.quickActionIcon}>💬</Text>
            <Text style={styles.quickActionTitle}>Live Chat</Text>
            <Text style={styles.quickActionDescription}>Get instant help</Text>
          </TouchableOpacity>
        </View>

        {searchQuery === '' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Popular Questions</Text>
            {popularItems.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.popularItem}
                onPress={() => toggleExpanded(item.id)}
              >
                <View style={styles.popularHeader}>
                  <Text style={styles.popularQuestion}>{item.question}</Text>
                  <Text style={styles.expandIcon}>
                    {expandedItems.includes(item.id) ? '−' : '+'}
                  </Text>
                </View>
                {expandedItems.includes(item.id) && (
                  <Text style={styles.popularAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          
          <ScrollView horizontal style={styles.categoryFilter} showsHorizontalScrollIndicator={false}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  (selectedCategory === category || (selectedCategory === null && category === 'All')) && 
                  styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category === 'All' ? null : category)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  (selectedCategory === category || (selectedCategory === null && category === 'All')) && 
                  styles.categoryButtonTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.faqList}>
            {filteredItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.faqItem}
                onPress={() => toggleExpanded(item.id)}
              >
                <View style={styles.faqHeader}>
                  <View style={styles.faqTitleContainer}>
                    <Text style={styles.faqCategory}>{item.category}</Text>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    {item.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>Popular</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.expandIcon}>
                    {expandedItems.includes(item.id) ? '−' : '+'}
                  </Text>
                </View>
                
                {expandedItems.includes(item.id) && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{item.answer}</Text>
                    <View style={styles.faqTags}>
                      {item.tags.map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {filteredItems.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsEmoji}>🔍</Text>
                <Text style={styles.noResultsTitle}>No results found</Text>
                <Text style={styles.noResultsText}>
                  Try different keywords or browse by category
                </Text>
                <TouchableOpacity style={styles.contactButton} onPress={contactSupport}>
                  <Text style={styles.contactButtonText}>Contact Support</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.helpfulCard}>
            <Text style={styles.helpfulTitle}>Was this helpful?</Text>
            <Text style={styles.helpfulText}>
              Can't find what you're looking for? Our support team is here to help!
            </Text>
            <View style={styles.helpfulActions}>
              <TouchableOpacity style={styles.helpfulButton} onPress={contactSupport}>
                <Text style={styles.helpfulButtonText}>Contact Support</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.helpfulButton, styles.helpfulButtonSecondary]}
                onPress={() => Linking.openURL('mailto:feedback@pocketmoney.app')}
              >
                <Text style={[styles.helpfulButtonText, styles.helpfulButtonTextSecondary]}>
                  Send Feedback
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.resourcesCard}>
            <Text style={styles.resourcesTitle}>📚 Additional Resources</Text>
            <TouchableOpacity 
              style={styles.resourceItem}
              onPress={() => Linking.openURL('https://pocketmoney.app/blog')}
            >
              <Text style={styles.resourceIcon}>📝</Text>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceName}>Business Tips Blog</Text>
                <Text style={styles.resourceDescription}>
                  Tips for Malaysian small businesses
                </Text>
              </View>
              <Text style={styles.resourceChevron}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.resourceItem}
              onPress={() => Linking.openURL('https://facebook.com/groups/pocketmoney')}
            >
              <Text style={styles.resourceIcon}>👥</Text>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceName}>Community Group</Text>
                <Text style={styles.resourceDescription}>
                  Connect with other business owners
                </Text>
              </View>
              <Text style={styles.resourceChevron}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.resourceItem}
              onPress={() => Linking.openURL('https://pocketmoney.app/updates')}
            >
              <Text style={styles.resourceIcon}>🔔</Text>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceName}>What's New</Text>
                <Text style={styles.resourceDescription}>
                  Latest features and updates
                </Text>
              </View>
              <Text style={styles.resourceChevron}>›</Text>
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
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  supportButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  supportText: {
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
  contentContainer: {
    paddingBottom: Spacing.xxl,
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  quickActionTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  quickActionDescription: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  popularItem: {
    backgroundColor: Colors.accent + '10',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  popularHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  popularQuestion: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.md,
  },
  expandIcon: {
    fontSize: Typography.fontSizes.heading,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  popularAnswer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  categoryFilter: {
    marginBottom: Spacing.lg,
  },
  categoryButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  categoryButtonTextActive: {
    color: Colors.textPrimary,
  },
  faqList: {
    gap: Spacing.md,
  },
  faqItem: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
  },
  faqTitleContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  faqCategory: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  faqQuestion: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  popularBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  popularBadgeText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  faqAnswer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  faqAnswerText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
    marginBottom: Spacing.md,
  },
  faqTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  noResultsEmoji: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  noResultsTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  noResultsText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  contactButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  contactButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  helpfulCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  helpfulTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  helpfulText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  helpfulActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  helpfulButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  helpfulButtonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  helpfulButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  helpfulButtonTextSecondary: {
    color: Colors.textSecondary,
  },
  resourcesCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resourcesTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resourceIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  resourceContent: {
    flex: 1,
  },
  resourceName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  resourceDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  resourceChevron: {
    fontSize: Typography.fontSizes.subheading,
    color: Colors.textSecondary,
  },
})