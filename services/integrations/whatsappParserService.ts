import { supabase } from '../../lib/supabase'
import { Database } from '../../types/database'
import { orderService } from '../core/orderService'

type WhatsAppExtraction = Database['public']['Tables']['whatsapp_extractions']['Row']

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
  amount?: number
  paymentMethod: string
  referenceNumber?: string
  bankName?: string
  customerInfo?: string
  confidence: number
}

interface ParsedWhatsAppData {
  type: 'order' | 'payment' | 'customer_inquiry' | 'delivery_confirmation'
  extraction: OrderExtraction | PaymentExtraction | null
  confidence: number
  rawText: string
}

class WhatsAppParserService {
  // Malaysian business order patterns
  private readonly ORDER_PATTERNS = [
    // Malay patterns
    { 
      regex: /(?:nak|mau|order|pesan|beli)\s+(\d+)\s*x?\s*(.+?)(?:\s+(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?))?/gi,
      language: 'ms',
      confidence: 0.85,
      type: 'order_quantity_item_price' as const
    },
    {
      regex: /(\d+)\s*(?:keping|biji|unit|pcs)?\s*(.+?)\s*(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?)/gi,
      language: 'ms',
      confidence: 0.9,
      type: 'quantity_item_price' as const
    },
    {
      regex: /(?:nak|mau)\s+(.+?)\s+(\d+)\s*(?:keping|biji|unit)?/gi,
      language: 'ms',
      confidence: 0.75,
      type: 'item_quantity' as const
    },
    // English patterns
    {
      regex: /(?:want|need|order|buy)\s+(\d+)\s*x?\s*(.+?)(?:\s+(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?))?/gi,
      language: 'en',
      confidence: 0.85,
      type: 'order_quantity_item_price' as const
    },
    {
      regex: /(\d+)\s*(?:pcs|pieces|units?)?\s*(.+?)\s*(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?)/gi,
      language: 'en',
      confidence: 0.9,
      type: 'quantity_item_price' as const
    },
    // Common Malaysian food ordering patterns
    {
      regex: /(\d+)\s*(?:bungkus|packets?)\s*(.+?)(?:\s*(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?))?/gi,
      language: 'ms',
      confidence: 0.9,
      type: 'quantity_food_price' as const
    }
  ]

  // Payment confirmation patterns
  private readonly PAYMENT_PATTERNS = [
    {
      regex: /(?:dah|sudah|done|completed?)\s*(?:transfer|bayar|trf|paid?)/gi,
      confidence: 0.8,
      method: 'Bank Transfer'
    },
    {
      regex: /(?:cash|tunai)\s*(?:on\s*delivery|cod)/gi,
      confidence: 0.9,
      method: 'COD'
    },
    {
      regex: /(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?)\s*(?:transfer|paid|sent|hantar)/gi,
      confidence: 0.85,
      method: 'Bank Transfer'
    },
    {
      regex: /ref(?:erence)?:?\s*([a-zA-Z0-9]+)/gi,
      confidence: 0.95,
      method: 'Bank Transfer'
    },
    {
      regex: /(?:maybank|cimb|public bank|rhb|bank islam|hong leong|ocbc|uob|ambank)/gi,
      confidence: 0.95,
      method: 'Bank Transfer'
    },
    {
      regex: /(?:touch\s*n\s*go|tng|grabpay|boost|shopeepay)/gi,
      confidence: 0.9,
      method: 'E-wallet'
    }
  ]

  // Amount extraction patterns
  private readonly AMOUNT_PATTERNS = [
    /(?:rm|ringgit|\$)\s*(\d+(?:\.\d{2})?)/gi,
    /(\d+(?:\.\d{2})?)\s*(?:rm|ringgit)/gi,
    /total:?\s*(?:rm|ringgit|\$)?\s*(\d+(?:\.\d{2})?)/gi,
    /harga:?\s*(?:rm|ringgit|\$)?\s*(\d+(?:\.\d{2})?)/gi,
    /bayar:?\s*(?:rm|ringgit|\$)?\s*(\d+(?:\.\d{2})?)/gi
  ]

  // Customer info patterns
  private readonly CUSTOMER_PATTERNS = [
    { regex: /nama:?\s*([^\n\r,;]+)/gi, type: 'name' },
    { regex: /name:?\s*([^\n\r,;]+)/gi, type: 'name' },
    { regex: /(?:hp|phone|no\.?):?\s*(\+?6?\d{10,12})/gi, type: 'phone' },
    { regex: /alamat:?\s*([^\n\r]+)/gi, type: 'address' },
    { regex: /address:?\s*([^\n\r]+)/gi, type: 'address' }
  ]

  // Common Malaysian food and product terms for better recognition
  private readonly MALAYSIAN_PRODUCTS = [
    // Food items
    'nasi lemak', 'mee goreng', 'char kuey teow', 'laksa', 'rendang', 'satay',
    'roti canai', 'teh tarik', 'kopi', 'milo', 'bandung', 'cendol',
    'rojak', 'abc', 'ais kacang', 'kuih', 'apam', 'onde-onde',
    // Common items
    'beras', 'gula', 'garam', 'minyak', 'telur', 'ayam', 'ikan', 'sayur',
    'susu', 'roti', 'biscuit', 'air', 'minuman'
  ]

  /**
   * Parse WhatsApp message and extract business information
   */
  async parseWhatsAppMessage(
    userId: string,
    message: WhatsAppMessage
  ): Promise<ParsedWhatsAppData> {
    try {
      const messageContent = message.content.toLowerCase().trim()

      // Determine message type and parse accordingly
      let parsedData: ParsedWhatsAppData

      if (this.isOrderMessage(messageContent)) {
        parsedData = this.parseOrderMessage(messageContent, message)
      } else if (this.isPaymentMessage(messageContent)) {
        parsedData = this.parsePaymentMessage(messageContent, message)
      } else if (this.isDeliveryMessage(messageContent)) {
        parsedData = this.parseDeliveryMessage(messageContent, message)
      } else {
        parsedData = {
          type: 'customer_inquiry',
          extraction: null,
          confidence: 0.3,
          rawText: message.content
        }
      }

      // Store extraction in database
      await this.storeExtraction(userId, message.content, parsedData, message)

      return parsedData

    } catch (error) {
      console.error('WhatsApp parsing error:', error)
      return {
        type: 'customer_inquiry',
        extraction: null,
        confidence: 0.1,
        rawText: message.content
      }
    }
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
          // Create order with extracted data
          createdOrder = await orderService.createOrder(userId, {
            customerName: orderExtraction.customerName || message.sender || 'WhatsApp Customer',
            customerPhone: this.cleanPhoneNumber(orderExtraction.customerPhone || message.senderPhone || ''),
            items: orderExtraction.orderItems.map(item => ({
              name: item.name,
              price: item.price || 0, // Will need manual pricing if not extracted
              quantity: item.quantity
            })),
            notes: `WhatsApp order: ${message.content.substring(0, 200)}...`,
            status: 'pending'
          })

          // Update the extraction with the created order ID
          await this.updateExtractionWithOrder(extraction.rawText, createdOrder.id)
        }
      }

      // Update feature usage and progress
      await this.updateFeatureUsage(userId, 'whatsapp_extract')
      await this.updateUserProgress(userId, 'whatsapp_extractions', 1)

      return {
        extraction,
        order: createdOrder,
        success: true
      }

    } catch (error) {
      console.error('WhatsApp order processing error:', error)
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
   * Get WhatsApp extraction history
   */
  async getExtractionHistory(userId: string, limit = 50, offset = 0): Promise<WhatsAppExtraction[]> {
    if (limit < 1 || limit > 100) limit = 50
    if (offset < 0) offset = 0

    const { data, error } = await supabase
      .from('whatsapp_extractions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching WhatsApp extractions:', error)
      throw new Error(`Failed to fetch WhatsApp extractions: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get extraction statistics
   */
  async getExtractionStats(userId: string, days = 30): Promise<{
    totalExtractions: number
    orderExtractions: number
    paymentConfirmations: number
    averageConfidence: number
    successRate: number
    topCustomers: Array<{
      phone: string
      name?: string
      extractionCount: number
    }>
    hourlyDistribution: Array<{
      hour: number
      count: number
    }>
  }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: extractions, error } = await supabase
      .from('whatsapp_extractions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())

    if (error) {
      console.error('Error fetching extraction stats:', error)
      throw new Error(`Failed to fetch extraction statistics: ${error.message}`)
    }

    const totalExtractions = extractions.length
    const orderExtractions = extractions.filter(e => e.source_type === 'order').length
    const paymentConfirmations = extractions.filter(e => e.source_type === 'payment').length

    const averageConfidence = totalExtractions > 0 
      ? extractions.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / totalExtractions
      : 0

    const successfulExtractions = extractions.filter(e => e.status === 'processed').length
    const successRate = totalExtractions > 0 ? (successfulExtractions / totalExtractions) * 100 : 0

    // Top customers analysis
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

    // Hourly distribution
    const hourlyCount: Record<number, number> = {}
    extractions.forEach(extraction => {
      const hour = new Date(extraction.created_at).getHours()
      hourlyCount[hour] = (hourlyCount[hour] || 0) + 1
    })

    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyCount[hour] || 0
    }))

    return {
      totalExtractions,
      orderExtractions,
      paymentConfirmations,
      averageConfidence,
      successRate,
      topCustomers,
      hourlyDistribution
    }
  }

  // Private parsing methods
  private isOrderMessage(content: string): boolean {
    const orderKeywords = [
      // Malay
      'nak', 'mau', 'order', 'pesan', 'beli', 'ambil', 'booking',
      // English
      'want', 'need', 'buy', 'take', 'book',
      // Common patterns
      'bungkus', 'packet', 'x', 'keping', 'biji'
    ]
    
    return orderKeywords.some(keyword => content.includes(keyword)) ||
           this.hasQuantityPattern(content) ||
           this.hasMalaysianProductMention(content)
  }

  private isPaymentMessage(content: string): boolean {
    const paymentKeywords = [
      // Malay
      'dah transfer', 'sudah bayar', 'dah bayar', 'hantar duit',
      // English
      'done payment', 'paid', 'transfer done', 'sent money',
      // References and banks
      'ref:', 'reference', 'receipt', 'maybank', 'cimb', 'public bank',
      'touch n go', 'grabpay', 'boost', 'shopeepay'
    ]
    
    return paymentKeywords.some(keyword => content.includes(keyword))
  }

  private isDeliveryMessage(content: string): boolean {
    const deliveryKeywords = [
      'alamat', 'address', 'hantar', 'deliver', 'pos', 'courier',
      'sampai bila', 'when arrive', 'location', 'pickup', 'ambil'
    ]
    
    return deliveryKeywords.some(keyword => content.includes(keyword))
  }

  private hasQuantityPattern(content: string): boolean {
    return /\d+\s*(?:x|keping|biji|bungkus|packet|pcs|unit)/i.test(content)
  }

  private hasMalaysianProductMention(content: string): boolean {
    return this.MALAYSIAN_PRODUCTS.some(product => content.includes(product))
  }

  private parseOrderMessage(content: string, message: WhatsAppMessage): ParsedWhatsAppData {
    const orderItems: Array<{ name: string; quantity: number; price?: number }> = []
    let totalAmount: number | undefined
    let customerName: string | undefined
    let customerPhone: string | undefined
    let maxConfidence = 0

    // Extract order items using patterns
    for (const pattern of this.ORDER_PATTERNS) {
      const matches = [...content.matchAll(pattern.regex)]
      for (const match of matches) {
        let quantity: number, itemName: string, price: number | undefined

        switch (pattern.type) {
          case 'order_quantity_item_price':
          case 'quantity_item_price':
          case 'quantity_food_price':
            quantity = parseInt(match[1]) || 1
            itemName = match[2]?.trim()
            price = match[3] ? parseFloat(match[3]) : undefined
            break
          
          case 'item_quantity':
            itemName = match[1]?.trim()
            quantity = parseInt(match[2]) || 1
            break
          
          default:
            continue
        }

        if (itemName && itemName.length > 0) {
          // Clean up item name
          itemName = this.cleanItemName(itemName)
          
          if (itemName.length > 2) { // Ignore very short names
            orderItems.push({
              name: itemName,
              quantity,
              price
            })
            maxConfidence = Math.max(maxConfidence, pattern.confidence)
          }
        }
      }
    }

    // Extract total amount if no individual prices found
    if (orderItems.some(item => !item.price)) {
      for (const pattern of this.AMOUNT_PATTERNS) {
        const match = content.match(pattern)
        if (match) {
          totalAmount = parseFloat(match[1])
          maxConfidence = Math.max(maxConfidence, 0.8)
          break
        }
      }
    }

    // Extract customer info
    for (const pattern of this.CUSTOMER_PATTERNS) {
      const match = content.match(pattern.regex)
      if (match) {
        if (pattern.type === 'name') {
          customerName = match[1]?.trim()
        } else if (pattern.type === 'phone') {
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

    // Adjust confidence based on completeness
    if (orderItems.length > 0) {
      if (totalAmount || orderItems.some(item => item.price)) {
        maxConfidence = Math.min(maxConfidence + 0.1, 1.0)
      }
      if (customerPhone) {
        maxConfidence = Math.min(maxConfidence + 0.05, 1.0)
      }
    }

    const extraction: OrderExtraction = {
      customerName,
      customerPhone,
      orderItems,
      totalAmount,
      notes: content,
      confidence: maxConfidence
    }

    return {
      type: 'order',
      extraction,
      confidence: maxConfidence,
      rawText: message.content
    }
  }

  private parsePaymentMessage(content: string, message: WhatsAppMessage): ParsedWhatsAppData {
    let amount: number | undefined
    let paymentMethod = 'Unknown'
    let referenceNumber: string | undefined
    let bankName: string | undefined
    let maxConfidence = 0.6

    // Extract amount
    for (const pattern of this.AMOUNT_PATTERNS) {
      const match = content.match(pattern)
      if (match) {
        amount = parseFloat(match[1])
        maxConfidence = Math.max(maxConfidence, 0.8)
        break
      }
    }

    // Extract payment method and details
    for (const pattern of this.PAYMENT_PATTERNS) {
      const matches = [...content.matchAll(pattern.regex)]
      for (const match of matches) {
        paymentMethod = pattern.method
        maxConfidence = Math.max(maxConfidence, pattern.confidence)

        if (match[0].includes('ref') && match[1]) {
          referenceNumber = match[1].trim()
        }

        // Extract bank name if mentioned
        const bankMatch = match[0].match(/(maybank|cimb|public bank|rhb|bank islam|hong leong|ocbc|uob|ambank)/i)
        if (bankMatch) {
          bankName = bankMatch[1]
          maxConfidence = Math.min(maxConfidence + 0.05, 1.0)
        }
      }
    }

    const extraction: PaymentExtraction = {
      amount,
      paymentMethod,
      referenceNumber,
      bankName,
      customerInfo: message.sender,
      confidence: maxConfidence
    }

    return {
      type: 'payment',
      extraction,
      confidence: maxConfidence,
      rawText: message.content
    }
  }

  private parseDeliveryMessage(content: string, message: WhatsAppMessage): ParsedWhatsAppData {
    // For delivery messages, we'll extract basic info and return low confidence
    // since this is not the main focus for MVP
    return {
      type: 'delivery_confirmation',
      extraction: {
        customerInfo: message.sender,
        confidence: 0.5
      } as any,
      confidence: 0.5,
      rawText: message.content
    }
  }

  private cleanItemName(name: string): string {
    return name
      .replace(/[^\w\s\-]/g, ' ') // Remove special characters except hyphens
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Title case
      .join(' ')
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

  private async storeExtraction(
    userId: string,
    messageContent: string,
    parsedData: ParsedWhatsAppData,
    message: WhatsAppMessage
  ): Promise<void> {
    try {
      const extractionData = {
        user_id: userId,
        message_content: messageContent,
        extracted_data: parsedData.extraction,
        source_type: parsedData.type,
        confidence_score: parsedData.confidence,
        status: parsedData.confidence > 0.7 ? 'processed' : 'manual_review'
      } as any

      // Add customer info if available
      if (parsedData.type === 'order' && parsedData.extraction) {
        const orderData = parsedData.extraction as OrderExtraction
        extractionData.customer_name = orderData.customerName
        extractionData.customer_phone = orderData.customerPhone
        extractionData.order_amount = orderData.totalAmount
      } else if (parsedData.type === 'payment' && parsedData.extraction) {
        const paymentData = parsedData.extraction as PaymentExtraction
        extractionData.payment_method = paymentData.paymentMethod
        extractionData.order_amount = paymentData.amount
        extractionData.customer_phone = message.senderPhone
      }

      await supabase
        .from('whatsapp_extractions')
        .insert(extractionData)

    } catch (error) {
      console.error('Failed to store WhatsApp extraction:', error)
    }
  }

  private async updateExtractionWithOrder(messageContent: string, orderId: string): Promise<void> {
    try {
      await supabase
        .from('whatsapp_extractions')
        .update({ order_id: orderId })
        .eq('message_content', messageContent)
        .order('created_at', { ascending: false })
        .limit(1)
    } catch (error) {
      console.warn('Failed to update extraction with order ID:', error)
    }
  }

  private async checkFeatureLimit(userId: string, feature: string): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7)

    const { data: usage } = await supabase
      .from('feature_usage')
      .select('usage_count')
      .eq('user_id', userId)
      .eq('feature_name', feature)
      .eq('month_year', currentMonth)
      .single()

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    const isFreeTier = !subscription || subscription.tier === 'free'
    const monthlyLimit = isFreeTier ? 50 : 999999

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
  ParsedWhatsAppData
}