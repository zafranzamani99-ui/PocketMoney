import { supabase } from '../lib/supabase'
import { Database } from '../types/database'

type Wallet = Database['public']['Tables']['wallets']['Row']
type WalletInsert = Database['public']['Tables']['wallets']['Insert']
type WalletUpdate = Database['public']['Tables']['wallets']['Update']

class WalletService {
  async getUserWallets(userId: string): Promise<Wallet[]> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getPrimaryWallet(userId: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async createWallet(walletData: WalletInsert): Promise<Wallet> {
    // If this is set as primary, make all other wallets non-primary
    if (walletData.is_primary) {
      await this.clearPrimaryWallets(walletData.user_id)
    }

    const { data, error } = await supabase
      .from('wallets')
      .insert(walletData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateWallet(walletId: string, updates: WalletUpdate): Promise<Wallet> {
    // If setting as primary, clear other primary wallets
    if (updates.is_primary) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('user_id')
        .eq('id', walletId)
        .single()

      if (wallet) {
        await this.clearPrimaryWallets(wallet.user_id)
      }
    }

    const { data, error } = await supabase
      .from('wallets')
      .update(updates)
      .eq('id', walletId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteWallet(walletId: string): Promise<void> {
    // Check if this is the primary wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('user_id, is_primary')
      .eq('id', walletId)
      .single()

    if (!wallet) throw new Error('Wallet not found')

    // Don't allow deletion of the only wallet
    const { data: walletCount } = await supabase
      .from('wallets')
      .select('id', { count: 'exact' })
      .eq('user_id', wallet.user_id)

    if (walletCount && walletCount.length <= 1) {
      throw new Error('Cannot delete the only wallet')
    }

    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('id', walletId)

    if (error) throw error

    // If we deleted the primary wallet, make another one primary
    if (wallet.is_primary) {
      const { data: remainingWallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', wallet.user_id)
        .limit(1)

      if (remainingWallets && remainingWallets.length > 0) {
        await this.updateWallet(remainingWallets[0].id, { is_primary: true })
      }
    }
  }

  async updateWalletBalance(walletId: string, amount: number, operation: 'add' | 'subtract'): Promise<Wallet> {
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single()

    if (fetchError) throw fetchError

    const newBalance = operation === 'add' 
      ? wallet.balance + amount 
      : wallet.balance - amount

    if (newBalance < 0) {
      throw new Error('Insufficient balance')
    }

    const { data, error } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', walletId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async transferBetweenWallets(fromWalletId: string, toWalletId: string, amount: number): Promise<void> {
    if (amount <= 0) throw new Error('Transfer amount must be positive')

    // Start a transaction by using RPC function
    const { error } = await supabase.rpc('transfer_between_wallets', {
      from_wallet_id: fromWalletId,
      to_wallet_id: toWalletId,
      transfer_amount: amount,
    })

    if (error) throw error
  }

  async getWalletBalance(walletId: string): Promise<number> {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single()

    if (error) throw error
    return data.balance
  }

  async getTotalBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)

    if (error) throw error
    return data.reduce((total, wallet) => total + wallet.balance, 0)
  }

  private async clearPrimaryWallets(userId: string): Promise<void> {
    await supabase
      .from('wallets')
      .update({ is_primary: false })
      .eq('user_id', userId)
  }

  // Get wallet transaction history
  async getWalletTransactions(walletId: string, limit = 50) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // Calculate daily spending by wallet
  async getDailySpending(walletId: string, date: string): Promise<number> {
    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59Z`

    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('wallet_id', walletId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    if (error) throw error
    return data.reduce((total, expense) => total + expense.amount, 0)
  }

  // Get spending by category for a wallet
  async getSpendingByCategory(walletId: string, days = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data, error } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('wallet_id', walletId)
      .gte('created_at', cutoffDate.toISOString())

    if (error) throw error

    const categoryTotals: Record<string, number> = {}
    data.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount
    })

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }
}

export const walletService = new WalletService()
export type { Wallet, WalletInsert, WalletUpdate }