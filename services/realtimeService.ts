import { supabase } from '../lib/supabase'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { Database } from '../types/database'

type Tables = Database['public']['Tables']
type Expense = Tables['expenses']['Row']
type Order = Tables['orders']['Row']
type Customer = Tables['customers']['Row']
type Wallet = Tables['wallets']['Row']
type Receipt = Tables['receipts']['Row']

interface RealtimeSubscription {
  channel: RealtimeChannel
  callback: (payload: RealtimePostgresChangesPayload<any>) => void
  active: boolean
}

interface SyncStatus {
  isOnline: boolean
  lastSync: string | null
  pendingChanges: number
  syncErrors: any[]
}

type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE'
type TableName = 'expenses' | 'orders' | 'customers' | 'wallets' | 'receipts' | 'whatsapp_extractions'

interface OfflineChange {
  id: string
  table: TableName
  type: ChangeType
  data: any
  timestamp: string
  userId: string
  synced: boolean
  retryCount: number
}

class RealtimeService {
  private subscriptions: Map<string, RealtimeSubscription> = new Map()
  private userId: string | null = null
  private isOnline: boolean = true
  private offlineChanges: OfflineChange[] = []
  private syncQueue: OfflineChange[] = []
  private syncInProgress: boolean = false

  /**
   * Initialize realtime service for a user
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId
    await this.loadOfflineChanges()
    this.setupNetworkListener()
    
    // Start sync process if online
    if (this.isOnline) {
      await this.processSyncQueue()
    }
  }

  /**
   * Subscribe to expense changes
   */
  subscribeToExpenses(
    userId: string,
    callback: (payload: RealtimePostgresChangesPayload<Expense>) => void
  ): string {
    const subscriptionId = `expenses_${userId}_${Date.now()}`
    
    const channel = supabase
      .channel(`expenses:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Expense change received:', payload)
          callback(payload as RealtimePostgresChangesPayload<Expense>)
          this.handleRealtimeChange('expenses', payload)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionId, {
      channel,
      callback,
      active: true
    })

    return subscriptionId
  }

  /**
   * Subscribe to order changes
   */
  subscribeToOrders(
    userId: string,
    callback: (payload: RealtimePostgresChangesPayload<Order>) => void
  ): string {
    const subscriptionId = `orders_${userId}_${Date.now()}`
    
    const channel = supabase
      .channel(`orders:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Order change received:', payload)
          callback(payload as RealtimePostgresChangesPayload<Order>)
          this.handleRealtimeChange('orders', payload)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionId, {
      channel,
      callback,
      active: true
    })

    return subscriptionId
  }

  /**
   * Subscribe to customer changes
   */
  subscribeToCustomers(
    userId: string,
    callback: (payload: RealtimePostgresChangesPayload<Customer>) => void
  ): string {
    const subscriptionId = `customers_${userId}_${Date.now()}`
    
    const channel = supabase
      .channel(`customers:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Customer change received:', payload)
          callback(payload as RealtimePostgresChangesPayload<Customer>)
          this.handleRealtimeChange('customers', payload)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionId, {
      channel,
      callback,
      active: true
    })

    return subscriptionId
  }

  /**
   * Subscribe to wallet balance updates
   */
  subscribeToWalletUpdates(
    userId: string,
    callback: (payload: RealtimePostgresChangesPayload<Wallet>) => void
  ): string {
    const subscriptionId = `wallets_${userId}_${Date.now()}`
    
    const channel = supabase
      .channel(`wallets:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Wallet balance update received:', payload)
          callback(payload as RealtimePostgresChangesPayload<Wallet>)
          this.handleRealtimeChange('wallets', payload)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionId, {
      channel,
      callback,
      active: true
    })

    return subscriptionId
  }

  /**
   * Subscribe to receipt processing updates
   */
  subscribeToReceiptUpdates(
    userId: string,
    callback: (payload: RealtimePostgresChangesPayload<Receipt>) => void
  ): string {
    const subscriptionId = `receipts_${userId}_${Date.now()}`
    
    const channel = supabase
      .channel(`receipts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'receipts',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Receipt processing update received:', payload)
          callback(payload as RealtimePostgresChangesPayload<Receipt>)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionId, {
      channel,
      callback,
      active: true
    })

    return subscriptionId
  }

  /**
   * Subscribe to WhatsApp extraction updates
   */
  subscribeToWhatsAppExtractions(
    userId: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): string {
    const subscriptionId = `whatsapp_${userId}_${Date.now()}`
    
    const channel = supabase
      .channel(`whatsapp_extractions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_extractions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('WhatsApp extraction update received:', payload)
          callback(payload)
          this.handleRealtimeChange('whatsapp_extractions', payload)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionId, {
      channel,
      callback,
      active: true
    })

    return subscriptionId
  }

  /**
   * Unsubscribe from realtime updates
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.channel.unsubscribe()
      subscription.active = false
      this.subscriptions.delete(subscriptionId)
      return true
    }
    return false
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription, id) => {
      subscription.channel.unsubscribe()
    })
    this.subscriptions.clear()
  }

  /**
   * Queue offline change for later sync
   */
  async queueOfflineChange(
    table: TableName,
    type: ChangeType,
    data: any,
    userId: string
  ): Promise<void> {
    const change: OfflineChange = {
      id: `${table}_${type}_${Date.now()}_${Math.random()}`,
      table,
      type,
      data,
      timestamp: new Date().toISOString(),
      userId,
      synced: false,
      retryCount: 0
    }

    this.offlineChanges.push(change)
    this.syncQueue.push(change)
    
    // Store in local storage for persistence
    await this.saveOfflineChanges()

    // Try to sync if online
    if (this.isOnline && !this.syncInProgress) {
      await this.processSyncQueue()
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSync: this.getLastSyncTime(),
      pendingChanges: this.offlineChanges.filter(c => !c.synced).length,
      syncErrors: this.getSyncErrors()
    }
  }

  /**
   * Force sync all pending changes
   */
  async forcSync(): Promise<{
    success: boolean
    syncedCount: number
    failedCount: number
    errors: any[]
  }> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ['Sync already in progress']
      }
    }

    return await this.processSyncQueue()
  }

  /**
   * Check connection status and update sync accordingly
   */
  async checkConnectionAndSync(): Promise<void> {
    try {
      // Test connection with a simple query
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1)

      const wasOnline = this.isOnline
      this.isOnline = !error

      if (!wasOnline && this.isOnline) {
        // Came back online - process sync queue
        await this.processSyncQueue()
      }

      // Update sync status in database
      if (this.userId) {
        await this.updateSyncStatus(this.userId)
      }

    } catch (error) {
      this.isOnline = false
      console.warn('Connection check failed:', error)
    }
  }

  /**
   * Get pending offline changes count
   */
  getPendingChangesCount(): number {
    return this.offlineChanges.filter(c => !c.synced).length
  }

  /**
   * Clear all offline changes (use with caution)
   */
  async clearOfflineChanges(): Promise<void> {
    this.offlineChanges = []
    this.syncQueue = []
    await this.saveOfflineChanges()
  }

  // Private methods
  private async processSyncQueue(): Promise<{
    success: boolean
    syncedCount: number
    failedCount: number
    errors: any[]
  }> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ['Sync already in progress']
      }
    }

    this.syncInProgress = true
    let syncedCount = 0
    let failedCount = 0
    const errors: any[] = []

    try {
      const pendingChanges = this.syncQueue.filter(c => !c.synced)
      
      for (const change of pendingChanges) {
        try {
          await this.syncSingleChange(change)
          change.synced = true
          syncedCount++
        } catch (error) {
          change.retryCount++
          failedCount++
          errors.push({
            changeId: change.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })

          // Remove from queue if too many retries
          if (change.retryCount >= 3) {
            const index = this.offlineChanges.indexOf(change)
            if (index > -1) {
              this.offlineChanges.splice(index, 1)
            }
          }
        }
      }

      // Remove synced changes from queue
      this.syncQueue = this.syncQueue.filter(c => !c.synced)
      
      // Save updated state
      await this.saveOfflineChanges()

      return {
        success: failedCount === 0,
        syncedCount,
        failedCount,
        errors
      }

    } finally {
      this.syncInProgress = false
    }
  }

  private async syncSingleChange(change: OfflineChange): Promise<void> {
    const { table, type, data } = change

    switch (type) {
      case 'INSERT':
        const { error: insertError } = await supabase
          .from(table)
          .insert(data)
        if (insertError) throw insertError
        break

      case 'UPDATE':
        const { error: updateError } = await supabase
          .from(table)
          .update(data)
          .eq('id', data.id)
        if (updateError) throw updateError
        break

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id)
        if (deleteError) throw deleteError
        break

      default:
        throw new Error(`Unknown change type: ${type}`)
    }
  }

  private handleRealtimeChange(
    table: TableName,
    payload: RealtimePostgresChangesPayload<any>
  ): void {
    // Handle conflicts between local offline changes and server updates
    const conflictingChanges = this.offlineChanges.filter(
      c => c.table === table && 
           c.data.id === payload.new?.id && 
           !c.synced
    )

    if (conflictingChanges.length > 0) {
      // Resolve conflicts - server wins for now
      conflictingChanges.forEach(change => {
        change.synced = true // Mark as synced to avoid sending
      })
      
      this.saveOfflineChanges()
    }
  }

  private setupNetworkListener(): void {
    // Check connection status periodically
    setInterval(async () => {
      await this.checkConnectionAndSync()
    }, 30000) // Check every 30 seconds

    // Listen for network state changes (if available)
    if (typeof window !== 'undefined' && 'navigator' in window) {
      window.addEventListener('online', async () => {
        console.log('Network back online')
        this.isOnline = true
        await this.processSyncQueue()
      })

      window.addEventListener('offline', () => {
        console.log('Network went offline')
        this.isOnline = false
      })
    }
  }

  private async loadOfflineChanges(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('pocketmoney_offline_changes')
        if (stored) {
          this.offlineChanges = JSON.parse(stored)
          this.syncQueue = this.offlineChanges.filter(c => !c.synced)
        }
      }
    } catch (error) {
      console.warn('Failed to load offline changes:', error)
      this.offlineChanges = []
      this.syncQueue = []
    }
  }

  private async saveOfflineChanges(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          'pocketmoney_offline_changes',
          JSON.stringify(this.offlineChanges)
        )
      }
    } catch (error) {
      console.warn('Failed to save offline changes:', error)
    }
  }

  private getLastSyncTime(): string | null {
    const syncedChanges = this.offlineChanges.filter(c => c.synced)
    if (syncedChanges.length === 0) return null

    return syncedChanges
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
      .timestamp
  }

  private getSyncErrors(): any[] {
    return this.offlineChanges
      .filter(c => c.retryCount > 0)
      .map(c => ({
        id: c.id,
        table: c.table,
        retryCount: c.retryCount,
        timestamp: c.timestamp
      }))
  }

  private async updateSyncStatus(userId: string): Promise<void> {
    try {
      const currentMonth = new Date().toISOString().substring(0, 7)
      
      await supabase
        .from('sync_status')
        .upsert({
          user_id: userId,
          table_name: 'realtime_sync',
          last_sync: new Date().toISOString(),
          is_online: this.isOnline,
          sync_conflicts: this.getSyncErrors()
        })

    } catch (error) {
      console.warn('Failed to update sync status:', error)
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService()

export type {
  SyncStatus,
  OfflineChange,
  ChangeType,
  TableName,
  RealtimeSubscription
}