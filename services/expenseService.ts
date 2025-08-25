import { supabase } from '../lib/supabase'
import { Database } from '../types/database'

type Expense = Database['public']['Tables']['expenses']['Row']
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

interface ExpenseWithWallet extends Expense {
  wallet?: {
    name: string
    type: string
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
}

class ExpenseService {
  /**
   * Get all expenses for a user with optional filters
   */
  async getUserExpenses(
    userId: string, 
    filters: ExpenseFilters = {},
    limit = 50,
    offset = 0
  ): Promise<ExpenseWithWallet[]> {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        wallet:wallets(name, type)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.walletId) {
      query = query.eq('wallet_id', filters.walletId)
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    if (filters.minAmount !== undefined) {
      query = query.gte('amount', filters.minAmount)
    }

    if (filters.maxAmount !== undefined) {
      query = query.lte('amount', filters.maxAmount)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Create a new expense
   */
  async createExpense(expenseData: ExpenseInsert): Promise<Expense> {
    // Validate required fields
    if (!expenseData.amount || expenseData.amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }

    if (!expenseData.category) {
      throw new Error('Category is required')
    }

    if (!expenseData.user_id) {
      throw new Error('User ID is required')
    }

    // Get user's primary wallet if no wallet specified
    if (!expenseData.wallet_id) {
      const { data: primaryWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', expenseData.user_id)
        .eq('is_primary', true)
        .single()

      if (primaryWallet) {
        expenseData.wallet_id = primaryWallet.id
      }
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single()

    if (error) throw error

    // Update wallet balance if wallet specified
    if (data.wallet_id) {
      await this.updateWalletBalance(data.wallet_id, data.amount, 'subtract')
    }

    // Update user progress for gamification
    await this.updateUserProgress(data.user_id, 'expenses_created', 1)
    await this.updateUserProgress(data.user_id, 'total_expenses_amount', data.amount)

    // Check for achievements
    await this.checkAchievements(data.user_id)

    return data
  }

  /**
   * Update an expense
   */
  async updateExpense(expenseId: string, updates: ExpenseUpdate): Promise<Expense> {
    // Get current expense data for balance adjustments
    const { data: currentExpense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single()

    if (!currentExpense) throw new Error('Expense not found')

    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .select()
      .single()

    if (error) throw error

    // Handle wallet balance updates if amount or wallet changed
    if (updates.amount !== undefined || updates.wallet_id !== undefined) {
      // Revert old amount from old wallet
      if (currentExpense.wallet_id) {
        await this.updateWalletBalance(currentExpense.wallet_id, currentExpense.amount, 'add')
      }

      // Apply new amount to new wallet
      const newWalletId = updates.wallet_id || currentExpense.wallet_id
      const newAmount = updates.amount || currentExpense.amount

      if (newWalletId && newAmount > 0) {
        await this.updateWalletBalance(newWalletId, newAmount, 'subtract')
      }
    }

    return data
  }

  /**
   * Delete an expense
   */
  async deleteExpense(expenseId: string): Promise<void> {
    // Get expense data for balance restoration
    const { data: expense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single()

    if (!expense) throw new Error('Expense not found')

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) throw error

    // Restore wallet balance
    if (expense.wallet_id) {
      await this.updateWalletBalance(expense.wallet_id, expense.amount, 'add')
    }

    // Update user progress
    await this.updateUserProgress(expense.user_id, 'expenses_created', -1)
    await this.updateUserProgress(expense.user_id, 'total_expenses_amount', -expense.amount)
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(expenseId: string): Promise<ExpenseWithWallet | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        wallet:wallets(name, type)
      `)
      .eq('id', expenseId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  /**
   * Get expense statistics for analytics
   */
  async getExpenseStats(userId: string, days = 30): Promise<ExpenseStats> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    // Get expenses within date range
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount, category, created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())

    if (error) throw error

    const totalExpenses = expenses.length
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)

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

    // Monthly trend (last 12 months)
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

    return {
      totalExpenses,
      totalAmount,
      categoriesBreakdown,
      monthlyTrend
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
        wallet:wallets(name, type)
      `)
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })

    if (error) throw error

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    return {
      expenses: expenses || [],
      total
    }
  }

  /**
   * Get expenses by category
   */
  async getExpensesByCategory(
    userId: string,
    category: string,
    limit = 20
  ): Promise<ExpenseWithWallet[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        wallet:wallets(name, type)
      `)
      .eq('user_id', userId)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Search expenses by description
   */
  async searchExpenses(
    userId: string,
    searchTerm: string,
    limit = 20
  ): Promise<ExpenseWithWallet[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        wallet:wallets(name, type)
      `)
      .eq('user_id', userId)
      .ilike('description', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Get expense categories for user (from their expense history)
   */
  async getUserExpenseCategories(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('category')
      .eq('user_id', userId)

    if (error) throw error

    const categories = [...new Set(data?.map(exp => exp.category) || [])]
    return categories.sort()
  }

  /**
   * Bulk create expenses (for imports)
   */
  async bulkCreateExpenses(expenses: ExpenseInsert[]): Promise<Expense[]> {
    if (expenses.length === 0) return []

    // Validate all expenses
    expenses.forEach((exp, index) => {
      if (!exp.amount || exp.amount <= 0) {
        throw new Error(`Expense at index ${index}: Amount must be greater than 0`)
      }
      if (!exp.category) {
        throw new Error(`Expense at index ${index}: Category is required`)
      }
      if (!exp.user_id) {
        throw new Error(`Expense at index ${index}: User ID is required`)
      }
    })

    const { data, error } = await supabase
      .from('expenses')
      .insert(expenses)
      .select()

    if (error) throw error

    // Update wallet balances for each expense
    for (const expense of data) {
      if (expense.wallet_id) {
        await this.updateWalletBalance(expense.wallet_id, expense.amount, 'subtract')
      }
    }

    // Update user progress
    if (data.length > 0) {
      const userId = data[0].user_id
      const totalAmount = data.reduce((sum, exp) => sum + exp.amount, 0)
      
      await this.updateUserProgress(userId, 'expenses_created', data.length)
      await this.updateUserProgress(userId, 'total_expenses_amount', totalAmount)
      await this.checkAchievements(userId)
    }

    return data
  }

  /**
   * Get weekly expense summary
   */
  async getWeeklyExpenseSummary(userId: string): Promise<{
    thisWeek: number
    lastWeek: number
    change: number
    changePercentage: number
  }> {
    const now = new Date()
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - now.getDay()) // Start of this week
    thisWeekStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(thisWeekStart.getDate() - 7)

    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setMilliseconds(-1)

    // This week expenses
    const { data: thisWeekExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', thisWeekStart.toISOString())

    // Last week expenses
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

  // Private helper methods
  private async updateWalletBalance(walletId: string, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single()

    if (fetchError) return // Wallet might be deleted

    const newBalance = operation === 'add' 
      ? wallet.balance + amount 
      : wallet.balance - amount

    await supabase
      .from('wallets')
      .update({ balance: Math.max(0, newBalance) }) // Prevent negative balance
      .eq('id', walletId)
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

export const expenseService = new ExpenseService()
export type { 
  Expense, 
  ExpenseInsert, 
  ExpenseUpdate, 
  ExpenseWithWallet, 
  ExpenseFilters, 
  ExpenseStats 
}