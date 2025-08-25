import { supabase } from '../lib/supabase'
import { Database } from '../types/database'
import { groqService, ReceiptData } from './groqService'
import { expenseService } from './expenseService'

type Receipt = Database['public']['Tables']['receipts']['Row']
type ReceiptInsert = Database['public']['Tables']['receipts']['Insert']

interface ReceiptProcessingResult {
  receipt: Receipt
  extractedData: ReceiptData | null
  expense?: any
  success: boolean
  error?: string
}

interface ReceiptUploadOptions {
  createExpense: boolean
  walletId?: string
  category?: string
  description?: string
}

interface ReceiptStats {
  totalProcessed: number
  successfulExtractions: number
  accuracyRate: number
  topStores: Array<{
    store: string
    count: number
    totalAmount: number
  }>
  monthlyProcessing: Array<{
    month: string
    count: number
  }>
}

class ReceiptService {
  /**
   * Upload and process receipt image
   */
  async uploadAndProcessReceipt(
    userId: string,
    imageUri: string,
    fileName: string,
    options: ReceiptUploadOptions = { createExpense: true }
  ): Promise<ReceiptProcessingResult> {
    try {
      // Check feature usage limits
      await this.checkFeatureLimit(userId, 'receipt_scan')

      // Upload image to Supabase Storage
      const imageUrl = await this.uploadReceiptImage(imageUri, fileName)

      // Create receipt record
      const receiptData: ReceiptInsert = {
        user_id: userId,
        image_url: imageUrl
      }

      const { data: receipt, error } = await supabase
        .from('receipts')
        .insert(receiptData)
        .select()
        .single()

      if (error) throw error

      // Add to processing queue
      await this.addToProcessingQueue(receipt.id, userId)

      // Process receipt with AI
      const extractedData = await this.processReceiptWithAI(receipt.id, imageUrl)

      // Update receipt with extracted data
      await supabase
        .from('receipts')
        .update({
          extracted_data: extractedData,
          processed_at: new Date().toISOString()
        })
        .eq('id', receipt.id)

      let createdExpense
      if (options.createExpense && extractedData) {
        createdExpense = await this.createExpenseFromReceipt(
          userId,
          extractedData,
          receipt.id,
          options
        )
      }

      // Update processing status
      await this.updateProcessingStatus(receipt.id, 'completed')

      // Update feature usage
      await this.updateFeatureUsage(userId, 'receipt_scan')

      // Update user progress
      await this.updateUserProgress(userId, 'receipts_scanned', 1)
      await this.checkAchievements(userId)

      // Log accuracy for analytics
      await this.logProcessingAccuracy(receipt.id, 'groq_ai', extractedData)

      return {
        receipt,
        extractedData,
        expense: createdExpense,
        success: true
      }

    } catch (error) {
      console.error('Receipt processing error:', error)
      return {
        receipt: {} as Receipt,
        extractedData: null,
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }
    }
  }

  /**
   * Get user's receipt history
   */
  async getUserReceipts(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<Receipt[]> {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data || []
  }

  /**
   * Get receipt by ID with extracted data
   */
  async getReceiptById(receiptId: string): Promise<Receipt | null> {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  /**
   * Reprocess receipt with manual corrections
   */
  async reprocessReceiptWithCorrections(
    receiptId: string,
    corrections: Partial<ReceiptData>
  ): Promise<ReceiptProcessingResult> {
    const { data: receipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single()

    if (!receipt) {
      throw new Error('Receipt not found')
    }

    try {
      // Merge corrections with existing extracted data
      const currentData = receipt.extracted_data as ReceiptData || {}
      const correctedData: ReceiptData = {
        ...currentData,
        ...corrections
      }

      // Update receipt with corrected data
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          extracted_data: correctedData,
          processed_at: new Date().toISOString()
        })
        .eq('id', receiptId)

      if (updateError) throw updateError

      // Log manual corrections for ML improvement
      await this.logManualCorrections(receiptId, currentData, correctedData)

      // Update processing status
      await this.updateProcessingStatus(receiptId, 'completed')

      return {
        receipt: { ...receipt, extracted_data: correctedData },
        extractedData: correctedData,
        success: true
      }

    } catch (error) {
      return {
        receipt,
        extractedData: null,
        success: false,
        error: error instanceof Error ? error.message : 'Reprocessing failed'
      }
    }
  }

  /**
   * Delete receipt and associated data
   */
  async deleteReceipt(receiptId: string): Promise<void> {
    const { data: receipt } = await supabase
      .from('receipts')
      .select('image_url, user_id')
      .eq('id', receiptId)
      .single()

    if (!receipt) throw new Error('Receipt not found')

    // Delete from storage
    if (receipt.image_url) {
      await this.deleteReceiptImage(receipt.image_url)
    }

    // Delete receipt record
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptId)

    if (error) throw error

    // Update user progress
    await this.updateUserProgress(receipt.user_id, 'receipts_scanned', -1)
  }

  /**
   * Get receipt processing statistics
   */
  async getReceiptStats(userId: string, days = 30): Promise<ReceiptStats> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('extracted_data, created_at, processed_at')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())

    if (error) throw error

    const totalProcessed = receipts.length
    const successfulExtractions = receipts.filter(r => 
      r.processed_at && r.extracted_data
    ).length

    const accuracyRate = totalProcessed > 0 
      ? (successfulExtractions / totalProcessed) * 100 
      : 0

    // Top stores analysis
    const storeCount: Record<string, { count: number; totalAmount: number }> = {}
    receipts.forEach(receipt => {
      const data = receipt.extracted_data as ReceiptData
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

    // Monthly processing trend
    const monthlyCount: Record<string, number> = {}
    receipts.forEach(receipt => {
      const monthKey = receipt.created_at.substring(0, 7) // YYYY-MM
      monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1
    })

    const monthlyProcessing = Object.entries(monthlyCount)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return {
      totalProcessed,
      successfulExtractions,
      accuracyRate,
      topStores,
      monthlyProcessing
    }
  }

  /**
   * Get receipts pending manual review
   */
  async getPendingReviewReceipts(userId: string): Promise<Receipt[]> {
    const { data, error } = await supabase
      .from('receipt_processing_queue')
      .select(`
        receipt_id,
        receipts(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'manual_review')

    if (error) throw error
    return data?.map(item => item.receipts).filter(Boolean) || []
  }

  /**
   * Search receipts by store name or description
   */
  async searchReceipts(
    userId: string,
    searchTerm: string,
    limit = 20
  ): Promise<Receipt[]> {
    // Search in extracted data using PostgreSQL JSON operators
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .or(`extracted_data->>store_name.ilike.%${searchTerm}%,extracted_data->>description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // Private helper methods
  private async uploadReceiptImage(imageUri: string, fileName: string): Promise<string> {
    const fileExt = fileName.split('.').pop()
    const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Convert image to base64 if needed
    let imageData: string | ArrayBuffer
    if (imageUri.startsWith('data:')) {
      const base64Data = imageUri.split(',')[1]
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      imageData = new Uint8Array(byteNumbers).buffer
    } else {
      // For file URIs, we'd need different handling based on platform
      throw new Error('File URI handling not implemented')
    }

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, imageData, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600'
      })

    if (error) throw error

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  private async deleteReceiptImage(imageUrl: string): Promise<void> {
    try {
      const path = imageUrl.split('/').pop()
      if (path) {
        await supabase.storage
          .from('receipts')
          .remove([path])
      }
    } catch (error) {
      console.warn('Failed to delete receipt image:', error)
    }
  }

  private async addToProcessingQueue(receiptId: string, userId: string): Promise<void> {
    await supabase
      .from('receipt_processing_queue')
      .insert({
        receipt_id: receiptId,
        user_id: userId,
        processing_method: 'groq_ai',
        status: 'queued'
      })
  }

  private async updateProcessingStatus(
    receiptId: string,
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'manual_review'
  ): Promise<void> {
    await supabase
      .from('receipt_processing_queue')
      .update({
        status,
        processing_completed_at: status === 'completed' ? new Date().toISOString() : undefined
      })
      .eq('receipt_id', receiptId)
  }

  private async processReceiptWithAI(receiptId: string, imageUrl: string): Promise<ReceiptData | null> {
    try {
      await this.updateProcessingStatus(receiptId, 'processing')
      const result = await groqService.extractReceiptData(imageUrl)
      return result
    } catch (error) {
      await this.updateProcessingStatus(receiptId, 'failed')
      throw error
    }
  }

  private async createExpenseFromReceipt(
    userId: string,
    receiptData: ReceiptData,
    receiptId: string,
    options: ReceiptUploadOptions
  ): Promise<any> {
    if (!receiptData.total_amount) {
      throw new Error('Cannot create expense: no amount extracted')
    }

    const expenseData = {
      user_id: userId,
      amount: receiptData.total_amount,
      category: options.category || receiptData.category || 'Other',
      description: options.description || receiptData.store_name || 'Receipt scan',
      receipt_url: receiptId, // Store receipt ID for reference
      wallet_id: options.walletId
    }

    return await expenseService.createExpense(expenseData)
  }

  private async checkFeatureLimit(userId: string, feature: string): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM

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
    const monthlyLimit = isFreeTier ? 30 : 999999 // Free: 30, Premium: unlimited

    if (usage && usage.usage_count >= monthlyLimit) {
      throw new Error(`Monthly limit of ${monthlyLimit} receipt scans exceeded. Upgrade to Premium for unlimited scans.`)
    }
  }

  private async updateFeatureUsage(userId: string, feature: string): Promise<void> {
    const currentMonth = new Date().toISOString().substring(0, 7)

    await supabase
      .from('feature_usage')
      .insert({
        user_id: userId,
        feature_name: feature,
        month_year: currentMonth,
        usage_count: 1
      })
      .on('conflict', { onConflict: 'user_id,feature_name,month_year' })
      .do('update', { usage_count: 'feature_usage.usage_count + 1' })
  }

  private async logProcessingAccuracy(
    receiptId: string,
    method: string,
    extractedData: ReceiptData | null
  ): Promise<void> {
    const confidenceScores = extractedData ? {
      store_name: extractedData.store_name ? 0.9 : 0.0,
      total_amount: extractedData.total_amount ? 0.95 : 0.0,
      date: extractedData.date ? 0.85 : 0.0,
      items: extractedData.items?.length ? 0.8 : 0.0
    } : {}

    await supabase
      .from('ocr_accuracy_logs')
      .insert({
        receipt_id: receiptId,
        processing_method: method,
        confidence_scores: confidenceScores
      })
  }

  private async logManualCorrections(
    receiptId: string,
    originalData: ReceiptData,
    correctedData: ReceiptData
  ): Promise<void> {
    const corrections: Record<string, any> = {}

    // Compare fields and log differences
    Object.keys(correctedData).forEach(key => {
      const originalValue = (originalData as any)[key]
      const correctedValue = (correctedData as any)[key]
      
      if (originalValue !== correctedValue) {
        corrections[key] = {
          extracted: originalValue,
          corrected: correctedValue
        }
      }
    })

    if (Object.keys(corrections).length > 0) {
      await supabase
        .from('ocr_accuracy_logs')
        .update({ manual_corrections: corrections })
        .eq('receipt_id', receiptId)
    }
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

  private async checkAchievements(userId: string): Promise<void> {
    try {
      await supabase.rpc('check_achievements', {
        p_user_id: userId
      })
    } catch (error) {
      console.warn('Failed to check achievements:', error)
    }
  }
}

export const receiptService = new ReceiptService()
export type { 
  Receipt, 
  ReceiptInsert, 
  ReceiptProcessingResult, 
  ReceiptUploadOptions, 
  ReceiptStats 
}