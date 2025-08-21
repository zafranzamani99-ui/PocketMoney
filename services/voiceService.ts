import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice'
import { Alert } from 'react-native'

interface VoiceResult {
  command: 'expense' | 'income' | 'unknown'
  amount?: number
  description?: string
  category?: string
  customer?: string
}

class VoiceService {
  private isInitialized = false
  private isListening = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      Voice.onSpeechStart = this.onSpeechStart.bind(this)
      Voice.onSpeechEnd = this.onSpeechEnd.bind(this)
      Voice.onSpeechResults = this.onSpeechResults.bind(this)
      Voice.onSpeechError = this.onSpeechError.bind(this)

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize voice service:', error)
      throw error
    }
  }

  async startListening(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (this.isListening) {
      await this.stopListening()
    }

    try {
      await Voice.start('en-US') // Also supports 'ms-MY' for Malay
      this.isListening = true
    } catch (error) {
      console.error('Failed to start voice recognition:', error)
      throw error
    }
  }

  async stopListening(): Promise<void> {
    try {
      await Voice.stop()
      this.isListening = false
    } catch (error) {
      console.error('Failed to stop voice recognition:', error)
    }
  }

  async destroy(): Promise<void> {
    try {
      await Voice.destroy()
      this.isInitialized = false
      this.isListening = false
    } catch (error) {
      console.error('Failed to destroy voice service:', error)
    }
  }

  private onSpeechStart = () => {
    console.log('Voice recognition started')
  }

  private onSpeechEnd = () => {
    console.log('Voice recognition ended')
    this.isListening = false
  }

  private onSpeechResults = (event: SpeechResultsEvent) => {
    const results = event.value
    if (results && results.length > 0) {
      const spokenText = results[0]
      console.log('Voice recognition result:', spokenText)
      this.processVoiceCommand(spokenText)
    }
  }

  private onSpeechError = (event: SpeechErrorEvent) => {
    console.error('Voice recognition error:', event.error)
    this.isListening = false
    Alert.alert('Voice Error', 'Failed to recognize speech. Please try again.')
  }

  private processVoiceCommand(spokenText: string): VoiceResult {
    const text = spokenText.toLowerCase()
    
    // English patterns
    const englishPatterns = {
      expense: [
        /(?:spent|spend|bought|buy|paid|pay)\s+(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit|dollars?)?\s+(?:on|for)\s+(.+)/i,
        /(?:expense|cost)\s+(?:of\s+)?(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit|dollars?)?\s+(?:for|on)\s+(.+)/i,
        /(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit|dollars?)?\s+(?:spent|paid)\s+(?:on|for)\s+(.+)/i,
      ],
      income: [
        /(?:received|earned|got|sold)\s+(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit|dollars?)?\s+(?:from|for)\s+(.+)/i,
        /(?:income|revenue|sales?)\s+(?:of\s+)?(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit|dollars?)?\s+(?:from|for)\s+(.+)/i,
        /(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit|dollars?)?\s+(?:received|earned|got)\s+(?:from|for)\s+(.+)/i,
      ],
    }

    // Malay patterns
    const malayPatterns = {
      expense: [
        /(?:beli|belanja|bayar|spent)\s+(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit)?\s+(?:untuk|on)\s+(.+)/i,
        /(?:perbelanjaan|kos)\s+(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit)?\s+(?:untuk|on)\s+(.+)/i,
      ],
      income: [
        /(?:dapat|terima|jual)\s+(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit)?\s+(?:dari|daripada|for)\s+(.+)/i,
        /(?:pendapatan|jualan)\s+(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit)?\s+(?:dari|daripada|for)\s+(.+)/i,
      ],
    }

    // Try to match expense patterns
    for (const pattern of [...englishPatterns.expense, ...malayPatterns.expense]) {
      const match = text.match(pattern)
      if (match) {
        const amount = parseFloat(match[1])
        const description = match[2].trim()
        const category = this.categorizeExpense(description)
        
        return {
          command: 'expense',
          amount,
          description,
          category,
        }
      }
    }

    // Try to match income patterns
    for (const pattern of [...englishPatterns.income, ...malayPatterns.income]) {
      const match = text.match(pattern)
      if (match) {
        const amount = parseFloat(match[1])
        const description = match[2].trim()
        const customer = this.extractCustomerName(description)
        
        return {
          command: 'income',
          amount,
          description,
          customer,
        }
      }
    }

    // Simple amount extraction as fallback
    const amountMatch = text.match(/(?:rm\s*)?(\d+(?:\.\d{2})?)\s*(?:ringgit|dollars?)?/i)
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1])
      
      // Determine if it's expense or income based on keywords
      if (this.containsExpenseKeywords(text)) {
        return {
          command: 'expense',
          amount,
          description: text,
          category: 'Other',
        }
      } else if (this.containsIncomeKeywords(text)) {
        return {
          command: 'income',
          amount,
          description: text,
        }
      }
    }

    return { command: 'unknown' }
  }

  private categorizeExpense(description: string): string {
    const categories = {
      'Food & Beverages': ['food', 'eat', 'drink', 'restaurant', 'cafe', 'nasi', 'makan', 'minum', 'roti', 'teh', 'kopi'],
      'Transport': ['petrol', 'gas', 'fuel', 'taxi', 'grab', 'bus', 'minyak', 'transport', 'parking'],
      'Inventory': ['stock', 'supplies', 'inventory', 'barang', 'supplier', 'wholesale'],
      'Utilities': ['electric', 'water', 'phone', 'internet', 'bill', 'bil', 'elektrik', 'air'],
      'Marketing': ['ads', 'advertising', 'promotion', 'iklan', 'marketing'],
      'Equipment': ['equipment', 'machine', 'tool', 'mesin', 'alat'],
      'Office Supplies': ['paper', 'pen', 'office', 'kertas', 'pejabat'],
    }

    const lowerDesc = description.toLowerCase()
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerDesc.includes(keyword))) {
        return category
      }
    }

    return 'Other'
  }

  private extractCustomerName(description: string): string | undefined {
    // Simple extraction - look for names after "from" or "untuk"
    const namePatterns = [
      /(?:from|untuk|customer)\s+([a-z\s]+)/i,
      /([a-z]+)\s+(?:ordered|order|beli)/i,
    ]

    for (const pattern of namePatterns) {
      const match = description.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    return undefined
  }

  private containsExpenseKeywords(text: string): boolean {
    const expenseKeywords = [
      'spent', 'spend', 'bought', 'buy', 'paid', 'pay', 'expense', 'cost',
      'beli', 'belanja', 'bayar', 'perbelanjaan', 'kos'
    ]
    
    return expenseKeywords.some(keyword => text.includes(keyword))
  }

  private containsIncomeKeywords(text: string): boolean {
    const incomeKeywords = [
      'received', 'earned', 'got', 'sold', 'income', 'revenue', 'sales',
      'dapat', 'terima', 'jual', 'pendapatan', 'jualan'
    ]
    
    return incomeKeywords.some(keyword => text.includes(keyword))
  }

  getIsListening(): boolean {
    return this.isListening
  }

  // Voice commands examples for user guidance
  getExampleCommands(): { [key: string]: string[] } {
    return {
      'Expense Examples': [
        'Spent 15 ringgit on petrol',
        'Bought 25 dollars worth of food',
        'Paid RM 50 for supplies',
        'Beli RM 20 untuk makan',
      ],
      'Income Examples': [
        'Received 30 ringgit from Ali',
        'Sold 45 dollars to customer',
        'Got RM 100 for order',
        'Dapat RM 25 dari Siti',
      ],
    }
  }
}

export const voiceService = new VoiceService()
export type { VoiceResult }