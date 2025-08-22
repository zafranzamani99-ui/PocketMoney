# Product Requirements Document (PRD)
## PocketMoney - Expense Tracking for Malaysian Small Businesses

## Executive Summary
PocketMoney is a mobile-first expense tracking application designed for Malaysian small business owners who have never tracked their expenses before. The app focuses on simplicity and automation through receipt scanning, WhatsApp order extraction, and Google Sheets integration, making financial tracking as effortless as taking a photo.

## 1. Product Overview

### 1.1 Vision Statement
To be the simplest expense tracking app that turns Malaysian small business owners from financial chaos to clarity in under 30 seconds per transaction.

### 1.2 Target Audience
- **Primary**: Malaysian micro-business owners (warung, online sellers, freelancers)
- **Business Size**: 1-3 people operations
- **Tech Savvy**: Low to medium
- **Current Method**: No tracking or basic notebook
- **Age Range**: 25-45 years old

### 1.3 Core Value Proposition
"From WhatsApp orders to profit reports - automatically"

## 2. Technical Architecture

### 2.1 Tech Stack
- **Frontend**: React Native + Expo
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **AI Processing**: Groq API
- **Integrations**: Google Sheets API, Google OAuth, Apple Sign-In
- **OCR Fallback**: ML Kit (offline capability)
- **Voice**: React Native Voice
- **Analytics**: Mixpanel

### 2.2 Platform Support
- iOS 13.0+
- Android 8.0+ (API Level 26)
- Web (Expo Web for testing)

## 3. Core Features Specification

### 3.1 Authentication & Onboarding

**Login Methods:**
- Google OAuth (primary)
- Apple Sign-In (iOS)
- Email/Password with OTP verification
- Biometric unlock (Face ID/Fingerprint) after initial login

**First-Time Setup Flow:**
- Welcome screen with value props
- Choose business type (Retail/Food/Service/Online)
- Business name & phone number
- Primary wallet setup (Cash/Bank)
- Enable notifications
- Quick tutorial (3 slides max)

### 3.2 Receipt Scanning System

**Capabilities:**
- Single/Multiple receipt upload
- Camera capture or gallery selection
- Auto-crop and enhancement
- Offline basic OCR, online Groq AI processing

**Data Extraction:**
- Store name
- Date/Time
- Total amount
- GST/SST amount
- Payment method (if visible)
- Auto-categorization

### 3.3 WhatsApp Integration

**Supported Extractions:**
- Order details from customer messages
- Payment confirmations
- Delivery addresses
- Customer phone numbers

**Common Patterns:**
- "Nak order [product] [quantity]"
- "Dah transfer"
- "COD"
- Bank transfer screenshots

### 3.4 Expense & Order Management

**Expense Entry:**
- Manual quick add (amount + category)
- Voice input ("Spent fifty ringgit on petrol")
- Receipt scan
- Recurring expense templates

**Order Tracking:**
- Simple status: Pending → Paid → Completed
- Link customer to order
- Payment method tracking
- Profit calculation (if cost set)

### 3.5 Wallet System

**Features:**
- Multiple wallets (Cash, Bank, E-wallets)
- Transfer between wallets
- Auto-deduct from selected wallet
- Daily closing balance

### 3.6 Customer Management

**Basic CRM:**
- Name & phone number
- Total orders
- Outstanding balance
- Last order date
- Quick WhatsApp button

### 3.7 Dashboard & Analytics

**Homepage Widgets:**
- Today's sales & expenses
- Pending orders count
- Daily profit
- Quick scan button (prominent)
- Last 5 transactions

**Reports:**
- Daily/Weekly/Monthly summary
- Top expenses categories
- Best customers
- Profit trends

### 3.8 Google Sheets Sync

**Two-Way Integration:**
- Auto-create monthly sheets
- Real-time sync
- Predefined templates
- Share sheets with accountant

**Sheet Structure:**
```
Date | Type | Description | Amount | Category | Customer | Payment | Wallet
```

### 3.9 Gamification System

**New User Rewards:**
- First receipt scanned → 7 days premium
- Complete profile → 3 days premium
- First week streak → 14 days premium
- Invite friend → 7 days premium each

**Achievement Badges:**
- 🎯 First Sale
- 📸 10 Receipts Scanned
- 💰 First Profitable Day
- 🔥 7-Day Tracking Streak

## 4. Design Specifications

### 4.1 Design Principles
- **Minimalist**: Maximum 3 actions per screen
- **Thumb-Friendly**: Bottom navigation, reachable CTAs
- **High Contrast**: Dark mode default
- **Instant Feedback**: Micro-animations, haptic feedback

### 4.2 Color Palette
- **Primary**: #6366F1 (Indigo)
- **Background**: #000000 (Pure Black)
- **Surface**: #1A1A1A
- **Text Primary**: #FFFFFF
- **Text Secondary**: #A0A0A0
- **Success**: #10B981
- **Warning**: #F59E0B
- **Error**: #EF4444

### 4.3 Typography
- **Font**: Inter Variable
- **Headings**: 24sp/20sp (Bold)
- **Body**: 16sp (Regular)
- **Captions**: 14sp (Medium)

### 4.4 Key Screens
- **Dashboard**: Widget-based, customizable
- **Quick Add**: Full-screen modal, number pad prominent
- **Receipt Scanner**: Camera with guide overlay
- **Transactions**: Infinite scroll with search
- **Analytics**: Chart-heavy, swipeable periods

## 5. Development Roadmap - 2 Day Sprint

### Day 1: Core Foundation & Basic Features
**Total**: 14-16 hours

#### Morning Session (4 hours)

**1. Project Setup & Authentication (2 hours)**
- Initialize Expo project with TypeScript
- Configure Supabase project
- Implement authentication screens:
  - Splash screen with logo
  - Login screen (Google OAuth, Email)
  - Sign-up flow
  - Password reset
- Set up navigation structure (React Navigation)

**2. Database Schema & Models (2 hours)**
```sql
-- Core tables
users (id, email, business_name, phone, created_at)
wallets (id, user_id, name, type, balance, is_primary)
expenses (id, user_id, amount, category, description, receipt_url, created_at, wallet_id)
orders (id, user_id, customer_id, amount, status, payment_method, created_at)
customers (id, user_id, name, phone, total_spent, last_order_date)
receipts (id, user_id, image_url, extracted_data, processed_at)
```

#### Afternoon Session (4 hours)

**3. Dashboard & Navigation (2 hours)**
- Bottom tab navigation setup
- Dashboard with placeholder widgets:
  - Today's summary card
  - Quick actions grid
  - Recent transactions list
- Pull-to-refresh functionality
- Dark mode implementation

**4. Manual Expense Entry (2 hours)**
- Quick add expense modal
- Category selection (predefined)
- Amount input with calculator UI
- Wallet selection
- Save to Supabase
- Success feedback animation

#### Evening Session (6-8 hours)

**5. Receipt Scanning Module (3 hours)**
- Camera integration with Expo Camera
- Image picker for gallery
- Image preview & crop
- Upload to Supabase Storage
- Basic OCR with ML Kit (offline)
- Groq API integration for extraction
- Manual correction interface

**6. WhatsApp Screenshot Parser (3 hours)**
- Screenshot upload interface
- Pattern recognition for orders:
```javascript
// Common patterns to detect
const patterns = {
  order: /(?:nak|order|pesan)\s+(\d+)\s+(.+)/i,
  payment: /(?:dah|sudah|done)\s+(?:transfer|bayar|trf)/i,
  amount: /RM\s?(\d+(?:\.\d{2})?)/i
}
```
- Customer extraction from messages
- Order creation from parsed data

**7. Basic Wallet System (2 hours)**
- Wallet CRUD operations
- Balance tracking
- Transaction history per wallet
- Default wallet selection

### Day 2: Advanced Features & Polish
**Total**: 14-16 hours

#### Morning Session (4 hours)

**8. Google Sheets Integration (3 hours)**
- Google Sheets API setup
- OAuth consent for Sheets access
- Template sheet creation:
```javascript
const sheetTemplate = {
  headers: ['Date', 'Type', 'Description', 'Amount', 'Category', 'Customer', 'Wallet'],
  name: `PocketMoney_${monthYear}`
}
```
- Bi-directional sync logic
- Conflict resolution
- Auto-backup scheduling

**9. Customer Management (1 hour)**
- Customer list with search
- Add/Edit customer
- Link to orders
- WhatsApp quick action
- Outstanding balance tracking

#### Afternoon Session (4 hours)

**10. Voice Input Integration (2 hours)**
- React Native Voice setup
- Speech-to-text processing
- Natural language parsing:
```javascript
// Parse commands like:
"Beli barang seratus ringgit" → Expense: RM100, Category: Supplies
"Customer Ali bayar lima puluh" → Payment: RM50, Customer: Ali
```
- Multi-language support (English/Malay)

**11. Analytics & Reports (2 hours)**
- Daily/Weekly/Monthly views
- Profit calculation
- Expense breakdown pie chart
- Top customers list
- Trends line graph
- Export to PDF/Image

#### Evening Session (6-8 hours)

**12. Gamification System (2 hours)**
- Achievement tracking
- Progress bars
- Reward unlocking logic
- Premium trial activation
- Streak counter
- Notification scheduling for streaks

**13. Biometric Authentication (1 hour)**
- Face ID/Touch ID integration
- Secure token storage
- Quick login flow
- Fallback to PIN

**14. UI Polish & Animations (3 hours)**
- Micro-interactions:
  - Button press effects
  - Card swipe gestures
  - Pull-to-refresh custom animation
  - Success checkmarks
  - Loading skeletons
- Glassmorphism effects
- Haptic feedback
- Screen transitions

**15. Testing & Bug Fixes (2 hours)**
- Core flow testing
- Edge case handling
- Performance optimization
- Memory leak checks
- Offline mode testing

## 6. API Specifications

### 6.1 Groq AI Integration
```javascript
// Receipt parsing prompt
const prompt = `
Extract from this receipt:
- Store name
- Total amount in RM
- Date
- Items (if visible)
- Payment method
Return as JSON
`;
```

### 6.2 Supabase Realtime
```javascript
// Sync expenses across devices
const subscription = supabase
  .from('expenses')
  .on('INSERT', handleNewExpense)
  .on('UPDATE', handleUpdateExpense)
  .subscribe();
```

### 6.3 Google Sheets API
```javascript
// Append new expense
const appendRow = {
  spreadsheetId: userSpreadsheetId,
  range: 'A:H',
  valueInputOption: 'RAW',
  resource: {
    values: [[date, type, description, amount, category, customer, payment, wallet]]
  }
};
```

## 7. Subscription Tiers

### Free Tier
- 30 receipts/month
- 1 wallet
- Basic categories
- Manual entry only
- 7-day data retention

### Premium (RM 9.90/month)
- Unlimited receipts
- Unlimited wallets
- WhatsApp extraction
- Voice input
- Google Sheets sync
- All analytics
- Data export
- Priority support

## 8. Success Metrics

### Week 1 Launch Metrics
- 100 downloads
- 30% complete onboarding
- 50% scan first receipt
- 20% achieve 3-day streak

### Month 1 Targets
- 1,000 active users
- 15% premium conversion
- 4.5+ App Store rating
- 60% weekly retention

## 9. Risk Mitigation

### Technical Risks
- **OCR Accuracy**: Fallback to manual correction
- **API Limits**: Implement caching and queuing
- **Offline Sync**: Robust conflict resolution

### User Adoption Risks
- **Complexity**: Progressive disclosure of features
- **Language Barrier**: Full Malay translation by Week 2
- **Trust**: Bank-level encryption messaging

## 10. Future Enhancements (Post-MVP)
- Invoice generation
- Payment links
- Tax report generation
- Multi-business support
- Team collaboration
- Inventory tracking
- Supplier management
- Automated bookkeeping
- Regional expansion features

## Appendix A: User Stories
- As a warung owner, I want to scan my supplier receipts so that I can track my daily costs
- As an online seller, I want to extract WhatsApp orders so that I don't miss any sales
- As a freelancer, I want to track project payments so that I know my monthly income
- As a food stall owner, I want to see daily profit so that I know if I'm making money
- As a part-time seller, I want voice input so that I can add expenses while driving

## Appendix B: Competitive Advantages
- **WhatsApp-First**: No other app extracts orders from WhatsApp
- **Truly Local**: Understands Malaysian business patterns
- **Simplicity**: 30-second onboarding
- **Offline-First**: Works without internet
- **Fair Pricing**: RM 9.90 vs competitors' RM 30+