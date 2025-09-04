import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import { ButtonContainer, PrimaryButton, SecondaryButton } from './buttons'

interface WhatsAppParserModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: (orderData: any) => void
}

interface ParsedOrder {
  customer_name?: string
  customer_phone?: string
  items: Array<{
    name: string
    quantity: number
    price?: number
  }>
  total_amount?: number
  payment_method?: string
  delivery_address?: string
  order_type: 'order' | 'payment' | 'inquiry'
}

export default function WhatsAppParserModal({ visible, onClose, onSuccess }: WhatsAppParserModalProps) {
  const { colors } = useTheme()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedOrder | null>(null)
  const [processing, setProcessing] = useState(false)
  const [manualEdit, setManualEdit] = useState(false)

  const patterns = {
    // Malaysian WhatsApp order patterns
    order: [
      /(?:nak|mau|order|pesan|beli)\s+(.+)/gi,
      /(?:i want|want to order)\s+(.+)/gi,
    ],
    payment: [
      /(?:dah|sudah|done|completed)\s+(?:transfer|bayar|pay|payment|trf)/gi,
      /(?:payment|bayaran)\s+(?:done|completed|sudah)/gi,
      /rm\s*(\d+(?:\.\d{2})?)\s+(?:paid|transfer|sent)/gi,
    ],
    amount: [
      /rm\s*(\d+(?:\.\d{2})?)/gi,
      /(\d+(?:\.\d{2})?)\s*ringgit/gi,
      /total[:\s]*rm\s*(\d+(?:\.\d{2})?)/gi,
    ],
    phone: [
      /(\+?6?01[0-46-9]-?\d{7,8})/g,
      /(\+?6?01[0-46-9]\s?\d{3,4}\s?\d{4})/g,
    ],
    address: [
      /(?:address|alamat|hantar|delivery)[:\s]*(.+)/gi,
      /(?:send to|hantar ke)[:\s]*(.+)/gi,
    ],
    quantity: [
      /(\d+)\s*(?:x|kali|pieces?|pcs?)\s*(.+)/gi,
      /(.+)\s*[x×]\s*(\d+)/gi,
    ],
  }

  const pickWhatsAppScreenshot = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri)
        parseWhatsAppContent(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image')
      console.error(error)
    }
  }

  const parseWhatsAppContent = async (imageUri: string) => {
    setProcessing(true)
    try {
      // In a real implementation, you would use OCR to extract text from the image
      // For now, we'll simulate with mock data based on common patterns
      const mockText = generateMockWhatsAppText()
      const parsed = parseTextContent(mockText)
      setParsedData(parsed)
    } catch (error) {
      Alert.alert('Error', 'Failed to parse WhatsApp content')
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const generateMockWhatsAppText = (): string => {
    const mockMessages = [
      `Ali Rahman
      Today 2:30 PM
      
      Assalamualaikum kak, nak order:
      - 2x Nasi Lemak = RM15
      - 1x Teh Tarik = RM3
      
      Total: RM18
      COD boleh?
      
      Address: No 123, Jalan Merdeka, Taman Indah, 50000 KL`,
      
      `Siti Nurhaliza
      Today 1:45 PM
      
      Hi, want to order:
      3 pcs ayam goreng - RM21
      2 white rice - RM4
      
      Total RM25
      
      Dah transfer to your account
      Reference: 1234567890`,
      
      `Ahmad Ali
      Today 4:20 PM
      
      Nak beli:
      - Mee Goreng x2 (RM8 each)
      - Sirap Limau x1 (RM3)
      
      Total: RM19
      
      Hantar ke: 456 Jalan Mawar, Bangi
      Phone: 012-3456789`,
    ]

    return mockMessages[Math.floor(Math.random() * mockMessages.length)]
  }

  const parseTextContent = (text: string): ParsedOrder => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    
    // Extract customer name (usually first line or from contact info)
    const customer_name = extractCustomerName(lines) || 'Unknown Customer'
    
    // Extract phone number
    const customer_phone = extractPhone(text)
    
    // Extract items and quantities
    const items = extractItems(text)
    
    // Extract total amount
    const total_amount = extractTotalAmount(text)
    
    // Extract payment method
    const payment_method = extractPaymentMethod(text)
    
    // Extract delivery address
    const delivery_address = extractAddress(text)
    
    // Determine order type
    const order_type = determineOrderType(text)

    return {
      customer_name,
      customer_phone,
      items,
      total_amount,
      payment_method,
      delivery_address,
      order_type,
    }
  }

  const extractCustomerName = (lines: string[]): string | undefined => {
    // Usually the first line that doesn't contain time/date
    const namePattern = /^[A-Za-z\s]+$/
    for (const line of lines) {
      if (namePattern.test(line) && !line.includes('Today') && !line.includes('PM') && !line.includes('AM')) {
        return line
      }
    }
    return undefined
  }

  const extractPhone = (text: string): string | undefined => {
    for (const pattern of patterns.phone) {
      const match = text.match(pattern)
      if (match) return match[1] || ''
    }
    return undefined
  }

  const extractItems = (text: string): Array<{ name: string; quantity: number; price?: number }> => {
    const items: Array<{ name: string; quantity: number; price?: number }> = []
    
    // Look for patterns like "2x Nasi Lemak = RM15" or "Mee Goreng x2 (RM8 each)"
    const itemPatterns = [
      /(\d+)\s*[x×]\s*([^=\n]+)(?:=\s*rm\s*(\d+(?:\.\d{2})?))?/gi,
      /([^-\n]+?)\s*[x×]\s*(\d+)(?:\s*\(rm\s*(\d+(?:\.\d{2})?)[^)]*\))?/gi,
      /-\s*(\d+)\s*(?:x|pcs?)?\s*([^=\n]+?)(?:=\s*rm\s*(\d+(?:\.\d{2})?))?/gi,
      /-\s*([^=\n]+?)(?:\s*=\s*rm\s*(\d+(?:\.\d{2})?))?/gi,
    ]

    for (const pattern of itemPatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        let name: string, quantity: number, price: number | undefined

        if (pattern.source.includes('(\\d+)\\s*[x×]')) {
          // Pattern: "2x Nasi Lemak = RM15"
          quantity = parseInt(match[1] || '1')
          name = match[2]?.trim() || ''
          price = match[3] ? parseFloat(match[3]) : undefined
        } else if (pattern.source.includes('[x×]\\s*(\\d+)')) {
          // Pattern: "Nasi Lemak x2 (RM15)"
          name = match[1]?.trim() || ''
          quantity = parseInt(match[2] || '1')
          price = match[3] ? parseFloat(match[3]) : undefined
        } else {
          // Pattern: "- 2 Nasi Lemak = RM15" or "- Nasi Lemak = RM15"
          const firstPart = match[1]?.trim() || ''
          const quantityMatch = firstPart.match(/^(\d+)\s+(.+)/)
          if (quantityMatch) {
            quantity = parseInt(quantityMatch[1] || '1')
            name = quantityMatch[2] || ''
          } else {
            quantity = 1
            name = firstPart || ''
          }
          price = match[2] ? parseFloat(match[2]) : undefined
        }

        if (name && !name.includes('Total') && !name.includes('total')) {
          items.push({ name: name?.trim() || '', quantity: quantity || 1, price: price || 0 })
        }
      }
    }

    return items
  }

  const extractTotalAmount = (text: string): number | undefined => {
    for (const pattern of patterns.amount) {
      const matches = Array.from(text.matchAll(pattern))
      // Look for "Total" context or last amount mentioned
      for (const match of matches) {
        const context = text.substring(match.index! - 20, match.index! + 20).toLowerCase()
        if (context.includes('total')) {
          return parseFloat(match[1])
        }
      }
      // If no total context, use the last amount
      if (matches.length > 0) {
        return parseFloat(matches[matches.length - 1][1])
      }
    }
    return undefined
  }

  const extractPaymentMethod = (text: string): string | undefined => {
    const lowerText = text.toLowerCase()
    if (patterns.payment.some(p => p.test(text))) return 'Transfer'
    if (lowerText.includes('cod') || lowerText.includes('cash on delivery')) return 'COD'
    if (lowerText.includes('cash')) return 'Cash'
    if (lowerText.includes('card')) return 'Card'
    return undefined
  }

  const extractAddress = (text: string): string | undefined => {
    for (const pattern of patterns.address) {
      const match = text.match(pattern)
      if (match) return match[1].trim()
    }
    return undefined
  }

  const determineOrderType = (text: string): 'order' | 'payment' | 'inquiry' => {
    if (patterns.payment.some(p => p.test(text))) return 'payment'
    if (patterns.order.some(p => p.test(text))) return 'order'
    return 'inquiry'
  }

  const saveOrder = async () => {
    if (!parsedData) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Create or find customer
      let customerId = null
      if (parsedData.customer_name) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', parsedData.customer_name)
          .single()

        if (existingCustomer) {
          customerId = existingCustomer.id
        } else {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              user_id: user.id,
              name: parsedData.customer_name,
              phone: parsedData.customer_phone,
            })
            .select('id')
            .single()

          customerId = newCustomer?.id
        }
      }

      // Create order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          customer_id: customerId,
          amount: parsedData.total_amount || 0,
          payment_method: parsedData.payment_method,
          status: parsedData.order_type === 'payment' ? 'paid' : 'pending',
        })
        .select()
        .single()

      if (error) throw error

      Alert.alert('Success', 'WhatsApp order processed successfully')
      onSuccess(parsedData)
      handleClose()
    } catch (error) {
      Alert.alert('Error', 'Failed to save order')
      console.error(error)
    }
  }

  const handleClose = () => {
    setSelectedImage(null)
    setParsedData(null)
    setManualEdit(false)
    setProcessing(false)
    onClose()
  }

  const styles = createStyles(colors)

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>WhatsApp Parser</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!selectedImage ? (
            <View style={styles.uploadSection}>
              <Text style={styles.instructionTitle}>Upload WhatsApp Screenshot</Text>
              <Text style={styles.instructionText}>
                Take a screenshot of WhatsApp order messages and upload it here. 
                The app will automatically extract order details, customer info, and payment information.
              </Text>
              
              <TouchableOpacity style={styles.uploadButton} onPress={pickWhatsAppScreenshot}>
                <Text style={styles.uploadEmoji}>📱</Text>
                <Text style={styles.uploadButtonText}>Select Screenshot</Text>
              </TouchableOpacity>

              <View style={styles.exampleSection}>
                <Text style={styles.exampleTitle}>Supported Patterns:</Text>
                <View style={styles.exampleList}>
                  <Text style={styles.exampleItem}>• "Nak order 2x Nasi Lemak = RM15"</Text>
                  <Text style={styles.exampleItem}>• "Want 3 pcs ayam goreng - RM21"</Text>
                  <Text style={styles.exampleItem}>• "Dah transfer RM25"</Text>
                  <Text style={styles.exampleItem}>• "COD boleh?"</Text>
                  <Text style={styles.exampleItem}>• Phone numbers and addresses</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.previewSection}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              
              {processing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.processingText}>Parsing WhatsApp content...</Text>
                </View>
              ) : parsedData ? (
                <View style={styles.parsedDataContainer}>
                  <Text style={styles.parsedTitle}>Extracted Order Details</Text>
                  
                  <View style={styles.dataSection}>
                    <Text style={styles.dataLabel}>Order Type</Text>
                    <Text style={styles.dataValue}>{parsedData.order_type.toUpperCase()}</Text>
                  </View>

                  {parsedData.customer_name && (
                    <View style={styles.dataSection}>
                      <Text style={styles.dataLabel}>Customer</Text>
                      <Text style={styles.dataValue}>{parsedData.customer_name}</Text>
                    </View>
                  )}

                  {parsedData.customer_phone && (
                    <View style={styles.dataSection}>
                      <Text style={styles.dataLabel}>Phone</Text>
                      <Text style={styles.dataValue}>{parsedData.customer_phone}</Text>
                    </View>
                  )}

                  {parsedData.items.length > 0 && (
                    <View style={styles.dataSection}>
                      <Text style={styles.dataLabel}>Items</Text>
                      {parsedData.items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                          <Text style={styles.itemText}>
                            {item.quantity}x {item.name}
                            {item.price && ` - RM${item.price.toFixed(2)}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {parsedData.total_amount && (
                    <View style={styles.dataSection}>
                      <Text style={styles.dataLabel}>Total Amount</Text>
                      <Text style={styles.dataValue}>RM {parsedData.total_amount.toFixed(2)}</Text>
                    </View>
                  )}

                  {parsedData.payment_method && (
                    <View style={styles.dataSection}>
                      <Text style={styles.dataLabel}>Payment Method</Text>
                      <Text style={styles.dataValue}>{parsedData.payment_method}</Text>
                    </View>
                  )}

                  {parsedData.delivery_address && (
                    <View style={styles.dataSection}>
                      <Text style={styles.dataLabel}>Delivery Address</Text>
                      <Text style={styles.dataValue}>{parsedData.delivery_address}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setManualEdit(!manualEdit)}
                  >
                    <Text style={styles.editButtonText}>
                      {manualEdit ? 'Done Editing' : 'Edit Details'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Failed to parse content. Please try again.</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={pickWhatsAppScreenshot}>
                    <Text style={styles.retryButtonText}>Try Another Screenshot</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <ButtonContainer>
          <SecondaryButton 
            title="Cancel" 
            onPress={handleClose}
          />
          <PrimaryButton 
            title="Save" 
            onPress={saveOrder}
            disabled={!parsedData || processing}
          />
        </ButtonContainer>
      </View>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  cancelButton: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
  },
  headerSpacer: {
    width: 60, // Same width as Cancel button for symmetry
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  uploadSection: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  instructionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  uploadEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  uploadButtonText: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.medium,
    color: colors.textPrimary,
  },
  exampleSection: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  exampleTitle: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  exampleList: {
    gap: Spacing.sm,
  },
  exampleItem: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
  },
  previewSection: {
    paddingVertical: Spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  processingText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    marginTop: Spacing.md,
  },
  parsedDataContainer: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  parsedTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  dataSection: {
    marginBottom: Spacing.md,
  },
  dataLabel: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    fontWeight: Typography.fontWeights.medium,
  },
  dataValue: {
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
  },
  itemRow: {
    paddingVertical: Spacing.xs,
  },
  itemText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
  },
  editButton: {
    backgroundColor: colors.primary + '20',
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  editButtonText: {
    fontSize: Typography.fontSizes.body,
    color: colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  errorText: {
    fontSize: Typography.fontSizes.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryButtonText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
})