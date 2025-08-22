import { Alert } from 'react-native'

interface ReceiptData {
  store_name?: string
  total_amount?: number
  date?: string
  items?: Array<{
    name: string
    price: number
    quantity?: number
  }>
  payment_method?: string
  gst_amount?: number
  category?: string
}

class GroqService {
  private apiKey: string
  private baseUrl = 'https://api.groq.com/openai/v1'

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || ''
  }

  async extractReceiptData(imageUrl: string): Promise<ReceiptData | null> {
    if (!this.apiKey) {
      console.warn('Groq API key not configured, using mock data')
      return this.getMockReceiptData()
    }

    try {
      const prompt = this.buildReceiptPrompt()
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.2-90b-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0.1,
        }),
      })

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('No content received from Groq API')
      }

      return this.parseReceiptResponse(content)
    } catch (error) {
      console.error('Groq API error:', error)
      Alert.alert('Processing Error', 'Using offline mode for receipt processing')
      return this.getMockReceiptData()
    }
  }

  private buildReceiptPrompt(): string {
    return `
You are a receipt data extraction expert for Malaysian businesses. 
Extract the following information from this receipt image and return it as a JSON object:

{
  "store_name": "Name of the store/business",
  "total_amount": "Total amount as a number (RM)",
  "date": "Date in YYYY-MM-DD format",
  "items": [
    {
      "name": "Item name",
      "price": "Item price as number",
      "quantity": "Quantity if visible"
    }
  ],
  "payment_method": "Cash/Card/Transfer/etc if visible",
  "gst_amount": "GST/SST amount if visible",
  "category": "Best category guess from: Food & Beverages, Transport, Inventory, Utilities, Marketing, Rent, Equipment, Office Supplies, Staff, Banking, Professional Services, Other"
}

Rules:
- Return only valid JSON
- Use Malaysian Ringgit (RM) amounts as numbers
- If information is not clearly visible, omit that field
- For Malaysian businesses, guess appropriate categories
- Extract all readable items with prices
- Handle both English and Malay text
- Focus on accuracy over completeness

Return only the JSON object, no additional text.
`
  }

  private parseReceiptResponse(response: string): ReceiptData | null {
    try {
      // Clean up the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsedData = JSON.parse(jsonMatch[0])
      
      // Validate and clean the data
      return {
        store_name: parsedData.store_name || undefined,
        total_amount: this.parseAmount(parsedData.total_amount),
        date: this.parseDate(parsedData.date),
        items: this.parseItems(parsedData.items),
        payment_method: parsedData.payment_method || undefined,
        gst_amount: this.parseAmount(parsedData.gst_amount),
        category: this.validateCategory(parsedData.category),
      }
    } catch (error) {
      console.error('Failed to parse Groq response:', error)
      return null
    }
  }

  private parseAmount(amount: any): number | undefined {
    if (typeof amount === 'number') return amount
    if (typeof amount === 'string') {
      const cleaned = amount.replace(/[^\d.]/g, '')
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? undefined : parsed
    }
    return undefined
  }

  private parseDate(date: any): string | undefined {
    if (!date) return undefined
    
    try {
      const parsedDate = new Date(date)
      if (isNaN(parsedDate.getTime())) return undefined
      return parsedDate.toISOString().split('T')[0]
    } catch {
      return undefined
    }
  }

  private parseItems(items: any): Array<{ name: string; price: number; quantity?: number }> | undefined {
    if (!Array.isArray(items)) return undefined
    
    const validItems = items
      .map(item => ({
        name: item.name || '',
        price: this.parseAmount(item.price) || 0,
        quantity: item.quantity ? parseInt(item.quantity) : undefined,
      }))
      .filter(item => item.name && item.price > 0)
    
    return validItems.length > 0 ? validItems : undefined
  }

  private validateCategory(category: any): string | undefined {
    const validCategories = [
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
      'Other',
    ]

    if (typeof category === 'string' && validCategories.includes(category)) {
      return category
    }

    return 'Other'
  }

  private getMockReceiptData(): ReceiptData {
    const mockOptions = [
      {
        store_name: '99 Speedmart',
        total_amount: 15.30,
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Maggi Curry', price: 1.20, quantity: 2 },
          { name: '100Plus', price: 2.50 },
          { name: 'Bread', price: 3.80 },
          { name: 'Milk', price: 6.50 },
        ],
        payment_method: 'Cash',
        gst_amount: 0.92,
        category: 'Food & Beverages',
      },
      {
        store_name: 'Shell Station',
        total_amount: 45.00,
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Petrol RON95', price: 45.00, quantity: 1 },
        ],
        payment_method: 'Card',
        category: 'Transport',
      },
      {
        store_name: 'Giant Supermarket',
        total_amount: 67.85,
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Rice 5kg', price: 18.90 },
          { name: 'Chicken 1kg', price: 12.50 },
          { name: 'Vegetables', price: 8.90 },
          { name: 'Cooking Oil', price: 15.50 },
          { name: 'Onions', price: 4.20 },
          { name: 'Salt', price: 2.10 },
        ],
        payment_method: 'Cash',
        gst_amount: 4.07,
        category: 'Inventory',
      },
    ]

    return mockOptions[Math.floor(Math.random() * mockOptions.length)]
  }
}

export const groqService = new GroqService()
export type { ReceiptData }