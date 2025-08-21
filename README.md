# PocketMoney - Malaysian Small Business Expense Tracker

A mobile-first expense tracking application designed specifically for Malaysian small business owners. PocketMoney focuses on simplicity and automation through receipt scanning, WhatsApp order extraction, and Google Sheets integration.

## 🚀 Features

### Core Functionality
- **📱 React Native + Expo** - Cross-platform mobile app
- **🔐 Supabase Authentication** - Secure user management
- **🌙 Dark Mode** - Professional dark theme optimized for mobile
- **📊 Real-time Dashboard** - Today's sales, expenses, and profit tracking

### Smart Data Entry
- **📷 Receipt Scanning** - AI-powered receipt extraction using Groq API
- **💬 WhatsApp Integration** - Parse orders from WhatsApp screenshots
- **🎤 Voice Input** - Multi-language voice commands (English/Malay)
- **🧮 Calculator UI** - Built-in calculator for manual expense entry

### Business Management
- **💰 Multi-Wallet System** - Track cash, bank, and e-wallet balances
- **👥 Customer Management** - CRM with WhatsApp integration
- **📈 Analytics & Reports** - Comprehensive business insights
- **📊 Google Sheets Sync** - Automatic data backup and sharing

### Gamification & Engagement
- **🏆 Achievement System** - Unlock premium features through usage
- **🔥 Streak Tracking** - Daily tracking streaks with rewards
- **⭐ Premium Rewards** - Earn premium access through achievements

### Security & UX
- **👆 Biometric Authentication** - Face ID/Touch ID support
- **📱 Offline-First** - Works without internet connection
- **🇲🇾 Malaysian Localization** - Built for Malaysian business patterns

## 🛠 Tech Stack

### Frontend
- **React Native** with Expo SDK
- **TypeScript** for type safety
- **React Navigation** for routing
- **Reanimated** for smooth animations

### Backend & Services
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **Groq API** for AI-powered receipt processing
- **Google Sheets API** for data export
- **Expo Camera** for receipt scanning
- **Voice Recognition** for hands-free input

### Development Tools
- **Expo CLI** for development and building
- **ESLint & Prettier** for code quality
- **TypeScript** for type checking

## 📱 Screenshots & Demo

### Key Screens
- **Dashboard** - Today's metrics and quick actions
- **Receipt Scanner** - AI-powered receipt processing
- **WhatsApp Parser** - Extract orders from screenshots
- **Analytics** - Business insights and trends
- **Achievements** - Gamified user engagement

## 🏗 Project Structure

```
PocketMoney/
├── components/          # Reusable UI components
│   ├── AddExpenseModal.tsx
│   ├── ReceiptScannerModal.tsx
│   ├── WhatsAppParserModal.tsx
│   ├── WalletManagementModal.tsx
│   ├── VoiceInputModal.tsx
│   └── AchievementsModal.tsx
├── screens/            # Main application screens
│   ├── SplashScreen.tsx
│   ├── LoginScreen.tsx
│   ├── SignUpScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── TransactionsScreen.tsx
│   ├── AnalyticsScreen.tsx
│   ├── CustomersScreen.tsx
│   └── ProfileScreen.tsx
├── navigation/         # Navigation configuration
│   ├── AppNavigator.tsx
│   └── MainTabNavigator.tsx
├── services/          # Business logic and API calls
│   ├── groqService.ts
│   ├── walletService.ts
│   ├── googleSheetsService.ts
│   ├── voiceService.ts
│   ├── gamificationService.ts
│   └── biometricService.ts
├── lib/               # Core configuration
│   └── supabase.ts
├── types/             # TypeScript definitions
│   └── database.ts
├── constants/         # Theme and constants
│   └── theme.ts
└── supabase/          # Database schema
    └── schema.sql
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Mac) or Android Studio
- Supabase account
- Groq API key (optional, for AI features)

### Installation

1. **Clone and install dependencies**
   ```bash
   cd PocketMoney
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env with your credentials
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key
   ```

3. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql`
   - Enable Row Level Security (RLS)
   - Configure authentication providers

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## 🗄 Database Schema

The app uses Supabase with the following main tables:

- **users** - User profiles and business information
- **wallets** - Multiple wallet/account management
- **expenses** - Expense transactions with categories
- **orders** - Income/sales orders
- **customers** - Customer relationship management
- **receipts** - Receipt images and extracted data
- **user_achievements** - Gamification progress
- **user_settings** - User preferences and premium status

## 🎯 Core Features Implementation

### Receipt Scanning
```typescript
// Groq AI integration for receipt processing
const extractedData = await groqService.extractReceiptData(imageUrl)
```

### WhatsApp Integration
```typescript
// Pattern recognition for Malaysian WhatsApp orders
const patterns = {
  order: /(?:nak|order|pesan)\s+(.+)/gi,
  payment: /(?:dah|sudah|done)\s+(?:transfer|bayar|trf)/gi,
  amount: /rm\s*(\d+(?:\.\d{2})?)/gi
}
```

### Voice Commands
```typescript
// Multi-language voice processing
"Spent 25 ringgit on petrol" → Expense: RM25, Category: Transport
"Beli RM 15 untuk makan" → Expense: RM15, Category: Food
```

### Wallet Management
```typescript
// Real-time balance tracking across multiple wallets
await walletService.transferBetweenWallets(fromWallet, toWallet, amount)
```

## 🎮 Gamification System

### Achievement Examples
- **First Scan** - Scan your first receipt → 7 days premium
- **Week Warrior** - 7-day tracking streak → 14 days premium
- **Big Earner** - Reach RM 1,000 revenue → 14 days premium
- **Customer Collector** - Add 10 customers → 7 days premium

### Premium Features
- Unlimited receipts
- WhatsApp extraction
- Voice input
- Google Sheets sync
- Advanced analytics

## 📊 Analytics & Insights

- **Daily/Weekly/Monthly** revenue and expense trends
- **Category breakdown** with visual charts
- **Profit margin** calculations
- **Top customers** analysis
- **Export capabilities** to PDF and Google Sheets

## 🌍 Malaysian Business Focus

### Localization Features
- **Currency**: Malaysian Ringgit (RM) formatting
- **Language**: English and Bahasa Malaysia support
- **Business Types**: Warung, online sellers, freelancers
- **Payment Methods**: Cash, bank transfer, e-wallets, COD
- **GST/SST**: Automatic tax calculation and reporting

### Common Use Cases
- **Warung owners** tracking daily supplies and sales
- **Online sellers** managing WhatsApp orders
- **Freelancers** recording project payments
- **Food stall operators** calculating daily profit
- **Small retailers** inventory and customer management

## 🔒 Security & Privacy

- **Row Level Security** on all database operations
- **Biometric authentication** for app access
- **Encrypted data** transmission and storage
- **Local-first** approach with offline capabilities
- **GDPR compliant** data handling

## 🚀 Deployment

### Building for Production
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# Both platforms
eas build --platform all
```

### App Store Submission
1. Configure app.json with store metadata
2. Generate app icons and splash screens
3. Build signed binaries with EAS Build
4. Submit to Apple App Store and Google Play Store

## 📈 Future Roadmap

### Upcoming Features
- **Invoice generation** with Malaysian tax compliance
- **Multi-business support** for larger operations
- **Team collaboration** features
- **Advanced inventory** tracking
- **Supplier management** system
- **Tax report** generation for LHDN
- **Payment gateway** integration

### Regional Expansion
- **Singapore** business patterns
- **Indonesia** localization
- **Thailand** market adaptation

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:
- Code style and standards
- Pull request process
- Issue reporting
- Feature requests

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- **Email**: support@pocketmoney.my
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Detailed guides and API reference

## 🙏 Acknowledgments

- **Expo Team** for the amazing development platform
- **Supabase** for the backend infrastructure
- **Groq** for AI-powered receipt processing
- **Malaysian SME community** for feedback and testing

---

**Built with ❤️ for Malaysian small businesses**

Transform your business from financial chaos to clarity in under 30 seconds per transaction.