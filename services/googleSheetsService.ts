import { supabase, Database } from '../lib/supabase'
import { google } from 'googleapis'

// Type definitions for Google Sheets sync
interface GoogleSheetsSync {
  id: string
  user_id: string
  spreadsheet_id: string
  spreadsheet_url: string
  sync_config: SyncConfig
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

interface SyncOperation {
  id: string
  user_id: string
  operation_type: 'sync' | 'export'
  status: 'pending' | 'running' | 'completed' | 'failed'
  records_processed: number
  records_failed: number
  errors: string[] | null
  started_at: string
  completed_at: string | null
  metadata: any
}

interface SheetTemplate {
  name: string
  headers: string[]
  sheetId?: string
}

interface SyncConfig {
  syncEnabled: boolean
  autoSync: boolean
  syncFrequency: 'manual' | 'daily' | 'weekly'
  includeExpenses: boolean
  includeOrders: boolean
  includeCustomers: boolean
}

interface SyncResult {
  success: boolean
  recordsProcessed: number
  recordsFailed: number
  errors?: string[]
  operationId?: string
}

interface GoogleAuthCredentials {
  accessToken: string
  refreshToken: string
  expiryDate?: number
}

class GoogleSheetsService {
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ]

  private readonly SHEET_TEMPLATES: Record<string, SheetTemplate> = {
    expenses: {
      name: 'Expenses',
      headers: [
        'Date', 'Amount', 'Category', 'Description', 'Payment Method', 
        'Wallet', 'Receipt URL', 'Created At'
      ]
    },
    orders: {
      name: 'Orders',
      headers: [
        'Date', 'Order ID', 'Customer Name', 'Customer Phone', 'Amount',
        'Status', 'Payment Method', 'Items', 'Notes', 'Created At'
      ]
    },
    customers: {
      name: 'Customers',
      headers: [
        'Name', 'Phone', 'Email', 'Total Spent', 'Order Count',
        'Last Order Date', 'Created At'
      ]
    },
    daily_summary: {
      name: 'Daily Summary',
      headers: [
        'Date', 'Total Revenue', 'Total Expenses', 'Net Profit',
        'Order Count', 'Customer Count', 'Top Category', 'Notes'
      ]
    }
  }

  /**
   * Initialize Google Sheets integration for user
   */
  async initializeGoogleSheetsIntegration(
    userId: string,
    authCredentials: GoogleAuthCredentials
  ): Promise<{
    spreadsheetId: string
    spreadsheetUrl: string
    success: boolean
    error?: string
  }> {
    try {
      // Create Google Sheets client
      const auth = new google.auth.OAuth2()
      auth.setCredentials({
        access_token: authCredentials.accessToken,
        refresh_token: authCredentials.refreshToken
      })

      const sheets = google.sheets({ version: 'v4', auth })

      // Create new spreadsheet
      const spreadsheetTitle = `PocketMoney_${new Date().toISOString().substring(0, 7)}`
      const { data: spreadsheet } = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: spreadsheetTitle
          },
          sheets: Object.values(this.SHEET_TEMPLATES).map((template, index) => ({
            properties: {
              title: template.name,
              sheetId: index
            }
          }))
        }
      })

      if (!spreadsheet.spreadsheetId) {
        throw new Error('Failed to create spreadsheet')
      }

      // Initialize sheet headers
      await this.setupSheetHeaders(sheets, spreadsheet.spreadsheetId)

      // Store sync configuration
      await this.storeSyncConfiguration(
        userId,
        spreadsheet.spreadsheetId,
        spreadsheetTitle,
        authCredentials
      )

      // Perform initial data export
      await this.performInitialSync(userId, spreadsheet.spreadsheetId)

      return {
        spreadsheetId: spreadsheet.spreadsheetId,
        spreadsheetUrl: spreadsheet.spreadsheetUrl || '',
        success: true
      }

    } catch (error) {
      console.error('Google Sheets integration error:', error)
      return {
        spreadsheetId: '',
        spreadsheetUrl: '',
        success: false,
        error: error instanceof Error ? error.message : 'Integration failed'
      }
    }
  }

  /**
   * Sync expenses to Google Sheets
   */
  async syncExpensesToSheets(
    userId: string,
    spreadsheetId?: string,
    dateFrom?: string
  ): Promise<SyncResult> {
    const operationId = await this.startSyncOperation(userId, 'export_expenses')

    try {
      // Get sync configuration
      const syncConfig = await this.getSyncConfiguration(userId, spreadsheetId)
      if (!syncConfig) {
        throw new Error('Google Sheets not configured')
      }

      // Get expenses data
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          *,
          wallet:wallets(name, type)
        `)
        .eq('user_id', userId)
        .gte('created_at', dateFrom || '2020-01-01')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Format data for sheets
      const expenseRows = expenses.map(expense => [
        new Date(expense.created_at).toLocaleDateString('en-GB'),
        expense.amount,
        expense.category,
        expense.description || '',
        'Manual', // Payment method
        expense.wallet?.name || 'Unknown',
        expense.receipt_url || '',
        new Date(expense.created_at).toISOString()
      ])

      // Update Google Sheets
      const recordsProcessed = await this.updateSheetData(
        syncConfig,
        'expenses',
        expenseRows
      )

      await this.completeSyncOperation(operationId, recordsProcessed, 0)

      return {
        success: true,
        recordsProcessed,
        recordsFailed: 0,
        operationId
      }

    } catch (error) {
      await this.failSyncOperation(operationId, error instanceof Error ? error.message : 'Sync failed')
      
      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 1,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        operationId
      }
    }
  }

  /**
   * Sync orders to Google Sheets
   */
  async syncOrdersToSheets(
    userId: string,
    spreadsheetId?: string,
    dateFrom?: string
  ): Promise<SyncResult> {
    const operationId = await this.startSyncOperation(userId, 'export_orders')

    try {
      const syncConfig = await this.getSyncConfiguration(userId, spreadsheetId)
      if (!syncConfig) {
        throw new Error('Google Sheets not configured')
      }

      // Get orders data with customer and items
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, phone),
          items:order_items(name, price, quantity)
        `)
        .eq('user_id', userId)
        .gte('created_at', dateFrom || '2020-01-01')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Format data for sheets
      const orderRows = orders.map(order => [
        new Date(order.created_at).toLocaleDateString('en-GB'),
        order.id,
        order.customer?.name || 'Walk-in Customer',
        order.customer?.phone || '',
        order.amount,
        order.status,
        order.payment_method || '',
        order.items?.map(item => `${item.quantity}x ${item.name}`).join('; ') || '',
        order.notes || '',
        new Date(order.created_at).toISOString()
      ])

      const recordsProcessed = await this.updateSheetData(
        syncConfig,
        'orders',
        orderRows
      )

      await this.completeSyncOperation(operationId, recordsProcessed, 0)

      return {
        success: true,
        recordsProcessed,
        recordsFailed: 0,
        operationId
      }

    } catch (error) {
      await this.failSyncOperation(operationId, error instanceof Error ? error.message : 'Sync failed')
      
      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 1,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        operationId
      }
    }
  }

  /**
   * Sync customers to Google Sheets
   */
  async syncCustomersToSheets(
    userId: string,
    spreadsheetId?: string
  ): Promise<SyncResult> {
    const operationId = await this.startSyncOperation(userId, 'export_customers')

    try {
      const syncConfig = await this.getSyncConfiguration(userId, spreadsheetId)
      if (!syncConfig) {
        throw new Error('Google Sheets not configured')
      }

      // Get customers with order count
      const { data: customers, error } = await supabase
        .rpc('get_customers_with_stats', { p_user_id: userId })

      if (error) throw error

      // Format data for sheets
      const customerRows = customers.map((customer: any) => [
        customer.name,
        customer.phone || '',
        customer.email || '',
        customer.total_spent || 0,
        customer.order_count || 0,
        customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString('en-GB') : '',
        new Date(customer.created_at).toISOString()
      ])

      const recordsProcessed = await this.updateSheetData(
        syncConfig,
        'customers',
        customerRows
      )

      await this.completeSyncOperation(operationId, recordsProcessed, 0)

      return {
        success: true,
        recordsProcessed,
        recordsFailed: 0,
        operationId
      }

    } catch (error) {
      await this.failSyncOperation(operationId, error instanceof Error ? error.message : 'Sync failed')
      
      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 1,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        operationId
      }
    }
  }

  /**
   * Export daily summary to Google Sheets
   */
  async syncDailySummaryToSheets(
    userId: string,
    targetDate?: string,
    spreadsheetId?: string
  ): Promise<SyncResult> {
    const operationId = await this.startSyncOperation(userId, 'export_daily_summary')

    try {
      const syncConfig = await this.getSyncConfiguration(userId, spreadsheetId)
      if (!syncConfig) {
        throw new Error('Google Sheets not configured')
      }

      const date = targetDate || new Date().toISOString().split('T')[0]

      // Get daily statistics
      const dailyStats = await this.getDailyStats(userId, date)

      // Format data for sheets
      const summaryRow = [
        new Date(date).toLocaleDateString('en-GB'),
        dailyStats.totalRevenue,
        dailyStats.totalExpenses,
        dailyStats.netProfit,
        dailyStats.orderCount,
        dailyStats.customerCount,
        dailyStats.topCategory || 'N/A',
        dailyStats.notes || ''
      ]

      const recordsProcessed = await this.updateSheetData(
        syncConfig,
        'daily_summary',
        [summaryRow]
      )

      await this.completeSyncOperation(operationId, recordsProcessed, 0)

      return {
        success: true,
        recordsProcessed,
        recordsFailed: 0,
        operationId
      }

    } catch (error) {
      await this.failSyncOperation(operationId, error instanceof Error ? error.message : 'Sync failed')
      
      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 1,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        operationId
      }
    }
  }

  /**
   * Perform comprehensive sync (all data)
   */
  async performFullSync(userId: string, spreadsheetId?: string): Promise<{
    expenses: SyncResult
    orders: SyncResult
    customers: SyncResult
    dailySummary: SyncResult
    overallSuccess: boolean
  }> {
    const results = {
      expenses: await this.syncExpensesToSheets(userId, spreadsheetId),
      orders: await this.syncOrdersToSheets(userId, spreadsheetId),
      customers: await this.syncCustomersToSheets(userId, spreadsheetId),
      dailySummary: await this.syncDailySummaryToSheets(userId, undefined, spreadsheetId),
      overallSuccess: true
    }

    results.overallSuccess = Object.values(results)
      .filter(result => typeof result === 'object' && 'success' in result)
      .every(result => result.success)

    return results
  }

  /**
   * Get sync status for user
   */
  async getSyncStatus(userId: string): Promise<{
    isConfigured: boolean
    lastSync?: string
    syncEnabled: boolean
    spreadsheetId?: string
    spreadsheetName?: string
    recentOperations: SyncOperation[]
  }> {
    const { data: syncConfig } = await supabase
      .from('google_sheets_sync')
      .select('*')
      .eq('user_id', userId)
      .single()

    const { data: recentOperations } = await supabase
      .from('sync_operations')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(10)

    return {
      isConfigured: !!syncConfig,
      lastSync: syncConfig?.last_sync_at || undefined,
      syncEnabled: syncConfig?.sync_enabled || false,
      spreadsheetId: syncConfig?.spreadsheet_id || undefined,
      spreadsheetName: syncConfig?.spreadsheet_name || undefined,
      recentOperations: recentOperations || []
    }
  }

  /**
   * Update sync configuration
   */
  async updateSyncConfig(
    userId: string,
    config: Partial<SyncConfig>
  ): Promise<GoogleSheetsSync> {
    const { data, error } = await supabase
      .from('google_sheets_sync')
      .update({
        sync_enabled: config.syncEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Disconnect Google Sheets integration
   */
  async disconnectGoogleSheets(userId: string): Promise<void> {
    const { error } = await supabase
      .from('google_sheets_sync')
      .update({
        sync_enabled: false,
        sync_status: 'disconnected',
        oauth_refresh_token: null
      })
      .eq('user_id', userId)

    if (error) throw error
  }

  // Private helper methods
  private async setupSheetHeaders(sheets: any, spreadsheetId: string): Promise<void> {
    const requests = Object.entries(this.SHEET_TEMPLATES).map(([key, template], index) => ({
      updateCells: {
        range: {
          sheetId: index,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: template.headers.length
        },
        rows: [{
          values: template.headers.map(header => ({
            userEnteredValue: { stringValue: header },
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
            }
          }))
        }],
        fields: 'userEnteredValue,userEnteredFormat'
      }
    }))

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    })
  }

  private async storeSyncConfiguration(
    userId: string,
    spreadsheetId: string,
    spreadsheetName: string,
    authCredentials: GoogleAuthCredentials
  ): Promise<void> {
    await supabase
      .from('google_sheets_sync')
      .insert({
        user_id: userId,
        spreadsheet_id: spreadsheetId,
        spreadsheet_name: spreadsheetName,
        sync_enabled: true,
        oauth_refresh_token: authCredentials.refreshToken, // Should be encrypted in production
        oauth_expires_at: authCredentials.expiryDate ? 
          new Date(authCredentials.expiryDate).toISOString() : undefined
      })
  }

  private async performInitialSync(userId: string, spreadsheetId: string): Promise<void> {
    // Sync last 30 days of data initially
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    await Promise.all([
      this.syncExpensesToSheets(userId, spreadsheetId, thirtyDaysAgo.toISOString()),
      this.syncOrdersToSheets(userId, spreadsheetId, thirtyDaysAgo.toISOString()),
      this.syncCustomersToSheets(userId, spreadsheetId)
    ])
  }

  private async getSyncConfiguration(userId: string, spreadsheetId?: string): Promise<any> {
    let query = supabase
      .from('google_sheets_sync')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_enabled', true)

    if (spreadsheetId) {
      query = query.eq('spreadsheet_id', spreadsheetId)
    }

    const { data, error } = await query.single()
    if (error) throw error
    return data
  }

  private async updateSheetData(
    syncConfig: any,
    sheetName: string,
    rows: any[][]
  ): Promise<number> {
    if (rows.length === 0) return 0

    // Create Google Sheets client
    const auth = new googleapis.auth.OAuth2()
    auth.setCredentials({
      refresh_token: syncConfig.oauth_refresh_token
    })

    const sheets = googleapis.sheets({ version: 'v4', auth })

    // Clear existing data (except headers)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: syncConfig.spreadsheet_id,
      range: `${sheetName}!A2:ZZ`
    })

    // Insert new data
    await sheets.spreadsheets.values.update({
      spreadsheetId: syncConfig.spreadsheet_id,
      range: `${sheetName}!A2`,
      valueInputOption: 'RAW',
      requestBody: {
        values: rows
      }
    })

    // Update last sync time
    await supabase
      .from('google_sheets_sync')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', syncConfig.id)

    return rows.length
  }

  private async getDailyStats(userId: string, date: string): Promise<{
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    orderCount: number
    customerCount: number
    topCategory?: string
    notes?: string
  }> {
    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59Z`

    // Get daily revenue and orders
    const { data: orders } = await supabase
      .from('orders')
      .select('amount, customer_id')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    // Get daily expenses with categories
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    const totalRevenue = orders?.reduce((sum, order) => sum + order.amount, 0) || 0
    const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0
    const netProfit = totalRevenue - totalExpenses
    const orderCount = orders?.length || 0
    const customerCount = new Set(orders?.map(o => o.customer_id).filter(Boolean)).size

    // Find top expense category
    const categoryTotals: Record<string, number> = {}
    expenses?.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount
    })

    const topCategory = Object.keys(categoryTotals).length > 0 
      ? Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0][0]
      : undefined

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      orderCount,
      customerCount,
      topCategory
    }
  }

  private async startSyncOperation(userId: string, operation: string): Promise<string> {
    const { data, error } = await supabase
      .from('sync_operations')
      .insert({
        user_id: userId,
        sync_type: 'manual',
        operation,
        status: 'started'
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  private async completeSyncOperation(
    operationId: string,
    recordsProcessed: number,
    recordsFailed: number
  ): Promise<void> {
    await supabase
      .from('sync_operations')
      .update({
        status: 'completed',
        records_processed: recordsProcessed,
        records_failed: recordsFailed,
        completed_at: new Date().toISOString()
      })
      .eq('id', operationId)
  }

  private async failSyncOperation(operationId: string, error: string): Promise<void> {
    await supabase
      .from('sync_operations')
      .update({
        status: 'failed',
        error_details: { error },
        completed_at: new Date().toISOString()
      })
      .eq('id', operationId)
  }
}

export const googleSheetsService = new GoogleSheetsService()
export type {
  GoogleSheetsSync,
  SyncOperation,
  SyncConfig,
  SyncResult,
  GoogleAuthCredentials
}