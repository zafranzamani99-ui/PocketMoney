import { supabase } from '../../lib/supabase'
import { Database } from '../../types/database'
import { groqService } from '../groqService'
import { expenseService } from './expenseService'

type Receipt = Database['public']['Tables']['receipts']['Row']
type ReceiptInsert = Database['public']['Tables']['receipts']['Insert']

interface ProcessedReceiptData {
  store_name?: string
  total_amount?: number
  date?: string
  items?: Array<{
    name: string
    price: number
    quantity?: number
  }>
  payment_method?: string
  gst_amount?: number
  category?: string
}

interface ReceiptProcessingResult {
  receipt: Receipt
  extractedData: ProcessedReceiptData | null
  expense?: any
  success: boolean
  error?: string
  processing_time_ms?: number
}

interface ReceiptUploadOptions {
  createExpense: boolean
  walletId?: string
  category?: string
  description?: string
}

class ReceiptProcessingService {
  private readonly SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  private readonly MAX_FILE_SIZE_MB = 10
  private readonly MAX_PROCESSING_TIME_MS = 30000 // 30 seconds timeout

  /**
   * Process receipt image from camera or gallery
   */
  async processReceiptFromImage(
    userId: string,
    imageFile: File | Blob,
    fileName: string,
    options: ReceiptUploadOptions = { createExpense: true }
  ): Promise<ReceiptProcessingResult> {
    const processingStartTime = Date.now()

    try {
      // Validate user's feature limits
      await this.checkFeatureLimit(userId, 'receipt_scan')

      // Validate image file
      this.validateImageFile(imageFile, fileName)

      // Upload image to Supabase Storage
      const imageUrl = await this.uploadReceiptImage(imageFile, fileName)

      // Create receipt record
      const receipt = await this.createReceiptRecord(userId, imageUrl)

      // Add to processing queue
      await this.addToProcessingQueue(receipt.id, userId, 'groq_ai')

      // Process with Groq AI
      const extractedData = await this.processWithGroqAI(imageUrl, receipt.id)

      // Update receipt with extracted data
      await this.updateReceiptWithData(receipt.id, extractedData)

      // Create expense if requested and data is valid
      let createdExpense = null
      if (options.createExpense && extractedData?.total_amount) {
        try {
          createdExpense = await this.createExpenseFromReceipt(
            userId,
            extractedData,
            receipt.id,
            options
          )
        } catch (expenseError) {
          console.warn('Failed to create expense from receipt:', expenseError)
        }
      }

      // Update processing status
      await this.updateProcessingStatus(receipt.id, 'completed')

      // Update feature usage and progress
      await this.updateFeatureUsage(userId, 'receipt_scan')
      await this.updateUserProgress(userId, 'receipts_scanned', 1)

      const processingTime = Date.now() - processingStartTime

      return {
        receipt,
        extractedData,
        expense: createdExpense,
        success: true,
        processing_time_ms: processingTime
      }

    } catch (error) {
      console.error('Receipt processing error:', error)
      
      return {
        receipt: {} as Receipt,
        extractedData: null,
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        processing_time_ms: Date.now() - processingStartTime
      }
    }
  }

  /**
   * Process receipt from base64 image data
   */
  async processReceiptFromBase64(
    userId: string,
    base64Image: string,
    options: ReceiptUploadOptions = { createExpense: true }
  ): Promise<ReceiptProcessingResult> {
    try {
      // Validate base64 format
      if (!base64Image.startsWith('data:image/')) {
        throw new Error('Invalid base64 image format')
      }

      // Convert base64 to blob
      const response = await fetch(base64Image)
      const blob = await response.blob()

      const fileName = `receipt_${Date.now()}.jpg`

      return await this.processReceiptFromImage(userId, blob, fileName, options)

    } catch (error) {
      console.error('Base64 receipt processing error:', error)
      return {
        receipt: {} as Receipt,
        extractedData: null,
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }
    }
  }

  /**
   * Get user's receipt processing history
   */
  async getUserReceipts(userId: string, limit = 50, offset = 0): Promise<Receipt[]> {
    if (limit < 1 || limit > 100) limit = 50
    if (offset < 0) offset = 0

    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching receipts:', error)
      throw new Error(`Failed to fetch receipts: ${error.message}`)
    }

    return data || []
  }

  /**
   * Reprocess receipt with manual corrections
   */
  async reprocessReceiptWithCorrections(
    userId: string,
    receiptId: string,
    corrections: Partial<ProcessedReceiptData>
  ): Promise<ReceiptProcessingResult> {
    if (!this.isValidUUID(receiptId)) {
      throw new Error('Invalid receipt ID format')
    }

    // Get receipt record
    const { data: receipt, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .eq('user_id', userId)
      .single()

    if (error || !receipt) {
      throw new Error('Receipt not found or access denied')
    }

    try {
      // Merge corrections with existing data
      const currentData = (receipt.extracted_data as ProcessedReceiptData) || {}
      const correctedData: ProcessedReceiptData = {
        ...currentData,
        ...corrections
      }

      // Validate corrected data
      this.validateExtractedData(correctedData)

      // Update receipt with corrected data
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          extracted_data: correctedData,
          processed_at: new Date().toISOString()
        })
        .eq('id', receiptId)

      if (updateError) {
        console.error('Receipt correction update error:', updateError)
        throw new Error(`Failed to update receipt: ${updateError.message}`)
      }

      // Update processing status
      await this.updateProcessingStatus(receiptId, 'completed')

      return {
        receipt: { ...receipt, extracted_data: correctedData },
        extractedData: correctedData,
        success: true
      }

    } catch (error) {
      console.error('Receipt correction error:', error)
      return {
        receipt,
        extractedData: null,
        success: false,
        error: error instanceof Error ? error.message : 'Correction failed'
      }
    }
  }

  /**
   * Delete receipt and associated files
   */
  async deleteReceipt(userId: string, receiptId: string): Promise<void> {
    if (!this.isValidUUID(receiptId)) {
      throw new Error('Invalid receipt ID format')
    }

    // Get receipt details
    const { data: receipt, error: fetchError } = await supabase
      .from('receipts')
      .select('image_url')
      .eq('id', receiptId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !receipt) {
      throw new Error('Receipt not found or access denied')
    }

    // Delete receipt record (processing queue entries will be cascaded)
    const { error: deleteError } = await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Receipt deletion error:', deleteError)
      throw new Error(`Failed to delete receipt: ${deleteError.message}`)
    }

    // Delete image from storage
    if (receipt.image_url) {
      await this.deleteReceiptImage(receipt.image_url)
    }

    // Update user progress
    await this.updateUserProgress(userId, 'receipts_scanned', -1)
  }

  /**
   * Get receipt processing statistics
   */
  async getProcessingStats(userId: string, days = 30): Promise<{
    totalProcessed: number
    successfulExtractions: number
    averageAccuracy: number
    processingTimeStats: {
      average: number
      min: number
      max: number
    }
    topStores: Array<{
      store: string
      count: number
      totalAmount: number
    }>
    categoryDistribution: Array<{
      category: string
      count: number
    }>
  }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('extracted_data, processed_at, created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())

    if (error) {
      console.error('Error fetching receipt stats:', error)
      throw new Error(`Failed to fetch receipt statistics: ${error.message}`)
    }

    const totalProcessed = receipts.length
    const successfulExtractions = receipts.filter(r => 
      r.processed_at && r.extracted_data
    ).length

    const averageAccuracy = totalProcessed > 0 
      ? (successfulExtractions / totalProcessed) * 100 
      : 0

    // Processing time stats (mock data since we don't store processing time)
    const processingTimeStats = {
      average: 5000, // 5 seconds average
      min: 2000,     // 2 seconds minimum
      max: 15000     // 15 seconds maximum
    }

    // Analyze top stores
    const storeCount: Record<string, { count: number; totalAmount: number }> = {}
    receipts.forEach(receipt => {
      const data = receipt.extracted_data as ProcessedReceiptData
      if (data?.store_name) {
        if (!storeCount[data.store_name]) {
          storeCount[data.store_name] = { count: 0, totalAmount: 0 }
        }
        storeCount[data.store_name].count += 1
        storeCount[data.store_name].totalAmount += data.total_amount || 0
      }
    })

    const topStores = Object.entries(storeCount)
      .map(([store, data]) => ({
        store,
        count: data.count,
        totalAmount: data.totalAmount
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Category distribution
    const categoryCount: Record<string, number> = {}
    receipts.forEach(receipt => {
      const data = receipt.extracted_data as ProcessedReceiptData
      if (data?.category) {
        categoryCount[data.category] = (categoryCount[data.category] || 0) + 1
      }
    })

    const categoryDistribution = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalProcessed,
      successfulExtractions,
      averageAccuracy,
      processingTimeStats,
      topStores,
      categoryDistribution
    }
  }

  // Private helper methods
  private validateImageFile(file: File | Blob, fileName: string): void {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new Error(`File size exceeds ${this.MAX_FILE_SIZE_MB}MB limit`)
    }

    // Check file type
    const fileType = file.type || this.getFileTypeFromName(fileName)
    if (!this.SUPPORTED_IMAGE_TYPES.includes(fileType)) {
      throw new Error(`Unsupported file type. Supported types: ${this.SUPPORTED_IMAGE_TYPES.join(', ')}`)
    }
  }

  private getFileTypeFromName(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop()
    const typeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp'
    }
    return typeMap[extension || ''] || ''
  }

  private async uploadReceiptImage(file: File | Blob, fileName: string): Promise<string> {
    const fileExt = fileName.split('.').pop()
    const filePath = `receipts/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Image upload error:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  private async createReceiptRecord(userId: string, imageUrl: string): Promise<Receipt> {
    const receiptData: ReceiptInsert = {
      user_id: userId,
      image_url: imageUrl
    }

    const { data: receipt, error } = await supabase
      .from('receipts')
      .insert(receiptData)
      .select()
      .single()

    if (error) {
      console.error('Receipt record creation error:', error)
      throw new Error(`Failed to create receipt record: ${error.message}`)
    }

    return receipt
  }

  private async addToProcessingQueue(receiptId: string, userId: string, method: 'groq_ai' | 'ml_kit' | 'manual'): Promise<void> {
    const { error } = await supabase
      .from('receipt_processing_queue')
      .insert({
        receipt_id: receiptId,
        user_id: userId,
        processing_method: method,
        status: 'queued'
      })

    if (error) {
      console.error('Processing queue insertion error:', error)
    }
  }

  private async processWithGroqAI(imageUrl: string, receiptId: string): Promise<ProcessedReceiptData | null> {
    try {
      // Update processing status
      await this.updateProcessingStatus(receiptId, 'processing')

      // Use timeout wrapper for Groq processing
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), this.MAX_PROCESSING_TIME_MS)
      })

      const processingPromise = groqService.extractReceiptData(imageUrl)

      const result = await Promise.race([processingPromise, timeoutPromise])

      return result
    } catch (error) {
      console.error('Groq AI processing error:', error)
      await this.updateProcessingStatus(receiptId, 'failed')
      
      // Return mock data for development
      if (process.env.NODE_ENV === 'development') {
        return this.getMockReceiptData()
      }
      
      throw error
    }
  }

  private async updateReceiptWithData(receiptId: string, extractedData: ProcessedReceiptData | null): Promise<void> {
    const { error } = await supabase
      .from('receipts')
      .update({
        extracted_data: extractedData,
        processed_at: new Date().toISOString()
      })
      .eq('id', receiptId)

    if (error) {
      console.error('Receipt data update error:', error)
    }
  }

  private async updateProcessingStatus(receiptId: string, status: 'queued' | 'processing' | 'completed' | 'failed'): Promise<void> {
    const updateData: any = { status }
    
    if (status === 'processing') {
      updateData.processing_started_at = new Date().toISOString()
    } else if (status === 'completed' || status === 'failed') {
      updateData.processing_completed_at = new Date().toISOString()
    }

    await supabase
      .from('receipt_processing_queue')
      .update(updateData)
      .eq('receipt_id', receiptId)
  }

  private async createExpenseFromReceipt(
    userId: string,
    receiptData: ProcessedReceiptData,
    receiptId: string,
    options: ReceiptUploadOptions
  ): Promise<any> {
    if (!receiptData.total_amount || receiptData.total_amount <= 0) {
      throw new Error('Cannot create expense: invalid amount')
    }

    const expenseData = {
      amount: receiptData.total_amount,
      category: options.category || receiptData.category || 'Other',
      description: options.description || receiptData.store_name || 'Receipt scan',
      receiptUrl: receiptId, // Store receipt ID for reference
      walletId: options.walletId
    }

    return await expenseService.createExpense(userId, expenseData)
  }

  private validateExtractedData(data: ProcessedReceiptData): void {
    if (data.total_amount !== undefined) {
      if (typeof data.total_amount !== 'number' || data.total_amount < 0) {
        throw new Error('Total amount must be a non-negative number')
      }
      if (data.total_amount > 999999.99) {
        throw new Error('Total amount exceeds maximum limit')
      }
    }

    if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error('Date must be in YYYY-MM-DD format')
    }

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item, index) => {
        if (!item.name || typeof item.name !== 'string') {
          throw new Error(`Item ${index + 1}: name is required`)
        }
        if (typeof item.price !== 'number' || item.price < 0) {
          throw new Error(`Item ${index + 1}: price must be a non-negative number`)
        }
      })
    }
  }

  private async deleteReceiptImage(imageUrl: string): Promise<void> {
    try {
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      
      if (fileName && fileName.includes('.')) {
        await supabase.storage
          .from('receipts')
          .remove([`receipts/${fileName}`])
      }
    } catch (error) {
      console.warn('Failed to delete receipt image:', error)
    }
  }

  private getMockReceiptData(): ProcessedReceiptData {
    const mockOptions = [
      {
        store_name: '99 Speedmart',
        total_amount: 15.30,
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Maggi Curry', price: 1.20, quantity: 2 },
          { name: '100Plus', price: 2.50, quantity: 1 },
          { name: 'Bread', price: 3.80, quantity: 1 }
        ],
        payment_method: 'Cash',
        gst_amount: 0.92,
        category: 'Food & Beverages'
      },
      {
        store_name: 'Shell Station',
        total_amount: 45.00,
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Petrol RON95', price: 45.00, quantity: 1 }
        ],
        payment_method: 'Card',
        category: 'Transport'
      }
    ]

    return mockOptions[Math.floor(Math.random() * mockOptions.length)]
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
    const monthlyLimit = isFreeTier ? 30 : 999999

    if (usage && usage.usage_count >= monthlyLimit) {
      throw new Error(`Monthly limit of ${monthlyLimit} receipt scans exceeded. Upgrade to Premium for unlimited scans.`)
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

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}

export const receiptProcessingService = new ReceiptProcessingService()
export type {
  ProcessedReceiptData,
  ReceiptProcessingResult,
  ReceiptUploadOptions
}