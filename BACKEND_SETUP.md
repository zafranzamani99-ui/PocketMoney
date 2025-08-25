# PocketMoney Backend Setup Guide

## Overview
This guide will help you set up the complete backend infrastructure for PocketMoney as specified in the PRD. The backend is built with Supabase (PostgreSQL) and TypeScript services.

## 🗄️ Database Setup

### Step 1: Run Database Schema
Execute the SQL files in this order:

```bash
# 1. Core schema (if not already done)
psql -h your-supabase-host -U postgres -d postgres < supabase/schema.sql

# 2. Complete backend setup (includes all new tables and functions)
psql -h your-supabase-host -U postgres -d postgres < supabase/complete_backend_setup.sql
```

### Step 2: Verify Tables Created
The following tables should now exist:
- `users` (enhanced)
- `wallets` 
- `expenses`
- `orders`
- `order_items`
- `customers` 
- `receipts`
- `subscriptions` ⭐ NEW
- `feature_usage` ⭐ NEW
- `whatsapp_extractions` ⭐ NEW
- `voice_inputs` ⭐ NEW
- `receipt_processing_queue` ⭐ NEW
- `google_sheets_sync` ⭐ NEW
- `achievements` ⭐ NEW
- `user_progress` ⭐ NEW
- `daily_snapshots` ⭐ NEW

## 🔧 Environment Configuration

### Required Environment Variables
Add these to your `.env` file:

```env
# Supabase (existing)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Groq AI for receipt processing
EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key

# Google Sheets API (optional)
GOOGLE_SHEETS_CLIENT_ID=your_google_client_id
GOOGLE_SHEETS_CLIENT_SECRET=your_google_client_secret

# File upload limits
MAX_RECEIPT_SIZE_MB=10
SUPPORTED_IMAGE_TYPES=image/jpeg,image/png,image/webp
```

## 📦 Backend Services Architecture

### Core Services
Located in `services/core/`:

1. **ExpenseService** (`expenseService.ts`)
   - ✅ Full CRUD operations with validation
   - ✅ Wallet balance integration  
   - ✅ Category management
   - ✅ Statistics and analytics

2. **OrderService** (`orderService.ts`)
   - ✅ Order management with items
   - ✅ Customer integration
   - ✅ Status tracking (pending → paid → completed)
   - ✅ Comprehensive statistics

3. **ReceiptProcessingService** (`receiptProcessingService.ts`)
   - ✅ Image upload and processing
   - ✅ Groq AI integration
   - ✅ Automatic expense creation
   - ✅ Processing queue management

### Integration Services  
Located in `services/integrations/`:

1. **WhatsAppParserService** (`whatsappParserService.ts`)
   - ✅ Malaysian business pattern recognition
   - ✅ Order extraction from messages
   - ✅ Payment confirmation parsing
   - ✅ Customer information extraction

## 🚀 Usage Examples

### 1. Creating an Expense
```typescript
import { expenseService } from './services'

// Create expense with validation
const expense = await expenseService.createExpense(userId, {
  amount: 15.50,
  category: 'Food & Beverages',
  description: 'Lunch at kopitiam',
  walletId: 'optional-wallet-id'
})
```

### 2. Processing a Receipt
```typescript
import { receiptProcessingService } from './services'

// Process receipt image
const result = await receiptProcessingService.processReceiptFromImage(
  userId,
  imageFile,
  'receipt.jpg',
  { createExpense: true }
)

if (result.success) {
  console.log('Extracted data:', result.extractedData)
  console.log('Created expense:', result.expense)
}
```

### 3. Creating an Order
```typescript
import { orderService } from './services'

// Create order with customer and items
const order = await orderService.createOrder(userId, {
  customerName: 'Ahmad Rahman',
  customerPhone: '+60123456789',
  items: [
    { name: 'Nasi Lemak', price: 5.50, quantity: 2 },
    { name: 'Teh Tarik', price: 2.00, quantity: 2 }
  ],
  paymentMethod: 'Cash',
  status: 'pending'
})
```

### 4. Parsing WhatsApp Messages
```typescript
import { whatsappParserService } from './services'

// Parse WhatsApp order message
const result = await whatsappParserService.processWhatsAppOrder(
  userId,
  {
    content: 'nak order 2 nasi lemak dengan teh tarik',
    sender: 'Ahmad',
    senderPhone: '+60123456789'
  },
  true // Auto-create order
)

if (result.success && result.order) {
  console.log('Order created from WhatsApp:', result.order)
}
```

## 📊 Feature Limits & Subscriptions

### Free Tier Limits
- Receipt scans: 30/month
- WhatsApp extractions: 50/month  
- Voice inputs: 20/month
- Google Sheets: Not available

### Premium Tier (RM 9.90/month)
- All features unlimited
- Google Sheets sync
- Priority support
- Advanced analytics

## 🔐 Security Features

### Row Level Security (RLS)
All tables have RLS policies ensuring users can only access their own data:

```sql
-- Example policy
CREATE POLICY "Users can manage own expenses" ON public.expenses
  FOR ALL USING (auth.uid() = user_id);
```

### Input Validation
All services include comprehensive validation:
- Amount limits: RM 0.01 - RM 999,999.99
- Malaysian phone number format
- Email validation
- UUID format checking
- SQL injection prevention

## 🎯 Gamification System

### Default Achievements
- 📸 First Receipt (7 days premium)
- 🎯 Receipt Master (10 receipts)
- 💰 First Sale (3 days premium)
- 🔥 Week Warrior (7-day streak, 14 days premium)

### Progress Tracking
- Receipts scanned
- Orders created
- Total revenue
- Daily streaks
- Customer count

## 🧪 Testing the Backend

### Health Check
```typescript
import { checkBackendHealth } from './services'

const health = await checkBackendHealth()
console.log('Backend status:', health.status)
console.log('Services:', health.services)
```

### Service Validation
```typescript
import { VALIDATION_CONSTANTS } from './services'

// Use validation constants
const categories = VALIDATION_CONSTANTS.EXPENSE_CATEGORIES
const limits = VALIDATION_CONSTANTS.LIMITS.FREE_TIER
```

## 🐛 Error Handling

### Error Codes
The backend uses consistent error codes:
- `INVALID_INPUT` - Validation errors
- `INSUFFICIENT_BALANCE` - Wallet errors  
- `FEATURE_LIMIT_EXCEEDED` - Subscription limits
- `RESOURCE_NOT_FOUND` - Missing data
- `ACCESS_DENIED` - Security violations

### Error Response Format
```typescript
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE",
  details?: { /* additional info */ }
}
```

## 📱 Frontend Integration

### Import Services
```typescript
// Import all services
import { 
  expenseService, 
  orderService, 
  receiptProcessingService,
  whatsappParserService 
} from './services'

// Or import specific types
import type { 
  CreateExpenseData,
  OrderWithDetails,
  ReceiptProcessingResult 
} from './services'
```

### React Native Usage
```tsx
import React, { useState } from 'react'
import { expenseService } from '../services'

export const AddExpenseScreen = () => {
  const [loading, setLoading] = useState(false)

  const handleCreateExpense = async (data: CreateExpenseData) => {
    try {
      setLoading(true)
      const expense = await expenseService.createExpense(userId, data)
      // Handle success
    } catch (error) {
      // Handle error
      console.error('Expense creation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    // Your UI components
  )
}
```

## 🔄 Real-time Features

The backend supports real-time updates through Supabase:
- Expense updates
- Order status changes  
- Wallet balance updates
- Receipt processing status
- Achievement notifications

## 📈 Analytics & Reporting

### Available Statistics
- Daily/Weekly/Monthly summaries
- Category breakdowns
- Customer analytics
- Revenue trends
- Processing accuracy
- Feature usage patterns

## 🚀 Deployment Checklist

- [ ] Database schema applied
- [ ] Environment variables configured
- [ ] Groq API key added
- [ ] Supabase RLS policies active
- [ ] File upload bucket created
- [ ] Achievement data seeded
- [ ] Services health check passes

## 🔧 Maintenance

### Regular Tasks
- Monitor feature usage limits
- Clean up old processing queue entries  
- Update achievement criteria
- Review error logs
- Optimize database queries

### Performance Monitoring
- Database query performance
- File upload speeds
- AI processing times
- Error rates by service
- Feature adoption metrics

---

**Backend Status: ✅ Complete and Ready for Production**

All core PRD requirements have been implemented with proper validation, error handling, and security measures. The backend supports the full feature set outlined in the PRD including receipt scanning, WhatsApp integration, order management, and gamification.