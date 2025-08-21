import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

type DocumentType = 'terms' | 'privacy' | 'cookies' | 'acceptable_use'

interface Document {
  id: DocumentType
  title: string
  description: string
  icon: string
  lastUpdated: string
  version: string
}

export default function TermsPrivacyScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>('terms')

  const documents: Document[] = [
    {
      id: 'terms',
      title: 'Terms of Service',
      description: 'Our terms and conditions for using PocketMoney',
      icon: '📄',
      lastUpdated: 'December 15, 2024',
      version: '2.1'
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      description: 'How we collect, use, and protect your data',
      icon: '🔒',
      lastUpdated: 'December 10, 2024',
      version: '2.0'
    },
    {
      id: 'cookies',
      title: 'Cookie Policy',
      description: 'Information about cookies and tracking technologies',
      icon: '🍪',
      lastUpdated: 'November 20, 2024',
      version: '1.2'
    },
    {
      id: 'acceptable_use',
      title: 'Acceptable Use Policy',
      description: 'Guidelines for proper use of our platform',
      icon: '✅',
      lastUpdated: 'October 30, 2024',
      version: '1.1'
    }
  ]

  const documentContent = {
    terms: {
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: 'By downloading, installing, or using PocketMoney ("the App"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our service.'
        },
        {
          title: '2. Description of Service',
          content: 'PocketMoney is a mobile application designed to help Malaysian small businesses track expenses, manage transactions, and organize financial data. The service includes receipt scanning, WhatsApp integration, reporting features, and data synchronization capabilities.'
        },
        {
          title: '3. User Account and Responsibilities',
          content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update such information as necessary.'
        },
        {
          title: '4. Subscription and Billing',
          content: 'Premium features require a paid subscription. Subscriptions are billed monthly or annually as selected. All fees are non-refundable except as required by applicable law. We reserve the right to modify subscription fees with 30 days notice.'
        },
        {
          title: '5. Data and Privacy',
          content: 'We take your privacy seriously. Please review our Privacy Policy to understand how we collect, use, and protect your personal and business data. By using our service, you consent to the collection and use of information as outlined in our Privacy Policy.'
        },
        {
          title: '6. Intellectual Property',
          content: 'PocketMoney and its original content, features, and functionality are and will remain the exclusive property of PocketMoney and its licensors. The service is protected by copyright, trademark, and other laws.'
        },
        {
          title: '7. Prohibited Uses',
          content: 'You may not use our service for any illegal purposes or to solicit others to perform unlawful acts. You may not violate any local laws in your jurisdiction and you are solely responsible for compliance with applicable laws.'
        },
        {
          title: '8. Termination',
          content: 'We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.'
        },
        {
          title: '9. Malaysian Law',
          content: 'These terms are governed by and construed in accordance with the laws of Malaysia. Any disputes arising from these terms will be subject to the exclusive jurisdiction of Malaysian courts.'
        },
        {
          title: '10. Contact Information',
          content: 'If you have any questions about these Terms of Service, please contact us at legal@pocketmoney.app or write to us at our registered office in Kuala Lumpur, Malaysia.'
        }
      ]
    },
    privacy: {
      sections: [
        {
          title: '1. Information We Collect',
          content: 'We collect information you provide directly (account details, business information), automatically (device data, usage analytics), and from third parties (social media logins). This includes personal data necessary for providing our financial tracking services.'
        },
        {
          title: '2. How We Use Your Information',
          content: 'We use your information to provide and improve our services, process transactions, send important updates, provide customer support, and ensure platform security. We do not sell your personal data to third parties.'
        },
        {
          title: '3. Data Storage and Security',
          content: 'Your data is stored securely on servers located in Malaysia and Singapore. We implement industry-standard security measures including encryption, secure data centers, and regular security audits to protect your information.'
        },
        {
          title: '4. Data Sharing and Disclosure',
          content: 'We do not share your personal data except with your consent, to comply with legal obligations, protect our rights, or with trusted service providers who assist in operating our platform under strict confidentiality agreements.'
        },
        {
          title: '5. Your Rights and Choices',
          content: 'You have the right to access, update, or delete your personal data. You can export your data, opt out of marketing communications, and control privacy settings within the app. Contact us to exercise these rights.'
        },
        {
          title: '6. Cookies and Tracking',
          content: 'We use cookies and similar technologies to enhance your experience, remember preferences, and analyze app usage. You can control cookie preferences through your device settings.'
        },
        {
          title: '7. Data Retention',
          content: 'We retain your data for as long as your account is active or as needed to provide services. Upon account deletion, we will delete or anonymize your personal data within 30 days, except as required by law.'
        },
        {
          title: '8. International Transfers',
          content: 'Your data may be transferred to and processed in countries other than Malaysia. When we do so, we ensure appropriate safeguards are in place to protect your privacy rights.'
        },
        {
          title: '9. Changes to Privacy Policy',
          content: 'We may update this privacy policy from time to time. We will notify you of any material changes through the app or email. Your continued use of our service constitutes acceptance of the updated policy.'
        },
        {
          title: '10. Contact Us',
          content: 'For privacy-related questions or to exercise your rights, contact our Data Protection Officer at privacy@pocketmoney.app or use our in-app privacy controls.'
        }
      ]
    },
    cookies: {
      sections: [
        {
          title: '1. What Are Cookies',
          content: 'Cookies are small text files stored on your device when you use our app or website. They help us remember your preferences, improve your experience, and analyze how you use our service.'
        },
        {
          title: '2. Types of Cookies We Use',
          content: 'Essential cookies (required for app functionality), Analytics cookies (to understand usage patterns), Preference cookies (to remember your settings), and Security cookies (to protect against fraud and secure your account).'
        },
        {
          title: '3. Third-Party Cookies',
          content: 'We may use third-party services like Google Analytics, Firebase, and social media platforms that may place their own cookies. These services have their own privacy policies governing cookie usage.'
        },
        {
          title: '4. Cookie Management',
          content: 'You can control cookies through your device settings or browser preferences. Note that disabling certain cookies may limit app functionality. Essential cookies cannot be disabled as they are necessary for basic operation.'
        },
        {
          title: '5. Cookie Duration',
          content: 'Session cookies are deleted when you close the app. Persistent cookies remain on your device for a specified period or until manually deleted. We regularly review and minimize cookie retention periods.'
        }
      ]
    },
    acceptable_use: {
      sections: [
        {
          title: '1. Acceptable Use',
          content: 'PocketMoney is designed for legitimate business expense tracking and financial management. Use our service responsibly and in compliance with all applicable laws and regulations.'
        },
        {
          title: '2. Prohibited Activities',
          content: 'You may not use our service for illegal activities, money laundering, tax evasion, fraud, harassment of other users, uploading malicious content, or attempting to breach our security measures.'
        },
        {
          title: '3. Content Standards',
          content: 'Any content you upload (receipts, notes, etc.) must be legitimate and not contain illegal, offensive, or copyrighted material. We reserve the right to remove content that violates these standards.'
        },
        {
          title: '4. System Integrity',
          content: 'Do not attempt to hack, reverse engineer, or disrupt our services. Do not use automated tools to access our service without permission. Report security vulnerabilities responsibly.'
        },
        {
          title: '5. Enforcement',
          content: 'Violation of this policy may result in account suspension or termination, removal of content, and potential legal action. We investigate reported violations and take appropriate action.'
        }
      ]
    }
  }

  const currentDoc = documents.find(doc => doc.id === selectedDocument)!
  const currentContent = documentContent[selectedDocument]

  const openExternalDocument = (docType: DocumentType) => {
    const urls = {
      terms: 'https://pocketmoney.app/terms',
      privacy: 'https://pocketmoney.app/privacy',
      cookies: 'https://pocketmoney.app/cookies',
      acceptable_use: 'https://pocketmoney.app/acceptable-use'
    }
    
    Linking.openURL(urls[docType])
  }

  const downloadDocument = (docType: DocumentType) => {
    Alert.alert(
      'Download Document',
      `Download ${currentDoc.title} as PDF?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Download', 
          onPress: () => {
            // In a real app, this would trigger a PDF download
            Alert.alert('Download Started', 'The document will be saved to your downloads folder.')
          }
        }
      ]
    )
  }

  const printDocument = () => {
    Alert.alert(
      'Print Document',
      'This will open the print dialog for the current document.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Print', onPress: () => Alert.alert('Print', 'Print functionality would be implemented here.') }
      ]
    )
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
          <Text style={styles.title}>Legal Documents</Text>
          <TouchableOpacity onPress={printDocument} style={styles.actionButton}>
            <Text style={styles.actionText}>Print</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Terms & Privacy</Text>
          <Text style={styles.headerSubtitle}>
            Important legal information and policies
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <ScrollView horizontal style={styles.documentTabs} showsHorizontalScrollIndicator={false}>
          {documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={[
                styles.documentTab,
                selectedDocument === doc.id && styles.documentTabActive
              ]}
              onPress={() => setSelectedDocument(doc.id)}
            >
              <Text style={styles.documentTabIcon}>{doc.icon}</Text>
              <Text style={[
                styles.documentTabText,
                selectedDocument === doc.id && styles.documentTabTextActive
              ]}>
                {doc.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView 
          style={styles.documentContent} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.documentHeader}>
            <View style={styles.documentInfo}>
              <Text style={styles.documentTitle}>{currentDoc.title}</Text>
              <Text style={styles.documentDescription}>{currentDoc.description}</Text>
              <View style={styles.documentMeta}>
                <Text style={styles.documentVersion}>Version {currentDoc.version}</Text>
                <Text style={styles.documentUpdated}>Last updated: {currentDoc.lastUpdated}</Text>
              </View>
            </View>
            
            <View style={styles.documentActions}>
              <TouchableOpacity 
                style={styles.documentAction}
                onPress={() => openExternalDocument(selectedDocument)}
              >
                <Text style={styles.documentActionIcon}>🌐</Text>
                <Text style={styles.documentActionText}>Open Online</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.documentAction}
                onPress={() => downloadDocument(selectedDocument)}
              >
                <Text style={styles.documentActionIcon}>📁</Text>
                <Text style={styles.documentActionText}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.documentBody}>
            {currentContent.sections.map((section, index) => (
              <View key={index} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionContent}>{section.content}</Text>
              </View>
            ))}
          </View>

          <View style={styles.documentFooter}>
            <View style={styles.contactCard}>
              <Text style={styles.contactTitle}>Questions About Our Policies?</Text>
              <Text style={styles.contactText}>
                If you have questions about these documents or need clarification on any terms, please contact our legal team.
              </Text>
              <View style={styles.contactActions}>
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={() => Linking.openURL('mailto:legal@pocketmoney.app')}
                >
                  <Text style={styles.contactButtonText}>Email Legal Team</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.contactButton, styles.contactButtonSecondary]}
                  onPress={() => navigation.navigate('ContactSupport' as never)}
                >
                  <Text style={[styles.contactButtonText, styles.contactButtonTextSecondary]}>
                    Contact Support
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.legalNotice}>
            <Text style={styles.legalNoticeTitle}>⚖️ Legal Notice</Text>
            <Text style={styles.legalNoticeText}>
              These documents are governed by Malaysian law. By using PocketMoney, you agree to these terms and our commitment to protecting your privacy and data. We may update these documents from time to time, and we'll notify you of significant changes.
            </Text>
            <Text style={styles.legalNoticeFooter}>
              PocketMoney Sdn Bhd • Registered in Malaysia • Company No: 123456789
            </Text>
          </View>
        </ScrollView>
      </View>
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
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  actionText: {
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
  documentTabs: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  documentTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  documentTabActive: {
    borderBottomColor: Colors.primary,
  },
  documentTabIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  documentTabText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  documentTabTextActive: {
    color: Colors.primary,
  },
  documentContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  contentContainer: {
    paddingBottom: Spacing.xxl,
  },
  documentHeader: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  documentInfo: {
    marginBottom: Spacing.lg,
  },
  documentTitle: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  documentDescription: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  documentMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  documentVersion: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
  },
  documentUpdated: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  documentActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  documentAction: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  documentActionIcon: {
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  documentActionText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  documentBody: {
    paddingVertical: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  sectionContent: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  documentFooter: {
    paddingVertical: Spacing.lg,
  },
  contactCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  contactTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  contactText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
    marginBottom: Spacing.lg,
  },
  contactActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  contactButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  contactButtonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  contactButtonTextSecondary: {
    color: Colors.textSecondary,
  },
  legalNotice: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legalNoticeTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  legalNoticeText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  legalNoticeFooter: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
})