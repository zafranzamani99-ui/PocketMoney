import { Database } from '../types/database'

// Custom error types for better error handling
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class BusinessLogicError extends Error {
  constructor(
    message: string,
    public code: string = 'BUSINESS_LOGIC_ERROR',
    public details?: any
  ) {
    super(message)
    this.name = 'BusinessLogicError'
  }
}

export class FeatureLimitError extends Error {
  constructor(
    message: string,
    public feature: string,
    public currentUsage: number,
    public limit: number
  ) {
    super(message)
    this.name = 'FeatureLimitError'
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
type OrderInsert = Database['public']['Tables']['orders']['Insert']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type WalletInsert = Database['public']['Tables']['wallets']['Insert']

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings?: string[]
}

interface ValidationRules {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

interface FieldValidation {
  [key: string]: ValidationRules
}

class ValidationService {
  // Common validation rules
  private readonly COMMON_RULES = {
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxLength: 255
    },
    phone: {
      pattern: /^(\+?6?01[0-9]-?[0-9]{7,8}|(\+?6?0[3-9])-?[0-9]{7,8})$/, // Malaysian phone numbers
      maxLength: 20
    },
    amount: {
      min: 0.01,
      max: 999999.99
    },
    percentage: {
      min: 0,
      max: 100
    },
    uuid: {
      pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    }
  }

  // Field validation schemas
  private readonly EXPENSE_VALIDATION: FieldValidation = {
    user_id: { required: true, ...this.COMMON_RULES.uuid },
    amount: { required: true, ...this.COMMON_RULES.amount },
    category: { required: true, minLength: 1, maxLength: 100 },
    description: { maxLength: 500 },
    receipt_url: { maxLength: 1000 },
    wallet_id: { ...this.COMMON_RULES.uuid }
  }

  private readonly ORDER_VALIDATION: FieldValidation = {
    user_id: { required: true, ...this.COMMON_RULES.uuid },
    amount: { required: true, ...this.COMMON_RULES.amount },
    status: { 
      required: true,
      custom: (value: string) => ['pending', 'paid', 'completed'].includes(value) || 'Invalid order status'
    },
    payment_method: { maxLength: 100 },
    notes: { maxLength: 1000 },
    customer_id: { ...this.COMMON_RULES.uuid }
  }

  private readonly CUSTOMER_VALIDATION: FieldValidation = {
    user_id: { required: true, ...this.COMMON_RULES.uuid },
    name: { required: true, minLength: 1, maxLength: 255 },
    phone: { ...this.COMMON_RULES.phone },
    email: { ...this.COMMON_RULES.email },
    total_spent: { ...this.COMMON_RULES.amount }
  }

  private readonly WALLET_VALIDATION: FieldValidation = {
    user_id: { required: true, ...this.COMMON_RULES.uuid },
    name: { required: true, minLength: 1, maxLength: 255 },
    type: {
      required: true,
      custom: (value: string) => ['cash', 'bank', 'ewallet', 'credit'].includes(value) || 'Invalid wallet type'
    },
    balance: { min: 0, max: 9999999.99 },
    bank_name: { maxLength: 100 },
    account_number: { maxLength: 50 }
  }

  private readonly BUSINESS_CATEGORIES = [
    'Retail', 'Food', 'Service', 'Online', 'Technology', 
    'Healthcare', 'Education', 'Manufacturing', 'Construction', 'Other'
  ]

  private readonly EXPENSE_CATEGORIES = [
    'Food & Beverages', 'Transport', 'Inventory', 'Utilities', 'Marketing',
    'Rent', 'Equipment', 'Office Supplies', 'Staff', 'Banking', 
    'Professional Services', 'Insurance', 'Maintenance', 'Other'
  ]

  /**
   * Validate expense data before creating/updating
   */
  validateExpense(data: Partial<ExpenseInsert>, isUpdate = false): ValidationResult {
    return this.validateObject(data, this.EXPENSE_VALIDATION, isUpdate)
  }

  /**
   * Validate order data before creating/updating
   */
  validateOrder(data: Partial<OrderInsert>, isUpdate = false): ValidationResult {
    const result = this.validateObject(data, this.ORDER_VALIDATION, isUpdate)
    
    // Additional business logic validation for orders
    if (result.isValid && data.amount !== undefined) {
      if (data.amount <= 0) {
        result.errors.push(new ValidationError('Order amount must be greater than zero', 'amount'))
        result.isValid = false
      }
    }

    return result
  }

  /**
   * Validate customer data before creating/updating
   */
  validateCustomer(data: Partial<CustomerInsert>, isUpdate = false): ValidationResult {
    const result = this.validateObject(data, this.CUSTOMER_VALIDATION, isUpdate)

    // Additional validation: at least phone or email must be provided
    if (result.isValid && !isUpdate) {
      if (!data.phone && !data.email) {
        result.errors.push(new ValidationError('Either phone number or email is required', 'phone'))
        result.isValid = false
      }
    }

    return result
  }

  /**
   * Validate wallet data before creating/updating
   */
  validateWallet(data: Partial<WalletInsert>, isUpdate = false): ValidationResult {
    return this.validateObject(data, this.WALLET_VALIDATION, isUpdate)
  }

  /**
   * Validate receipt data from AI extraction
   */
  validateReceiptData(data: any): ValidationResult {
    const errors: ValidationError[] = []
    let isValid = true

    // Validate store name
    if (data.store_name && typeof data.store_name !== 'string') {
      errors.push(new ValidationError('Store name must be a string', 'store_name'))
      isValid = false
    }

    // Validate total amount
    if (data.total_amount !== undefined) {
      if (typeof data.total_amount !== 'number' || data.total_amount <= 0) {
        errors.push(new ValidationError('Total amount must be a positive number', 'total_amount'))
        isValid = false
      } else if (data.total_amount > 999999.99) {
        errors.push(new ValidationError('Total amount exceeds maximum limit', 'total_amount'))
        isValid = false
      }
    }

    // Validate date
    if (data.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(data.date)) {
        errors.push(new ValidationError('Date must be in YYYY-MM-DD format', 'date'))
        isValid = false
      }
    }

    // Validate category
    if (data.category && !this.EXPENSE_CATEGORIES.includes(data.category)) {
      errors.push(new ValidationError('Invalid expense category', 'category'))
      isValid = false
    }

    // Validate items array
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any, index: number) => {
        if (!item.name || typeof item.name !== 'string') {
          errors.push(new ValidationError(`Item ${index + 1}: name is required`, `items[${index}].name`))
          isValid = false
        }
        if (item.price !== undefined && (typeof item.price !== 'number' || item.price <= 0)) {
          errors.push(new ValidationError(`Item ${index + 1}: price must be a positive number`, `items[${index}].price`))
          isValid = false
        }
        if (item.quantity !== undefined && (typeof item.quantity !== 'number' || item.quantity <= 0)) {
          errors.push(new ValidationError(`Item ${index + 1}: quantity must be a positive number`, `items[${index}].quantity`))
          isValid = false
        }
      })
    }

    return { isValid, errors }
  }

  /**
   * Validate WhatsApp message data
   */
  validateWhatsAppMessage(data: any): ValidationResult {
    const errors: ValidationError[] = []
    let isValid = true

    if (!data.content || typeof data.content !== 'string') {
      errors.push(new ValidationError('Message content is required', 'content'))
      isValid = false
    } else if (data.content.length > 5000) {
      errors.push(new ValidationError('Message content exceeds maximum length', 'content'))
      isValid = false
    }

    if (data.senderPhone && !this.COMMON_RULES.phone.pattern.test(data.senderPhone)) {
      errors.push(new ValidationError('Invalid phone number format', 'senderPhone'))
      isValid = false
    }

    return { isValid, errors }
  }

  /**
   * Validate business information during onboarding
   */
  validateBusinessInfo(data: any): ValidationResult {
    const errors: ValidationError[] = []
    let isValid = true

    if (!data.business_name || typeof data.business_name !== 'string') {
      errors.push(new ValidationError('Business name is required', 'business_name'))
      isValid = false
    } else if (data.business_name.length < 2 || data.business_name.length > 255) {
      errors.push(new ValidationError('Business name must be between 2 and 255 characters', 'business_name'))
      isValid = false
    }

    if (!data.business_type || !this.BUSINESS_CATEGORIES.includes(data.business_type)) {
      errors.push(new ValidationError('Valid business type is required', 'business_type'))
      isValid = false
    }

    if (data.phone && !this.COMMON_RULES.phone.pattern.test(data.phone)) {
      errors.push(new ValidationError('Invalid phone number format', 'phone'))
      isValid = false
    }

    return { isValid, errors }
  }

  /**
   * Validate file upload data
   */
  validateFileUpload(file: any, allowedTypes: string[], maxSizeMB: number): ValidationResult {
    const errors: ValidationError[] = []
    let isValid = true

    if (!file) {
      errors.push(new ValidationError('File is required', 'file'))
      return { isValid: false, errors }
    }

    // Validate file type
    if (allowedTypes.length > 0 && !allowedTypes.some(type => file.type?.includes(type))) {
      errors.push(new ValidationError(
        `Invalid file type. Allowed: ${allowedTypes.join(', ')}`, 
        'file_type'
      ))
      isValid = false
    }

    // Validate file size
    if (file.size && file.size > maxSizeMB * 1024 * 1024) {
      errors.push(new ValidationError(
        `File size exceeds ${maxSizeMB}MB limit`, 
        'file_size'
      ))
      isValid = false
    }

    return { isValid, errors }
  }

  /**
   * Sanitize user input to prevent XSS and SQL injection
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') return input

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\0/g, '') // Remove null bytes
      .substring(0, 10000) // Limit length
  }

  /**
   * Validate and sanitize search query
   */
  validateSearchQuery(query: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!query || typeof query !== 'string') {
      return { isValid: false, sanitized: '', error: 'Search query is required' }
    }

    const sanitized = this.sanitizeInput(query)
    
    if (sanitized.length < 2) {
      return { isValid: false, sanitized, error: 'Search query must be at least 2 characters' }
    }

    if (sanitized.length > 100) {
      return { isValid: false, sanitized, error: 'Search query exceeds maximum length' }
    }

    return { isValid: true, sanitized }
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(limit?: number, offset?: number): { 
    isValid: boolean
    limit: number
    offset: number
    errors: string[]
  } {
    const errors: string[] = []
    let validLimit = limit || 20
    let validOffset = offset || 0

    // Validate limit
    if (limit !== undefined) {
      if (typeof limit !== 'number' || limit < 1) {
        validLimit = 20
        errors.push('Limit must be a positive number, defaulting to 20')
      } else if (limit > 100) {
        validLimit = 100
        errors.push('Limit cannot exceed 100, capped at 100')
      }
    }

    // Validate offset
    if (offset !== undefined) {
      if (typeof offset !== 'number' || offset < 0) {
        validOffset = 0
        errors.push('Offset must be a non-negative number, defaulting to 0')
      }
    }

    return {
      isValid: errors.length === 0,
      limit: validLimit,
      offset: validOffset,
      errors
    }
  }

  /**
   * Validate date range for filtering
   */
  validateDateRange(dateFrom?: string, dateTo?: string): ValidationResult {
    const errors: ValidationError[] = []
    let isValid = true

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/

    if (dateFrom && !dateRegex.test(dateFrom)) {
      errors.push(new ValidationError('Invalid date format for dateFrom (use YYYY-MM-DD)', 'dateFrom'))
      isValid = false
    }

    if (dateTo && !dateRegex.test(dateTo)) {
      errors.push(new ValidationError('Invalid date format for dateTo (use YYYY-MM-DD)', 'dateTo'))
      isValid = false
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      errors.push(new ValidationError('dateFrom cannot be after dateTo', 'dateRange'))
      isValid = false
    }

    // Check for reasonable date ranges (not too far in the past or future)
    const now = new Date()
    const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate())
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

    if (dateFrom && new Date(dateFrom) < tenYearsAgo) {
      errors.push(new ValidationError('dateFrom cannot be more than 10 years ago', 'dateFrom'))
      isValid = false
    }

    if (dateTo && new Date(dateTo) > oneYearFromNow) {
      errors.push(new ValidationError('dateTo cannot be more than 1 year in the future', 'dateTo'))
      isValid = false
    }

    return { isValid, errors }
  }

  /**
   * Check if user has required permissions
   */
  validateUserPermissions(userId: string, resourceUserId: string): boolean {
    // Basic check - users can only access their own data
    return userId === resourceUserId
  }

  /**
   * Validate currency and amount combination
   */
  validateCurrencyAmount(amount: number, currency = 'MYR'): ValidationResult {
    const errors: ValidationError[] = []
    let isValid = true

    const supportedCurrencies = ['MYR', 'USD', 'SGD', 'EUR', 'GBP']
    
    if (!supportedCurrencies.includes(currency)) {
      errors.push(new ValidationError('Unsupported currency', 'currency'))
      isValid = false
    }

    // Different validation rules per currency
    let maxAmount = 999999.99
    if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
      maxAmount = maxAmount * 5 // Higher limits for major currencies
    }

    if (amount > maxAmount) {
      errors.push(new ValidationError(`Amount exceeds maximum for ${currency}`, 'amount'))
      isValid = false
    }

    return { isValid, errors }
  }

  // Private helper methods
  private validateObject(
    data: Record<string, any>, 
    schema: FieldValidation, 
    isUpdate = false
  ): ValidationResult {
    const errors: ValidationError[] = []
    let isValid = true

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field]

      // Skip validation for undefined fields in updates
      if (isUpdate && value === undefined) continue

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(new ValidationError(`${field} is required`, field))
        isValid = false
        continue
      }

      // Skip further validation if value is not provided and not required
      if (value === undefined || value === null || value === '') continue

      // Check string length constraints
      if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(new ValidationError(
            `${field} must be at least ${rules.minLength} characters`, 
            field
          ))
          isValid = false
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(new ValidationError(
            `${field} cannot exceed ${rules.maxLength} characters`, 
            field
          ))
          isValid = false
        }
      }

      // Check numeric constraints
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(new ValidationError(
            `${field} must be at least ${rules.min}`, 
            field
          ))
          isValid = false
        }

        if (rules.max !== undefined && value > rules.max) {
          errors.push(new ValidationError(
            `${field} cannot exceed ${rules.max}`, 
            field
          ))
          isValid = false
        }
      }

      // Check pattern matching
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push(new ValidationError(`${field} format is invalid`, field))
        isValid = false
      }

      // Check custom validation
      if (rules.custom) {
        const customResult = rules.custom(value)
        if (customResult !== true) {
          const errorMessage = typeof customResult === 'string' ? customResult : `${field} is invalid`
          errors.push(new ValidationError(errorMessage, field))
          isValid = false
        }
      }
    }

    return { isValid, errors }
  }

  /**
   * Get supported business categories
   */
  getBusinessCategories(): string[] {
    return [...this.BUSINESS_CATEGORIES]
  }

  /**
   * Get supported expense categories
   */
  getExpenseCategories(): string[] {
    return [...this.EXPENSE_CATEGORIES]
  }

  /**
   * Format validation errors for API response
   */
  formatValidationErrors(errors: ValidationError[]): {
    message: string
    errors: Array<{
      field: string
      message: string
      code: string
    }>
  } {
    return {
      message: 'Validation failed',
      errors: errors.map(error => ({
        field: error.field,
        message: error.message,
        code: error.code
      }))
    }
  }
}

export const validationService = new ValidationService()
export type { ValidationResult, ValidationRules, FieldValidation }