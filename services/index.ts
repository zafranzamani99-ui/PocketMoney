// PocketMoney Backend Services Index
// Centralized export for all backend services

// Core services
export { expenseService } from './core/expenseService'
export { orderService } from './core/orderService'
export { receiptProcessingService } from './core/receiptProcessingService'

// Integration services
export { whatsappParserService } from './integrations/whatsappParserService'

// Existing services (maintain compatibility)
export { groqService } from './groqService'
export { walletService } from './walletService'
export { voiceService } from './voiceService'
export { biometricService } from './biometricService'
export { gamificationService } from './gamificationService'

// Type exports for TypeScript support
export type { 
  Expense,
  ExpenseWithWallet,
  ExpenseFilters,
  ExpenseStats,
  CreateExpenseData
} from './core/expenseService'

export type {
  Order,
  OrderWithDetails,
  OrderFilters,
  OrderStats,
  CreateOrderData,
  OrderItem
} from './core/orderService'

export type {
  ProcessedReceiptData,
  ReceiptProcessingResult,
  ReceiptUploadOptions
} from './core/receiptProcessingService'

export type {
  WhatsAppMessage,
  OrderExtraction,
  PaymentExtraction,
  ParsedWhatsAppData
} from './integrations/whatsappParserService'

// Backend service status and health check
export const backendServices = {
  // Core services
  expense: expenseService,
  order: orderService,
  receiptProcessing: receiptProcessingService,
  
  // Integration services
  whatsappParser: whatsappParserService,
  
  // Existing services
  groq: groqService,
  wallet: walletService,
  voice: voiceService,
  biometric: biometricService,
  gamification: gamificationService
} as const

// Service health check function
export async function checkBackendHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down'
  services: Record<string, 'available' | 'error'>
  timestamp: string
}> {
  const serviceStatus: Record<string, 'available' | 'error'> = {}
  let healthyServices = 0
  
  // Test each service availability
  const serviceChecks = [
    { name: 'expense', available: !!expenseService },
    { name: 'order', available: !!orderService },
    { name: 'receiptProcessing', available: !!receiptProcessingService },
    { name: 'whatsappParser', available: !!whatsappParserService },
    { name: 'groq', available: !!groqService },
    { name: 'wallet', available: !!walletService }
  ]
  
  serviceChecks.forEach(({ name, available }) => {
    serviceStatus[name] = available ? 'available' : 'error'
    if (available) healthyServices++
  })
  
  let status: 'healthy' | 'degraded' | 'down'
  if (healthyServices === serviceChecks.length) {
    status = 'healthy'
  } else if (healthyServices > serviceChecks.length / 2) {
    status = 'degraded'
  } else {
    status = 'down'
  }
  
  return {
    status,
    services: serviceStatus,
    timestamp: new Date().toISOString()
  }
}

// Validation constants for frontend use
export const VALIDATION_CONSTANTS = {
  EXPENSE_CATEGORIES: [
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
  ],
  
  ORDER_STATUSES: ['pending', 'paid', 'completed'],
  
  PAYMENT_METHODS: [
    'Cash',
    'Bank Transfer',
    'Credit Card',
    'Touch n Go',
    'GrabPay',
    'Boost',
    'ShopeePay',
    'COD',
    'Other'
  ],
  
  BUSINESS_TYPES: [
    'Retail',
    'Food',
    'Service', 
    'Online',
    'Technology',
    'Healthcare',
    'Education',
    'Manufacturing',
    'Construction',
    'Other'
  ],
  
  LIMITS: {
    FREE_TIER: {
      receipts_per_month: 30,
      whatsapp_extractions_per_month: 50,
      voice_inputs_per_month: 20,
      google_sheets_sync: false
    },
    PREMIUM_TIER: {
      receipts_per_month: 999999,
      whatsapp_extractions_per_month: 999999,
      voice_inputs_per_month: 999999,
      google_sheets_sync: true
    }
  }
} as const

// Error codes for consistent error handling
export const ERROR_CODES = {
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Business logic errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Feature limit errors
  FEATURE_LIMIT_EXCEEDED: 'FEATURE_LIMIT_EXCEEDED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  
  // Service errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',
  
  // File upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED'
} as const