import { supabase } from '../lib/supabase'
import { Database } from '../types/database'

type Order = Database['public']['Tables']['orders']['Row']
type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderUpdate = Database['public']['Tables']['orders']['Update']
type OrderItem = Database['public']['Tables']['order_items']['Row']
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
type Customer = Database['public']['Tables']['customers']['Row']

interface OrderWithDetails extends Order {
  customer?: Customer
  items?: OrderItem[]
  itemsCount?: number
  totalValue?: number
}

interface OrderFilters {
  status?: 'pending' | 'paid' | 'completed'
  customerId?: string
  dateFrom?: string
  dateTo?: string
  minAmount?: number
  maxAmount?: string
  paymentMethod?: string
}

interface OrderStats {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  statusBreakdown: {
    pending: number
    paid: number
    completed: number
  }
  topCustomers: Array<{
    customerId: string
    customerName: string
    orderCount: number
    totalSpent: number
  }>
  revenueByMonth: Array<{
    month: string
    revenue: number
    orderCount: number
  }>
  paymentMethodBreakdown: Array<{
    method: string
    count: number
    totalAmount: number
  }>
}

interface CreateOrderData {
  customerId?: string
  customerName?: string
  customerPhone?: string
  items: Array<{
    name: string
    price: number
    quantity: number
  }>
  paymentMethod?: string
  notes?: string
  status?: 'pending' | 'paid' | 'completed'
}

class OrderService {
  /**
   * Get all orders for a user with optional filters
   */
  async getUserOrders(
    userId: string,
    filters: OrderFilters = {},
    limit = 50,
    offset = 0
  ): Promise<OrderWithDetails[]> {
    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name, phone, email),
        items:order_items(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId)
    }

    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod)
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

    // Add computed fields
    return (data || []).map(order => ({
      ...order,
      itemsCount: order.items?.length || 0,
      totalValue: order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || order.amount
    }))
  }

  /**
   * Create a new order with customer and items
   */
  async createOrder(userId: string, orderData: CreateOrderData): Promise<OrderWithDetails> {
    // Validate required fields
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order must have at least one item')
    }

    // Calculate total amount
    const totalAmount = orderData.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    )

    if (totalAmount <= 0) {
      throw new Error('Order total must be greater than 0')
    }

    // Handle customer creation/lookup
    let customerId = orderData.customerId
    if (!customerId && (orderData.customerName || orderData.customerPhone)) {
      customerId = await this.findOrCreateCustomer(
        userId, 
        orderData.customerName, 
        orderData.customerPhone
      )
    }

    // Create order
    const orderInsertData: OrderInsert = {
      user_id: userId,
      customer_id: customerId,
      amount: totalAmount,
      status: orderData.status || 'pending',
      payment_method: orderData.paymentMethod,
      notes: orderData.notes
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single()

    if (orderError) throw orderError

    // Create order items
    const itemsInsertData: OrderItemInsert[] = orderData.items.map(item => ({
      order_id: order.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }))

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsInsertData)
      .select()

    if (itemsError) throw itemsError

    // Update customer total spent and last order date
    if (customerId) {
      await this.updateCustomerStats(customerId, totalAmount)
    }

    // Update user progress for gamification
    await this.updateUserProgress(userId, 'orders_created', 1)
    await this.updateUserProgress(userId, 'total_revenue', totalAmount)
    await this.checkAchievements(userId)

    // Fetch and return complete order with details
    return await this.getOrderById(order.id) as OrderWithDetails
  }

  /**
   * Update an order
   */
  async updateOrder(orderId: string, updates: OrderUpdate): Promise<OrderWithDetails> {
    // Get current order for calculations
    const currentOrder = await this.getOrderById(orderId)
    if (!currentOrder) throw new Error('Order not found')

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error

    // Update customer stats if amount changed
    if (updates.amount !== undefined && currentOrder.customer_id) {
      const amountDifference = updates.amount - currentOrder.amount
      await this.updateCustomerStats(currentOrder.customer_id, amountDifference)
    }

    // If status changed to completed, update user progress
    if (updates.status === 'completed' && currentOrder.status !== 'completed') {
      await this.updateUserProgress(currentOrder.user_id, 'completed_orders', 1)
    }

    return await this.getOrderById(orderId) as OrderWithDetails
  }

  /**
   * Delete an order and its items
   */
  async deleteOrder(orderId: string): Promise<void> {
    // Get order details before deletion
    const order = await this.getOrderById(orderId)
    if (!order) throw new Error('Order not found')

    // Delete order (items will be deleted by CASCADE)
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)

    if (error) throw error

    // Update customer stats
    if (order.customer_id) {
      await this.updateCustomerStats(order.customer_id, -order.amount)
    }

    // Update user progress
    await this.updateUserProgress(order.user_id, 'orders_created', -1)
    await this.updateUserProgress(order.user_id, 'total_revenue', -order.amount)
  }

  /**
   * Get order by ID with all details
   */
  async getOrderById(orderId: string): Promise<OrderWithDetails | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, name, phone, email),
        items:order_items(*)
      `)
      .eq('id', orderId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    return {
      ...data,
      itemsCount: data.items?.length || 0,
      totalValue: data.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || data.amount
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string, 
    status: 'pending' | 'paid' | 'completed'
  ): Promise<OrderWithDetails> {
    return await this.updateOrder(orderId, { status })
  }

  /**
   * Add item to existing order
   */
  async addOrderItem(
    orderId: string,
    itemData: { name: string; price: number; quantity: number }
  ): Promise<OrderItem> {
    // Validate item data
    if (!itemData.name || itemData.price <= 0 || itemData.quantity <= 0) {
      throw new Error('Invalid item data')
    }

    // Create order item
    const { data: item, error } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        name: itemData.name,
        price: itemData.price,
        quantity: itemData.quantity
      })
      .select()
      .single()

    if (error) throw error

    // Update order total
    await this.recalculateOrderTotal(orderId)

    return item
  }

  /**
   * Remove item from order
   */
  async removeOrderItem(itemId: string): Promise<void> {
    // Get item details before deletion
    const { data: item } = await supabase
      .from('order_items')
      .select('order_id, price, quantity')
      .eq('id', itemId)
      .single()

    if (!item) throw new Error('Order item not found')

    // Delete item
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error

    // Update order total
    await this.recalculateOrderTotal(item.order_id)
  }

  /**
   * Get today's orders
   */
  async getTodayOrders(userId: string): Promise<{ orders: OrderWithDetails[]; total: number; count: number }> {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = `${today}T00:00:00Z`
    const endOfDay = `${today}T23:59:59Z`

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name, phone),
        items:order_items(*)
      `)
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })

    if (error) throw error

    const ordersWithDetails = (orders || []).map(order => ({
      ...order,
      itemsCount: order.items?.length || 0,
      totalValue: order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || order.amount
    }))

    const total = ordersWithDetails.reduce((sum, order) => sum + order.amount, 0)

    return {
      orders: ordersWithDetails,
      total,
      count: ordersWithDetails.length
    }
  }

  /**
   * Get pending orders
   */
  async getPendingOrders(userId: string): Promise<OrderWithDetails[]> {
    return await this.getUserOrders(userId, { status: 'pending' })
  }

  /**
   * Get orders by customer
   */
  async getOrdersByCustomer(
    userId: string,
    customerId: string,
    limit = 20
  ): Promise<OrderWithDetails[]> {
    return await this.getUserOrders(userId, { customerId }, limit)
  }

  /**
   * Search orders by customer name or order notes
   */
  async searchOrders(
    userId: string,
    searchTerm: string,
    limit = 20
  ): Promise<OrderWithDetails[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name, phone),
        items:order_items(*)
      `)
      .eq('user_id', userId)
      .or(`notes.ilike.%${searchTerm}%,customer.name.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map(order => ({
      ...order,
      itemsCount: order.items?.length || 0,
      totalValue: order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || order.amount
    }))
  }

  /**
   * Get comprehensive order statistics
   */
  async getOrderStats(userId: string, days = 30): Promise<OrderStats> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name)
      `)
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())

    if (error) throw error

    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Status breakdown
    const statusBreakdown = {
      pending: orders.filter(o => o.status === 'pending').length,
      paid: orders.filter(o => o.status === 'paid').length,
      completed: orders.filter(o => o.status === 'completed').length
    }

    // Top customers
    const customerStats: Record<string, { name: string; orderCount: number; totalSpent: number }> = {}
    orders.forEach(order => {
      if (order.customer_id) {
        if (!customerStats[order.customer_id]) {
          customerStats[order.customer_id] = {
            name: order.customer?.name || 'Unknown',
            orderCount: 0,
            totalSpent: 0
          }
        }
        customerStats[order.customer_id].orderCount += 1
        customerStats[order.customer_id].totalSpent += order.amount
      }
    })

    const topCustomers = Object.entries(customerStats)
      .map(([customerId, stats]) => ({
        customerId,
        customerName: stats.name,
        orderCount: stats.orderCount,
        totalSpent: stats.totalSpent
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)

    // Revenue by month
    const monthlyStats: Record<string, { revenue: number; orderCount: number }> = {}
    orders.forEach(order => {
      const monthKey = order.created_at.substring(0, 7) // YYYY-MM
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { revenue: 0, orderCount: 0 }
      }
      monthlyStats[monthKey].revenue += order.amount
      monthlyStats[monthKey].orderCount += 1
    })

    const revenueByMonth = Object.entries(monthlyStats)
      .map(([month, stats]) => ({
        month,
        revenue: stats.revenue,
        orderCount: stats.orderCount
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Payment method breakdown
    const paymentStats: Record<string, { count: number; totalAmount: number }> = {}
    orders.forEach(order => {
      const method = order.payment_method || 'Unknown'
      if (!paymentStats[method]) {
        paymentStats[method] = { count: 0, totalAmount: 0 }
      }
      paymentStats[method].count += 1
      paymentStats[method].totalAmount += order.amount
    })

    const paymentMethodBreakdown = Object.entries(paymentStats)
      .map(([method, stats]) => ({
        method,
        count: stats.count,
        totalAmount: stats.totalAmount
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      statusBreakdown,
      topCustomers,
      revenueByMonth,
      paymentMethodBreakdown
    }
  }

  /**
   * Bulk update order statuses
   */
  async bulkUpdateOrderStatus(
    orderIds: string[],
    status: 'pending' | 'paid' | 'completed'
  ): Promise<void> {
    if (orderIds.length === 0) return

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .in('id', orderIds)

    if (error) throw error
  }

  /**
   * Get weekly order summary
   */
  async getWeeklyOrderSummary(userId: string): Promise<{
    thisWeek: { orders: number; revenue: number }
    lastWeek: { orders: number; revenue: number }
    change: { orders: number; revenue: number }
    changePercentage: { orders: number; revenue: number }
  }> {
    const now = new Date()
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - now.getDay()) // Start of this week
    thisWeekStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(thisWeekStart.getDate() - 7)

    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setMilliseconds(-1)

    // This week orders
    const { data: thisWeekOrders } = await supabase
      .from('orders')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', thisWeekStart.toISOString())

    // Last week orders
    const { data: lastWeekOrders } = await supabase
      .from('orders')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', lastWeekStart.toISOString())
      .lt('created_at', lastWeekEnd.toISOString())

    const thisWeek = {
      orders: thisWeekOrders?.length || 0,
      revenue: thisWeekOrders?.reduce((sum, order) => sum + order.amount, 0) || 0
    }

    const lastWeek = {
      orders: lastWeekOrders?.length || 0,
      revenue: lastWeekOrders?.reduce((sum, order) => sum + order.amount, 0) || 0
    }

    const change = {
      orders: thisWeek.orders - lastWeek.orders,
      revenue: thisWeek.revenue - lastWeek.revenue
    }

    const changePercentage = {
      orders: lastWeek.orders > 0 ? (change.orders / lastWeek.orders) * 100 : 0,
      revenue: lastWeek.revenue > 0 ? (change.revenue / lastWeek.revenue) * 100 : 0
    }

    return {
      thisWeek,
      lastWeek,
      change,
      changePercentage
    }
  }

  // Private helper methods
  private async findOrCreateCustomer(
    userId: string,
    name?: string,
    phone?: string
  ): Promise<string> {
    if (!name && !phone) {
      throw new Error('Customer name or phone is required')
    }

    // Try to find existing customer
    let query = supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)

    if (phone) {
      query = query.eq('phone', phone)
    } else {
      query = query.eq('name', name!)
    }

    const { data: existingCustomer } = await query.single()

    if (existingCustomer) {
      return existingCustomer.id
    }

    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        user_id: userId,
        name: name || 'Unknown',
        phone: phone
      })
      .select('id')
      .single()

    if (error) throw error
    return newCustomer.id
  }

  private async updateCustomerStats(customerId: string, amountChange: number): Promise<void> {
    // Update total spent and last order date
    await supabase.rpc('update_customer_stats', {
      customer_id: customerId,
      amount_change: amountChange
    })
  }

  private async recalculateOrderTotal(orderId: string): Promise<void> {
    // Get all items for the order
    const { data: items } = await supabase
      .from('order_items')
      .select('price, quantity')
      .eq('order_id', orderId)

    if (!items) return

    // Calculate new total
    const newTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // Update order amount
    await supabase
      .from('orders')
      .update({ amount: newTotal })
      .eq('id', orderId)
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

export const orderService = new OrderService()
export type { 
  Order, 
  OrderInsert, 
  OrderUpdate, 
  OrderItem, 
  OrderWithDetails, 
  OrderFilters, 
  OrderStats, 
  CreateOrderData 
}