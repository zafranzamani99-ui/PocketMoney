import { supabase } from '../../lib/supabase'
import { Database } from '../../types/database'

type Order = Database['public']['Tables']['orders']['Row']
type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderUpdate = Database['public']['Tables']['orders']['Update']
type OrderItem = Database['public']['Tables']['order_items']['Row']
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']

interface OrderWithDetails extends Order {
  customer?: {
    id: string
    name: string
    phone: string | null
    email: string | null
    total_spent: number
  }
  items?: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  itemsCount: number
  totalValue: number
}

interface OrderFilters {
  status?: 'pending' | 'paid' | 'completed'
  customerId?: string
  dateFrom?: string
  dateTo?: string
  minAmount?: number
  maxAmount?: number
  paymentMethod?: string
}

interface CreateOrderData {
  customerId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  items: Array<{
    name: string
    price: number
    quantity: number
  }>
  paymentMethod?: string
  notes?: string
  status?: 'pending' | 'paid' | 'completed'
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

class OrderService {
  private readonly VALID_STATUSES = ['pending', 'paid', 'completed'] as const
  private readonly VALID_PAYMENT_METHODS = [
    'Cash',
    'Bank Transfer',
    'Credit Card',
    'Touch n Go',
    'GrabPay',
    'Boost',
    'ShopeePay',
    'COD',
    'Other'
  ]

  /**
   * Create a new order with customer and items
   */
  async createOrder(userId: string, orderData: CreateOrderData): Promise<OrderWithDetails> {
    // Validate order data
    this.validateOrderData(orderData)

    // Calculate total amount from items
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
        orderData.customerPhone,
        orderData.customerEmail
      )
    }

    // Create order record
    const orderInsertData: OrderInsert = {
      user_id: userId,
      customer_id: customerId || null,
      amount: totalAmount,
      status: orderData.status || 'pending',
      payment_method: orderData.paymentMethod || null,
      notes: orderData.notes || null
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      throw new Error(`Failed to create order: ${orderError.message}`)
    }

    // Create order items
    const itemsInsertData: OrderItemInsert[] = orderData.items.map(item => ({
      order_id: order.id,
      name: item.name.trim(),
      price: item.price,
      quantity: item.quantity
    }))

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsInsertData)
      .select()

    if (itemsError) {
      // If items creation fails, we should clean up the order
      await supabase.from('orders').delete().eq('id', order.id)
      console.error('Order items creation error:', itemsError)
      throw new Error(`Failed to create order items: ${itemsError.message}`)
    }

    // Update customer statistics if customer exists
    if (customerId) {
      await this.updateCustomerStats(customerId, totalAmount, order.created_at)
    }

    // Update user progress for gamification
    await this.updateUserProgress(userId, 'orders_created', 1)
    await this.updateUserProgress(userId, 'total_revenue', totalAmount)
    
    if (orderData.status === 'completed') {
      await this.updateUserProgress(userId, 'completed_orders', 1)
    }

    await this.checkUserAchievements(userId)

    // Return complete order with details
    return await this.getOrderById(userId, order.id) as OrderWithDetails
  }

  /**
   * Get user's orders with filtering and pagination
   */
  async getUserOrders(
    userId: string,
    filters: OrderFilters = {},
    limit = 50,
    offset = 0
  ): Promise<OrderWithDetails[]> {
    // Validate pagination
    if (limit < 1 || limit > 100) limit = 50
    if (offset < 0) offset = 0

    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, name, phone, email, total_spent),
        items:order_items(id, name, price, quantity)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Apply filters with validation
    if (filters.status && this.VALID_STATUSES.includes(filters.status)) {
      query = query.eq('status', filters.status)
    }

    if (filters.customerId && this.isValidUUID(filters.customerId)) {
      query = query.eq('customer_id', filters.customerId)
    }

    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod)
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
      console.error('Error fetching orders:', error)
      throw new Error(`Failed to fetch orders: ${error.message}`)
    }

    // Add computed fields
    return (data || []).map(order => ({
      ...order,
      itemsCount: order.items?.length || 0,
      totalValue: order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || order.amount
    })) as OrderWithDetails[]
  }

  /**
   * Get order by ID with full details
   */
  async getOrderById(userId: string, orderId: string): Promise<OrderWithDetails | null> {
    if (!this.isValidUUID(orderId)) {
      throw new Error('Invalid order ID format')
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, name, phone, email, total_spent),
        items:order_items(id, name, price, quantity)
      `)
      .eq('id', orderId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching order:', error)
      throw new Error(`Failed to fetch order: ${error.message}`)
    }

    if (!data) return null

    return {
      ...data,
      itemsCount: data.items?.length || 0,
      totalValue: data.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || data.amount
    } as OrderWithDetails
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    userId: string, 
    orderId: string, 
    status: 'pending' | 'paid' | 'completed'
  ): Promise<OrderWithDetails> {
    if (!this.VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status. Valid statuses: ${this.VALID_STATUSES.join(', ')}`)
    }

    // Get current order to check current status
    const currentOrder = await this.getOrderById(userId, orderId)
    if (!currentOrder) {
      throw new Error('Order not found or access denied')
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Order status update error:', error)
      throw new Error(`Failed to update order status: ${error.message}`)
    }

    // Update progress if status changed to completed
    if (status === 'completed' && currentOrder.status !== 'completed') {
      await this.updateUserProgress(userId, 'completed_orders', 1)
    }

    return await this.getOrderById(userId, orderId) as OrderWithDetails
  }

  /**
   * Update order details
   */
  async updateOrder(userId: string, orderId: string, updates: Partial<CreateOrderData>): Promise<OrderWithDetails> {
    if (!this.isValidUUID(orderId)) {
      throw new Error('Invalid order ID format')
    }

    // Get current order
    const currentOrder = await this.getOrderById(userId, orderId)
    if (!currentOrder) {
      throw new Error('Order not found or access denied')
    }

    // Validate updates
    if (updates.status && !this.VALID_STATUSES.includes(updates.status)) {
      throw new Error(`Invalid status. Valid statuses: ${this.VALID_STATUSES.join(', ')}`)
    }

    if (updates.items) {
      this.validateOrderItems(updates.items)
    }

    // Handle customer updates
    let customerId = currentOrder.customer_id
    if (updates.customerId || updates.customerName || updates.customerPhone) {
      if (updates.customerId) {
        customerId = updates.customerId
      } else if (updates.customerName || updates.customerPhone) {
        customerId = await this.findOrCreateCustomer(
          userId,
          updates.customerName || currentOrder.customer?.name,
          updates.customerPhone || currentOrder.customer?.phone,
          updates.customerEmail
        )
      }
    }

    // Update order items if provided
    if (updates.items) {
      // Delete existing items
      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      // Create new items
      const itemsInsertData: OrderItemInsert[] = updates.items.map(item => ({
        order_id: orderId,
        name: item.name.trim(),
        price: item.price,
        quantity: item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsInsertData)

      if (itemsError) {
        console.error('Order items update error:', itemsError)
        throw new Error(`Failed to update order items: ${itemsError.message}`)
      }

      // Recalculate total amount
      const newTotalAmount = updates.items.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      )

      // Update order with new total
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          amount: newTotalAmount,
          customer_id: customerId,
          payment_method: updates.paymentMethod,
          notes: updates.notes,
          status: updates.status
        })
        .eq('id', orderId)
        .eq('user_id', userId)

      if (orderError) {
        console.error('Order update error:', orderError)
        throw new Error(`Failed to update order: ${orderError.message}`)
      }

      // Update customer stats with amount difference
      if (customerId && currentOrder.customer_id === customerId) {
        const amountDifference = newTotalAmount - currentOrder.amount
        if (amountDifference !== 0) {
          await this.updateCustomerStats(customerId, amountDifference)
        }
      }
    } else {
      // Update order without changing items
      const updateData: OrderUpdate = {}
      if (updates.status) updateData.status = updates.status
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod
      if (updates.notes !== undefined) updateData.notes = updates.notes
      if (customerId !== currentOrder.customer_id) updateData.customer_id = customerId

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('user_id', userId)

      if (error) {
        console.error('Order update error:', error)
        throw new Error(`Failed to update order: ${error.message}`)
      }
    }

    return await this.getOrderById(userId, orderId) as OrderWithDetails
  }

  /**
   * Delete an order
   */
  async deleteOrder(userId: string, orderId: string): Promise<void> {
    if (!this.isValidUUID(orderId)) {
      throw new Error('Invalid order ID format')
    }

    // Get order details before deletion for stats update
    const order = await this.getOrderById(userId, orderId)
    if (!order) {
      throw new Error('Order not found or access denied')
    }

    // Delete order (items will be deleted by CASCADE)
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('user_id', userId)

    if (error) {
      console.error('Order deletion error:', error)
      throw new Error(`Failed to delete order: ${error.message}`)
    }

    // Update customer stats
    if (order.customer_id) {
      await this.updateCustomerStats(order.customer_id, -order.amount)
    }

    // Update user progress
    await this.updateUserProgress(userId, 'orders_created', -1)
    await this.updateUserProgress(userId, 'total_revenue', -order.amount)
    if (order.status === 'completed') {
      await this.updateUserProgress(userId, 'completed_orders', -1)
    }
  }

  /**
   * Get today's orders summary
   */
  async getTodayOrders(userId: string): Promise<{
    orders: OrderWithDetails[]
    totalRevenue: number
    orderCount: number
    completedCount: number
  }> {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = `${today}T00:00:00Z`
    const endOfDay = `${today}T23:59:59Z`

    const orders = await this.getUserOrders(userId, {
      dateFrom: startOfDay,
      dateTo: endOfDay
    })

    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0)
    const completedCount = orders.filter(order => order.status === 'completed').length

    return {
      orders,
      totalRevenue,
      orderCount: orders.length,
      completedCount
    }
  }

  /**
   * Get comprehensive order statistics
   */
  async getOrderStats(userId: string, days = 30): Promise<OrderStats> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const orders = await this.getUserOrders(userId, {
      dateFrom: cutoffDate.toISOString()
    }, 1000) // Get more records for stats

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
      if (order.customer_id && order.customer) {
        if (!customerStats[order.customer_id]) {
          customerStats[order.customer_id] = {
            name: order.customer.name,
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
   * Search orders by customer name or notes
   */
  async searchOrders(userId: string, searchTerm: string, limit = 20): Promise<OrderWithDetails[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new Error('Search term must be at least 2 characters long')
    }

    const sanitizedTerm = searchTerm.trim().substring(0, 100)

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, name, phone, email, total_spent),
        items:order_items(id, name, price, quantity)
      `)
      .eq('user_id', userId)
      .or(`notes.ilike.%${sanitizedTerm}%,customer.name.ilike.%${sanitizedTerm}%`)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50))

    if (error) {
      console.error('Error searching orders:', error)
      throw new Error(`Failed to search orders: ${error.message}`)
    }

    return (data || []).map(order => ({
      ...order,
      itemsCount: order.items?.length || 0,
      totalValue: order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || order.amount
    })) as OrderWithDetails[]
  }

  /**
   * Get valid payment methods
   */
  getValidPaymentMethods(): string[] {
    return [...this.VALID_PAYMENT_METHODS]
  }

  /**
   * Get valid order statuses
   */
  getValidStatuses(): string[] {
    return [...this.VALID_STATUSES]
  }

  // Private helper methods
  private validateOrderData(data: CreateOrderData): void {
    if (!data.items || data.items.length === 0) {
      throw new Error('Order must have at least one item')
    }

    this.validateOrderItems(data.items)

    if (data.status && !this.VALID_STATUSES.includes(data.status)) {
      throw new Error(`Invalid status. Valid statuses: ${this.VALID_STATUSES.join(', ')}`)
    }

    if (data.paymentMethod && data.paymentMethod.length > 100) {
      throw new Error('Payment method cannot exceed 100 characters')
    }

    if (data.notes && data.notes.length > 1000) {
      throw new Error('Notes cannot exceed 1000 characters')
    }

    if (data.customerPhone && !this.isValidMalaysianPhone(data.customerPhone)) {
      throw new Error('Invalid Malaysian phone number format')
    }

    if (data.customerEmail && !this.isValidEmail(data.customerEmail)) {
      throw new Error('Invalid email format')
    }
  }

  private validateOrderItems(items: Array<{ name: string; price: number; quantity: number }>): void {
    items.forEach((item, index) => {
      if (!item.name || item.name.trim().length === 0) {
        throw new Error(`Item ${index + 1}: name is required`)
      }

      if (item.name.length > 255) {
        throw new Error(`Item ${index + 1}: name cannot exceed 255 characters`)
      }

      if (typeof item.price !== 'number' || item.price < 0) {
        throw new Error(`Item ${index + 1}: price must be a non-negative number`)
      }

      if (item.price > 999999.99) {
        throw new Error(`Item ${index + 1}: price cannot exceed RM999,999.99`)
      }

      if (typeof item.quantity !== 'number' || item.quantity < 1 || !Number.isInteger(item.quantity)) {
        throw new Error(`Item ${index + 1}: quantity must be a positive integer`)
      }

      if (item.quantity > 10000) {
        throw new Error(`Item ${index + 1}: quantity cannot exceed 10,000`)
      }
    })
  }

  private async findOrCreateCustomer(
    userId: string,
    name?: string,
    phone?: string,
    email?: string
  ): Promise<string> {
    if (!name && !phone && !email) {
      throw new Error('Customer name, phone, or email is required')
    }

    // Try to find existing customer by phone or email
    let existingCustomer = null
    if (phone) {
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .eq('phone', phone)
        .single()
      existingCustomer = data
    }

    if (!existingCustomer && email) {
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .eq('email', email)
        .single()
      existingCustomer = data
    }

    if (existingCustomer) {
      return existingCustomer.id
    }

    // Create new customer
    const customerData: CustomerInsert = {
      user_id: userId,
      name: name || 'Unknown Customer',
      phone: phone || null,
      email: email || null
    }

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select('id')
      .single()

    if (error) {
      console.error('Customer creation error:', error)
      throw new Error(`Failed to create customer: ${error.message}`)
    }

    return newCustomer.id
  }

  private async updateCustomerStats(customerId: string, amountChange: number, orderDate?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          total_spent: supabase.raw(`total_spent + ${amountChange}`),
          last_order_date: orderDate || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)

      if (error) {
        console.error('Customer stats update error:', error)
      }
    } catch (error) {
      console.warn('Failed to update customer stats:', error)
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  private isValidDate(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}/
    if (!dateRegex.test(dateString)) return false
    
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }

  private isValidMalaysianPhone(phone: string): boolean {
    // Malaysian phone number patterns
    const phoneRegex = /^(\+?6?01[0-9]-?[0-9]{7,8}|(\+?6?0[3-9])-?[0-9]{7,8})$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 255
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

export const orderService = new OrderService()
export type {
  Order,
  OrderWithDetails,
  OrderFilters,
  OrderStats,
  CreateOrderData,
  OrderItem
}