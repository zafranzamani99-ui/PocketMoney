import { supabase } from '../lib/supabase'
import { Database } from '../types/database'
import { orderService } from './orderService'

type WhatsAppExtraction = Database['public']['Tables']['whatsapp_extractions']['Row']
type WhatsAppExtractionInsert = Database['public']['Tables']['whatsapp_extractions']['Insert']

interface WhatsAppMessage {
  content: string
  timestamp?: string
  sender?: string
  senderPhone?: string
}

interface OrderExtraction {
  customerName?: string
  customerPhone?: string
  orderItems: Array<{
    name: string
    quantity: number
    price?: number
  }>
  totalAmount?: number
  notes?: string
  confidence: number
}

interface PaymentExtraction {
  amount: number
  paymentMethod: string
  referenceNumber?: string
  bankName?: string
  customerInfo?: string
  confidence: number
}

interface DeliveryExtraction {
  address?: string
  deliveryTime?: string
  specialInstructions?: string
  customerPhone?: string
  confidence: number
}

interface ParsedWhatsAppData {
  type: 'order' | 'payment' | 'customer_inquiry' | 'delivery_confirmation'
  extraction: OrderExtraction | PaymentExtraction | DeliveryExtraction | null
  confidence: number
  rawText: string
}

class WhatsAppParserService {
  // Malaysian business patterns for order extraction
  private readonly ORDER_PATTERNS = [
    // Malay patterns
    { 
      regex: /(?:nak|mau|order|pesan|beli)\s+(\d+)\s*x?\s*(.+?)(?:\s+(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?))?/gi,
      language: 'ms',
      confidence: 0.85
    },
    {
      regex: /(\d+)\s*(?:keping|biji|unit)?\s*(.+?)\s*(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?)/gi,
      language: 'ms',
      confidence: 0.9
    },
    // English patterns
    {
      regex: /(?:want|need|order|buy)\s+(\d+)\s*x?\s*(.+?)(?:\s+(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?))?/gi,
      language: 'en',
      confidence: 0.85
    },
    {
      regex: /(\d+)\s*(?:pcs|pieces|units?)?\s*(.+?)\s*(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?)/gi,
      language: 'en',
      confidence: 0.9
    }
  ]

  private readonly PAYMENT_PATTERNS = [
    // Payment confirmations
    {
      regex: /(?:dah|sudah|done|paid|bayar|transfer|trf)\s*(?:transfer|bayar|trf)?/gi,
      language: 'ms',
      confidence: 0.8
    },
    {
      regex: /(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?)\s*(?:transfer|paid|sent)/gi,
      language: 'en',
      confidence: 0.85
    },
    {
      regex: /ref(?:erence)?:?\s*([a-zA-Z0-9]+)/gi,
      language: 'both',
      confidence: 0.9
    },
    {
      regex: /(?:maybank|cimb|public bank|rhb|bank islam|hong leong|ocbc|uob)\s*(?:transfer|payment)?/gi,
      language: 'both',
      confidence: 0.95
    }
  ]

  private readonly AMOUNT_PATTERNS = [
    /(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?)/gi,
    /(\d+(?:\.\d{2})?)\s*(?:rm|ringgit)/gi,
    /total:?\s*(?:rm|ringgit|\$)?\s*(\d+(?:\.\d{2})?)/gi
  ]

  private readonly CUSTOMER_PATTERNS = [
    /nama:?\s*([^\n\r]+)/gi,
    /name:?\s*([^\n\r]+)/gi,
    /(?:hp|phone|no):?\s*(\+?6?\d{10,12})/gi,
    /alamat:?\s*([^\n\r]+)/gi,
    /address:?\s*([^\n\r]+)/gi
  ]

  /**
   * Parse WhatsApp message and extract business information
   */
  async parseWhatsAppMessage(
    userId: string,
    message: WhatsAppMessage
  ): Promise<ParsedWhatsAppData> {
    const messageContent = message.content.toLowerCase().trim()

    // Determine message type and parse accordingly
    let parsedData: ParsedWhatsAppData

    if (this.isOrderMessage(messageContent)) {
      parsedData = await this.parseOrderMessage(messageContent, message)
    } else if (this.isPaymentMessage(messageContent)) {
      parsedData = await this.parsePaymentMessage(messageContent, message)
    } else if (this.isDeliveryMessage(messageContent)) {
      parsedData = await this.parseDeliveryMessage(messageContent, message)
    } else {
      parsedData = {
        type: 'customer_inquiry',
        extraction: null,
        confidence: 0.3,
        rawText: message.content
      }
    }

    // Store extraction in database
    await this.storeExtraction(userId, message.content, parsedData)

    return parsedData
  }

  /**
   * Process WhatsApp message and create order if applicable
   */
  async processWhatsAppOrder(
    userId: string,
    message: WhatsAppMessage,
    autoCreateOrder = false
  ): Promise<{
    extraction: ParsedWhatsAppData
    order?: any
    success: boolean
    error?: string
  }> {
    try {
      // Check feature usage limits
      await this.checkFeatureLimit(userId, 'whatsapp_extract')

      const extraction = await this.parseWhatsAppMessage(userId, message)

      let createdOrder
      if (autoCreateOrder && extraction.type === 'order' && extraction.extraction) {
        const orderExtraction = extraction.extraction as OrderExtraction
        
        if (orderExtraction.orderItems.length > 0) {
          createdOrder = await orderService.createOrder(userId, {
            customerName: orderExtraction.customerName || message.sender,
            customerPhone: orderExtraction.customerPhone || message.senderPhone,
            items: orderExtraction.orderItems.map(item => ({
              name: item.name,
              price: item.price || 0, // Will need manual pricing if not extracted
              quantity: item.quantity
            })),
            notes: `WhatsApp order: ${orderExtraction.notes || message.content}`,
            status: 'pending'
          })
        }
      }

      // Update feature usage
      await this.updateFeatureUsage(userId, 'whatsapp_extract')

      // Update user progress
      await this.updateUserProgress(userId, 'whatsapp_extractions', 1)

      return {
        extraction,
        order: createdOrder,
        success: true
      }

    } catch (error) {
      return {
        extraction: {
          type: 'customer_inquiry',
          extraction: null,
          confidence: 0,
          rawText: message.content
        },
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }
    }
  }

  /**
   * Get WhatsApp extraction history for user
   */
  async getExtractionHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<WhatsAppExtraction[]> {
    const { data, error } = await supabase
      .from('whatsapp_extractions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data || []
  }

  /**
   * Get WhatsApp extractions by type
   */
  async getExtractionsByType(
    userId: string,
    type: 'order' | 'payment' | 'customer_inquiry' | 'delivery_confirmation',
    limit = 20
  ): Promise<WhatsAppExtraction[]> {
    const { data, error } = await supabase
      .from('whatsapp_extractions')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', type)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Update extraction with manual corrections
   */
  async updateExtractionWithCorrections(
    extractionId: string,
    corrections: Partial<OrderExtraction | PaymentExtraction>
  ): Promise<WhatsAppExtraction> {
    const { data: extraction } = await supabase
      .from('whatsapp_extractions')
      .select('*')
      .eq('id', extractionId)
      .single()

    if (!extraction) throw new Error('Extraction not found')

    const correctedData = {
      ...extraction.extracted_data,
      ...corrections,
      manually_corrected: true
    }

    const { data, error } = await supabase
      .from('whatsapp_extractions')
      .update({
        extracted_data: correctedData,
        confidence_score: 1.0, // Manual correction gets full confidence
        status: 'processed'
      })
      .eq('id', extractionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get WhatsApp parsing statistics
   */
  async getWhatsAppStats(userId: string, days = 30): Promise<{
    totalExtractions: number
    orderExtractions: number
    paymentConfirmations: number
    customerInquiries: number
    averageConfidence: number
    successRate: number
    topCustomers: Array<{
      phone: string
      name?: string
      extractionCount: number
    }>
  }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: extractions, error } = await supabase
      .from('whatsapp_extractions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())

    if (error) throw error

    const totalExtractions = extractions.length
    const orderExtractions = extractions.filter(e => e.source_type === 'order').length
    const paymentConfirmations = extractions.filter(e => e.source_type === 'payment').length
    const customerInquiries = extractions.filter(e => e.source_type === 'customer_inquiry').length

    const averageConfidence = extractions.length > 0 
      ? extractions.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / extractions.length
      : 0

    const successfulExtractions = extractions.filter(e => e.status === 'processed').length
    const successRate = totalExtractions > 0 ? (successfulExtractions / totalExtractions) * 100 : 0

    // Top customers by extraction count
    const customerCount: Record<string, { name?: string; count: number }> = {}
    extractions.forEach(extraction => {
      if (extraction.customer_phone) {
        if (!customerCount[extraction.customer_phone]) {
          customerCount[extraction.customer_phone] = { 
            name: extraction.customer_name || undefined, 
            count: 0 
          }
        }
        customerCount[extraction.customer_phone].count += 1
      }
    })

    const topCustomers = Object.entries(customerCount)
      .map(([phone, data]) => ({
        phone,
        name: data.name,
        extractionCount: data.count
      }))
      .sort((a, b) => b.extractionCount - a.extractionCount)
      .slice(0, 5)

    return {
      totalExtractions,
      orderExtractions,
      paymentConfirmations,
      customerInquiries,
      averageConfidence,
      successRate,
      topCustomers
    }
  }

  /**
   * Train parser with manual corrections for better accuracy
   */
  async trainParserWithCorrections(userId: string): Promise<void> {
    // Get manually corrected extractions for training
    const { data: corrections } = await supabase
      .from('whatsapp_extractions')
      .select('message_content, extracted_data, source_type')
      .eq('user_id', userId)
      .eq('status', 'processed')
      .not('extracted_data->>manually_corrected', 'is', null)

    if (!corrections || corrections.length === 0) return

    // Store training patterns for future use
    const trainingPatterns = corrections.map(correction => ({
      pattern_type: correction.source_type,
      language: this.detectLanguage(correction.message_content),
      sample_text: correction.message_content,
      expected_extraction: correction.extracted_data,
      accuracy_score: 0.95 // High score for manually corrected data
    }))

    await supabase
      .from('whatsapp_patterns')
      .upsert(trainingPatterns)
  }

  // Private parsing methods
  private isOrderMessage(content: string): boolean {
    const orderKeywords = [
      'nak', 'mau', 'order', 'pesan', 'beli', 'want', 'need', 'buy',
      'ambil', 'take', 'booking'
    ]
    return orderKeywords.some(keyword => content.includes(keyword))
  }

  private isPaymentMessage(content: string): boolean {
    const paymentKeywords = [
      'dah transfer', 'sudah bayar', 'done payment', 'paid', 'transfer done',
      'ref:', 'reference', 'receipt', 'maybank', 'cimb', 'public bank'
    ]
    return paymentKeywords.some(keyword => content.includes(keyword))
  }

  private isDeliveryMessage(content: string): boolean {
    const deliveryKeywords = [
      'alamat', 'address', 'hantar', 'deliver', 'pos', 'courier',
      'sampai bila', 'when arrive', 'location'
    ]
    return deliveryKeywords.some(keyword => content.includes(keyword))
  }

  private async parseOrderMessage(content: string, message: WhatsAppMessage): Promise<ParsedWhatsAppData> {
    const orderItems: Array<{ name: string; quantity: number; price?: number }> = []
    let totalAmount: number | undefined
    let customerName: string | undefined
    let customerPhone: string | undefined
    let confidence = 0

    // Extract order items
    for (const pattern of this.ORDER_PATTERNS) {
      const matches = [...content.matchAll(pattern.regex)]
      for (const match of matches) {
        const quantity = parseInt(match[1]) || 1
        const itemName = match[2]?.trim()
        const price = match[3] ? parseFloat(match[3]) : undefined

        if (itemName) {
          orderItems.push({
            name: itemName,
            quantity,
            price
          })
          confidence = Math.max(confidence, pattern.confidence)
        }
      }
    }

    // Extract total amount
    for (const pattern of this.AMOUNT_PATTERNS) {
      const match = content.match(pattern)
      if (match) {
        totalAmount = parseFloat(match[1])
        confidence = Math.max(confidence, 0.8)
        break
      }
    }

    // Extract customer info
    for (const pattern of this.CUSTOMER_PATTERNS) {
      const match = content.match(pattern)
      if (match) {
        if (pattern.source?.includes('nama') || pattern.source?.includes('name')) {
          customerName = match[1]?.trim()
        } else if (pattern.source?.includes('phone') || pattern.source?.includes('hp')) {
          customerPhone = this.cleanPhoneNumber(match[1])
        }
      }
    }

    // Use WhatsApp message sender info if available
    if (!customerName && message.sender) {
      customerName = message.sender
    }
    if (!customerPhone && message.senderPhone) {
      customerPhone = this.cleanPhoneNumber(message.senderPhone)
    }

    const extraction: OrderExtraction = {
      customerName,
      customerPhone,
      orderItems,
      totalAmount,
      notes: content,
      confidence
    }

    return {
      type: 'order',
      extraction,
      confidence,
      rawText: message.content
    }
  }

  private async parsePaymentMessage(content: string, message: WhatsAppMessage): Promise<ParsedWhatsAppData> {
    let amount: number | undefined
    let paymentMethod = 'Unknown'
    let referenceNumber: string | undefined
    let bankName: string | undefined
    let confidence = 0.6

    // Extract amount
    for (const pattern of this.AMOUNT_PATTERNS) {
      const match = content.match(pattern)
      if (match) {
        amount = parseFloat(match[1])
        confidence = Math.max(confidence, 0.8)
        break
      }
    }

    // Extract payment method and bank
    for (const pattern of this.PAYMENT_PATTERNS) {
      const matches = [...content.matchAll(pattern.regex)]
      for (const match of matches) {
        if (match[0].includes('ref') && match[1]) {
          referenceNumber = match[1]
          paymentMethod = 'Bank Transfer'
          confidence = Math.max(confidence, 0.9)
        } else if (match[0].match(/(maybank|cimb|public bank|rhb|bank islam|hong leong|ocbc|uob)/i)) {
          bankName = match[0]
          paymentMethod = 'Bank Transfer'
          confidence = Math.max(confidence, 0.95)
        } else if (match[0].includes('transfer') || match[0].includes('trf')) {
          paymentMethod = 'Bank Transfer'
          confidence = Math.max(confidence, 0.85)
        }
      }
    }

    const extraction: PaymentExtraction = {
      amount: amount || 0,
      paymentMethod,
      referenceNumber,
      bankName,
      customerInfo: message.sender,
      confidence
    }

    return {
      type: 'payment',
      extraction,
      confidence,
      rawText: message.content
    }
  }

  private async parseDeliveryMessage(content: string, message: WhatsAppMessage): Promise<ParsedWhatsAppData> {
    let address: string | undefined
    let deliveryTime: string | undefined
    let specialInstructions: string | undefined
    let customerPhone: string | undefined
    let confidence = 0.5

    // Extract address
    const addressMatch = content.match(/(?:alamat|address):?\s*([^\n\r]+)/gi)
    if (addressMatch) {
      address = addressMatch[1]?.trim()
      confidence = 0.8
    }

    // Extract phone
    const phoneMatch = content.match(/(?:hp|phone|no):?\s*(\+?6?\d{10,12})/gi)
    if (phoneMatch) {
      customerPhone = this.cleanPhoneNumber(phoneMatch[1])
      confidence = Math.max(confidence, 0.7)
    }

    const extraction: DeliveryExtraction = {
      address,
      deliveryTime,
      specialInstructions: content,
      customerPhone,
      confidence
    }

    return {
      type: 'delivery_confirmation',
      extraction,
      confidence,
      rawText: message.content
    }
  }

  private cleanPhoneNumber(phone: string): string {
    // Clean and format Malaysian phone numbers
    let cleaned = phone.replace(/\D/g, '') // Remove non-digits

    // Handle Malaysian number formats
    if (cleaned.startsWith('60')) {
      return `+${cleaned}`
    } else if (cleaned.startsWith('0')) {
      return `+6${cleaned}`
    } else if (cleaned.length >= 9) {
      return `+60${cleaned}`
    }

    return phone // Return original if can't format
  }

  private detectLanguage(content: string): 'en' | 'ms' | 'zh' {
    const malayWords = ['nak', 'mau', 'dah', 'sudah', 'beli', 'pesan', 'alamat', 'hantar']
    const englishWords = ['want', 'need', 'buy', 'order', 'address', 'deliver', 'paid', 'done']

    const malayCount = malayWords.filter(word => content.includes(word)).length
    const englishCount = englishWords.filter(word => content.includes(word)).length

    if (malayCount > englishCount) return 'ms'
    if (englishCount > 0) return 'en'
    return 'en' // Default to English
  }

  private async storeExtraction(
    userId: string,
    messageContent: string,
    parsedData: ParsedWhatsAppData
  ): Promise<void> {
    const extractionData: WhatsAppExtractionInsert = {
      user_id: userId,
      message_content: messageContent,
      extracted_data: parsedData.extraction,
      source_type: parsedData.type,
      confidence_score: parsedData.confidence,
      status: parsedData.confidence > 0.7 ? 'processed' : 'manual_review'
    }

    if (parsedData.type === 'order' && parsedData.extraction) {
      const orderData = parsedData.extraction as OrderExtraction
      extractionData.customer_name = orderData.customerName
      extractionData.customer_phone = orderData.customerPhone
      extractionData.order_amount = orderData.totalAmount
    } else if (parsedData.type === 'payment' && parsedData.extraction) {
      const paymentData = parsedData.extraction as PaymentExtraction
      extractionData.payment_method = paymentData.paymentMethod
      extractionData.order_amount = paymentData.amount
    }

    await supabase
      .from('whatsapp_extractions')
      .insert(extractionData)
  }

  private async checkFeatureLimit(userId: string, feature: string): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7)

    const { data: usage } = await supabase
      .from('feature_usage')
      .select('usage_count, limit_exceeded')
      .eq('user_id', userId)
      .eq('feature_name', feature)
      .eq('month_year', currentMonth)
      .single()

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    const isFreeTier = !subscription || subscription.tier === 'free'
    const monthlyLimit = isFreeTier ? 50 : 999999 // Free: 50, Premium: unlimited

    if (usage && usage.usage_count >= monthlyLimit) {
      throw new Error(`Monthly limit of ${monthlyLimit} WhatsApp extractions exceeded. Upgrade to Premium for unlimited processing.`)
    }
  }

  private async updateFeatureUsage(userId: string, feature: string): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7)

    await supabase.rpc('increment_feature_usage', {
      p_user_id: userId,
      p_feature_name: feature,
      p_month_year: currentMonth
    })
  }

  private async updateUserProgress(userId: string, metric: string, value: number): Promise<void> {
    try {
      await supabase.rpc('update_user_progress', {
        p_user_id: userId,
        p_metric_name: metric,
        p_increment: value
      })
    } catch (error) {
      console.warn('Failed to update user progress:', error)
    }
  }
}

export const whatsappParserService = new WhatsAppParserService()
export type {
  WhatsAppMessage,
  OrderExtraction,
  PaymentExtraction,
  DeliveryExtraction,
  ParsedWhatsAppData
}