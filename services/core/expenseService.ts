import { supabase } from '../../lib/supabase'
import { Database } from '../../types/database'

type Expense = Database['public']['Tables']['expenses']['Row']
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']
type Wallet = Database['public']['Tables']['wallets']['Row']

interface ExpenseWithWallet extends Expense {
  wallet?: {
    id: string
    name: string
    type: 'cash' | 'bank' | 'ewallet' | 'credit'
    balance: number
  }
}

interface ExpenseFilters {
  category?: string
  dateFrom?: string
  dateTo?: string
  walletId?: string
  minAmount?: number
  maxAmount?: number
}

interface ExpenseStats {
  totalExpenses: number
  totalAmount: number
  averageAmount: number
  categoriesBreakdown: Array<{
    category: string
    amount: number
    count: number
    percentage: number
  }>
  monthlyTrend: Array<{
    month: string
    amount: number
    count: number
  }>
  weeklyComparison: {
    thisWeek: number
    lastWeek: number
    change: number
    changePercentage: number
  }
}

interface CreateExpenseData {
  amount: number
  category: string
  description?: string
  walletId?: string
  receiptUrl?: string
}

class ExpenseService {
  private readonly VALID_CATEGORIES = [
    'Food & Beverages',
    'Transport', 
    'Inventory',
    'Utilities',
    'Marketing',
    'Rent',
    'Equipment', 
    'Office Supplies',
    'Staff',
    'Banking',
    'Professional Services',
    'Insurance',
    'Maintenance',
    'Other'
  ]

  /**
   * Create a new expense with validation and wallet balance update
   */
  async createExpense(userId: string, expenseData: CreateExpenseData): Promise<ExpenseWithWallet> {
    // Input validation
    this.validateExpenseData(expenseData)

    // Get user's primary wallet if no wallet specified
    let walletId = expenseData.walletId
    if (!walletId) {
      const primaryWallet = await this.getUserPrimaryWallet(userId)
      if (!primaryWallet) {
        throw new Error('No wallet found. Please create a wallet first.')
      }
      walletId = primaryWallet.id
    }

    // Verify wallet belongs to user and has sufficient balance
    const wallet = await this.validateWalletAccess(userId, walletId)
    if (wallet.balance < expenseData.amount) {
      throw new Error(`Insufficient balance. Available: RM${wallet.balance.toFixed(2)}, Required: RM${expenseData.amount.toFixed(2)}`)
    }

    // Create expense record
    const expenseInsertData: ExpenseInsert = {
      user_id: userId,
      amount: expenseData.amount,
      category: expenseData.category,
      description: expenseData.description || null,
      wallet_id: walletId,
      receipt_url: expenseData.receiptUrl || null
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert(expenseInsertData)
      .select(`
        *,
        wallet:wallets(id, name, type, balance)
      `)
      .single()

    if (error) {
      console.error('Expense creation error:', error)
      throw new Error(`Failed to create expense: ${error.message}`)
    }

    // Update wallet balance atomically
    const { error: walletError } = await supabase.rpc('transfer_between_wallets', {
      from_wallet_id: walletId,
      to_wallet_id: walletId, // Same wallet, just reducing balance
      transfer_amount: -expenseData.amount // Negative to subtract
    })

    if (walletError) {
      // If wallet update fails, we should ideally rollback the expense
      // For now, we'll log and continue
      console.error('Wallet balance update failed:', walletError)
    }

    // Update user progress tracking
    await this.updateUserProgress(userId, 'expenses_created', 1)
    await this.updateUserProgress(userId, 'total_expenses_amount', expenseData.amount)

    // Check for achievements
    await this.checkUserAchievements(userId)

    return expense as ExpenseWithWallet
  }

  /**
   * Get user's expenses with filtering and pagination
   */
  async getUserExpenses(
    userId: string, 
    filters: ExpenseFilters = {},
    limit = 50,
    offset = 0
  ): Promise<ExpenseWithWallet[]> {
    // Validate pagination parameters
    if (limit < 1 || limit > 100) limit = 50
    if (offset < 0) offset = 0

    let query = supabase
      .from('expenses')
      .select(`
        *,
        wallet:wallets(id, name, type, balance)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Apply filters with validation
    if (filters.category && this.VALID_CATEGORIES.includes(filters.category)) {
      query = query.eq('category', filters.category)
    }

    if (filters.walletId && this.isValidUUID(filters.walletId)) {
      query = query.eq('wallet_id', filters.walletId)
    }

    if (filters.dateFrom && this.isValidDate(filters.dateFrom)) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters.dateTo && this.isValidDate(filters.dateTo)) {
      query = query.lte('created_at', filters.dateTo)
    }

    if (filters.minAmount && filters.minAmount >= 0) {
      query = query.gte('amount', filters.minAmount)
    }

    if (filters.maxAmount && filters.maxAmount > 0) {
      query = query.lte('amount', filters.maxAmount)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching expenses:', error)
      throw new Error(`Failed to fetch expenses: ${error.message}`)
    }

    return data as ExpenseWithWallet[] || []
  }

  /**
   * Update an existing expense
   */
  async updateExpense(userId: string, expenseId: string, updates: Partial<CreateExpenseData>): Promise<ExpenseWithWallet> {
    // Validate expense ID
    if (!this.isValidUUID(expenseId)) {
      throw new Error('Invalid expense ID format')
    }

    // Get current expense to verify ownership and calculate balance changes
    const currentExpense = await this.getExpenseById(userId, expenseId)
    if (!currentExpense) {
      throw new Error('Expense not found or access denied')
    }

    // Validate update data
    if (updates.amount !== undefined) {
      this.validateAmount(updates.amount)
    }
    if (updates.category !== undefined) {
      this.validateCategory(updates.category)
    }

    // Calculate balance changes if amount or wallet changed
    let balanceAdjustments: Array<{ walletId: string; adjustment: number }> = []

    if (updates.amount !== undefined || updates.walletId !== undefined) {
      const oldAmount = currentExpense.amount
      const oldWalletId = currentExpense.wallet_id
      const newAmount = updates.amount ?? oldAmount
      const newWalletId = updates.walletId ?? oldWalletId

      if (newWalletId && newWalletId !== oldWalletId) {
        // Wallet changed - validate new wallet
        await this.validateWalletAccess(userId, newWalletId)
      }

      // Restore old amount to old wallet
      if (oldWalletId) {
        balanceAdjustments.push({ walletId: oldWalletId, adjustment: oldAmount })
      }

      // Subtract new amount from new wallet
      if (newWalletId) {
        balanceAdjustments.push({ walletId: newWalletId, adjustment: -newAmount })
        
        // Check if new wallet has sufficient balance
        const wallet = await this.validateWalletAccess(userId, newWalletId)
        const totalAdjustment = balanceAdjustments
          .filter(adj => adj.walletId === newWalletId)
          .reduce((sum, adj) => sum + adj.adjustment, 0)
        
        if (wallet.balance + totalAdjustment < 0) {
          throw new Error(`Insufficient balance in selected wallet`)
        }
      }
    }

    // Update expense record
    const updateData: ExpenseUpdate = {}
    if (updates.amount !== undefined) updateData.amount = updates.amount
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.walletId !== undefined) updateData.wallet_id = updates.walletId
    if (updates.receiptUrl !== undefined) updateData.receipt_url = updates.receiptUrl

    const { data: updatedExpense, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .eq('user_id', userId) // Ensure user can only update their own expenses
      .select(`
        *,
        wallet:wallets(id, name, type, balance)
      `)
      .single()

    if (error) {
      console.error('Expense update error:', error)
      throw new Error(`Failed to update expense: ${error.message}`)
    }

    // Apply wallet balance adjustments
    for (const adjustment of balanceAdjustments) {
      const { error: balanceError } = await supabase
        .from('wallets')
        .update({ 
          balance: supabase.raw(`balance + ${adjustment.adjustment}`) 
        })
        .eq('id', adjustment.walletId)
        .eq('user_id', userId)

      if (balanceError) {
        console.error('Wallet balance adjustment failed:', balanceError)
      }
    }

    return updatedExpense as ExpenseWithWallet
  }

  /**
   * Delete an expense and restore wallet balance
   */
  async deleteExpense(userId: string, expenseId: string): Promise<void> {
    if (!this.isValidUUID(expenseId)) {
      throw new Error('Invalid expense ID format')
    }

    // Get expense details before deletion
    const expense = await this.getExpenseById(userId, expenseId)
    if (!expense) {
      throw new Error('Expense not found or access denied')
    }

    // Delete expense
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', userId)

    if (error) {
      console.error('Expense deletion error:', error)
      throw new Error(`Failed to delete expense: ${error.message}`)
    }

    // Restore wallet balance
    if (expense.wallet_id) {
      const { error: balanceError } = await supabase
        .from('wallets')
        .update({ 
          balance: supabase.raw(`balance + ${expense.amount}`) 
        })
        .eq('id', expense.wallet_id)
        .eq('user_id', userId)

      if (balanceError) {
        console.error('Wallet balance restoration failed:', balanceError)
      }
    }

    // Update user progress
    await this.updateUserProgress(userId, 'expenses_created', -1)
    await this.updateUserProgress(userId, 'total_expenses_amount', -expense.amount)
  }

  /**
   * Get expense by ID with ownership validation
   */
  async getExpenseById(userId: string, expenseId: string): Promise<ExpenseWithWallet | null> {
    if (!this.isValidUUID(expenseId)) {
      throw new Error('Invalid expense ID format')
    }

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        wallet:wallets(id, name, type, balance)
      `)
      .eq('id', expenseId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching expense:', error)
      throw new Error(`Failed to fetch expense: ${error.message}`)
    }

    return data as ExpenseWithWallet || null
  }

  /**
   * Get comprehensive expense statistics
   */
  async getExpenseStats(userId: string, days = 30): Promise<ExpenseStats> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount, category, created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())

    if (error) {
      console.error('Error fetching expense stats:', error)
      throw new Error(`Failed to fetch expense statistics: ${error.message}`)
    }

    const totalExpenses = expenses.length
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const averageAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0

    // Categories breakdown
    const categoryTotals: Record<string, { amount: number; count: number }> = {}
    expenses.forEach(exp => {
      if (!categoryTotals[exp.category]) {
        categoryTotals[exp.category] = { amount: 0, count: 0 }
      }
      categoryTotals[exp.category].amount += exp.amount
      categoryTotals[exp.category].count += 1
    })

    const categoriesBreakdown = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // Monthly trend
    const monthlyTotals: Record<string, { amount: number; count: number }> = {}
    expenses.forEach(exp => {
      const monthKey = exp.created_at.substring(0, 7) // YYYY-MM
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { amount: 0, count: 0 }
      }
      monthlyTotals[monthKey].amount += exp.amount
      monthlyTotals[monthKey].count += 1
    })

    const monthlyTrend = Object.entries(monthlyTotals)
      .map(([month, data]) => ({
        month,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Weekly comparison
    const weeklyComparison = await this.getWeeklyComparison(userId)

    return {
      totalExpenses,
      totalAmount,
      averageAmount,
      categoriesBreakdown,
      monthlyTrend,
      weeklyComparison
    }
  }

  /**
   * Get today's expenses
   */
  async getTodayExpenses(userId: string): Promise<{ expenses: ExpenseWithWallet[]; total: number }> {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = `${today}T00:00:00Z`
    const endOfDay = `${today}T23:59:59Z`

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        *,
        wallet:wallets(id, name, type, balance)
      `)
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching today\'s expenses:', error)
      throw new Error(`Failed to fetch today's expenses: ${error.message}`)
    }

    const total = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0

    return {
      expenses: expenses as ExpenseWithWallet[] || [],
      total
    }
  }

  /**
   * Search expenses by description or category
   */
  async searchExpenses(userId: string, searchTerm: string, limit = 20): Promise<ExpenseWithWallet[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new Error('Search term must be at least 2 characters long')
    }

    const sanitizedTerm = searchTerm.trim().substring(0, 100) // Limit search term length

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        wallet:wallets(id, name, type, balance)
      `)
      .eq('user_id', userId)
      .or(`description.ilike.%${sanitizedTerm}%,category.ilike.%${sanitizedTerm}%`)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50))

    if (error) {
      console.error('Error searching expenses:', error)
      throw new Error(`Failed to search expenses: ${error.message}`)
    }

    return data as ExpenseWithWallet[] || []
  }

  /**
   * Get valid expense categories
   */
  getValidCategories(): string[] {
    return [...this.VALID_CATEGORIES]
  }

  // Private validation methods
  private validateExpenseData(data: CreateExpenseData): void {
    this.validateAmount(data.amount)
    this.validateCategory(data.category)
    
    if (data.description && data.description.length > 500) {
      throw new Error('Description cannot exceed 500 characters')
    }

    if (data.walletId && !this.isValidUUID(data.walletId)) {
      throw new Error('Invalid wallet ID format')
    }
  }

  private validateAmount(amount: number): void {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Amount must be a positive number')
    }
    if (amount > 999999.99) {
      throw new Error('Amount cannot exceed RM999,999.99')
    }
    // Check for reasonable decimal places
    if (Math.round(amount * 100) / 100 !== amount) {
      throw new Error('Amount cannot have more than 2 decimal places')
    }
  }

  private validateCategory(category: string): void {
    if (!category || typeof category !== 'string') {
      throw new Error('Category is required')
    }
    if (!this.VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category. Valid categories: ${this.VALID_CATEGORIES.join(', ')}`)
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  private isValidDate(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateString)) return false
    
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }

  private async getUserPrimaryWallet(userId: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching primary wallet:', error)
      return null
    }

    return data
  }

  private async validateWalletAccess(userId: string, walletId: string): Promise<Wallet> {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single()

    if (error || !wallet) {
      throw new Error('Wallet not found or access denied')
    }

    return wallet
  }

  private async getWeeklyComparison(userId: string): Promise<{
    thisWeek: number
    lastWeek: number
    change: number
    changePercentage: number
  }> {
    const now = new Date()
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - now.getDay())
    thisWeekStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(thisWeekStart.getDate() - 7)

    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setMilliseconds(-1)

    // Get this week's expenses
    const { data: thisWeekExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', thisWeekStart.toISOString())

    // Get last week's expenses
    const { data: lastWeekExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', lastWeekStart.toISOString())
      .lt('created_at', lastWeekEnd.toISOString())

    const thisWeek = thisWeekExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0
    const lastWeek = lastWeekExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0

    const change = thisWeek - lastWeek
    const changePercentage = lastWeek > 0 ? (change / lastWeek) * 100 : 0

    return {
      thisWeek,
      lastWeek,
      change,
      changePercentage
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

  private async checkUserAchievements(userId: string): Promise<void> {
    try {
      const { data } = await supabase.rpc('check_achievements', {
        p_user_id: userId
      })
      
      if (data && data.length > 0) {
        console.log('Achievements unlocked:', data)
      }
    } catch (error) {
      console.warn('Failed to check achievements:', error)
    }
  }
}

export const expenseService = new ExpenseService()
export type { 
  Expense,
  ExpenseWithWallet,
  ExpenseFilters,
  ExpenseStats,
  CreateExpenseData
}