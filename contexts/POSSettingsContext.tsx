import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface QuickItem {
  id: string
  name: string
  price: number
  emoji: string
  color: string
}

interface EventSettings {
  id: string
  name: string
  quickItems: QuickItem[]
  quickAmounts: number[]
}

interface POSSettingsContextType {
  events: EventSettings[]
  selectedEventId: string
  currentEvent: EventSettings
  setSelectedEventId: (id: string) => void
  updateEventSettings: (eventId: string, settings: Partial<EventSettings>) => void
  addQuickItem: (eventId: string, item: Omit<QuickItem, 'id'>) => void
  removeQuickItem: (eventId: string, itemId: string) => void
  updateQuickItem: (eventId: string, itemId: string, updates: Partial<QuickItem>) => void
  addEvent: (event: Omit<EventSettings, 'id'>) => void
  removeEvent: (eventId: string) => void
  updateEvent: (eventId: string, updates: Partial<EventSettings>) => void
  saveSettings: () => Promise<void>
  loadSettings: () => Promise<void>
}

const DEFAULT_EVENTS: EventSettings[] = [
  {
    id: 'regular',
    name: 'Regular Sales',
    quickItems: [
      { id: '1', name: 'Balang Kecil', price: 2, emoji: '🥤', color: '#4CAF50' },
      { id: '2', name: 'Balang Besar', price: 5, emoji: '🍯', color: '#2196F3' },
      { id: '3', name: 'Botol Air', price: 1, emoji: '💧', color: '#00BCD4' },
      { id: '4', name: 'Makanan', price: 3, emoji: '🍱', color: '#FF9800' },
      { id: '5', name: 'Minuman', price: 2.5, emoji: '🥤', color: '#9C27B0' },
      { id: '6', name: 'Kuih', price: 1.5, emoji: '🧁', color: '#E91E63' },
    ],
    quickAmounts: [5, 10, 20, 50]
  },
  {
    id: 'festival',
    name: 'Festival/Event',
    quickItems: [
      { id: '1', name: 'Balang Kecil', price: 3, emoji: '🥤', color: '#4CAF50' },
      { id: '2', name: 'Balang Besar', price: 7, emoji: '🍯', color: '#2196F3' },
      { id: '3', name: 'Botol Air', price: 2, emoji: '💧', color: '#00BCD4' },
      { id: '4', name: 'Makanan', price: 5, emoji: '🍱', color: '#FF9800' },
      { id: '5', name: 'Minuman', price: 4, emoji: '🥤', color: '#9C27B0' },
      { id: '6', name: 'Kuih', price: 3, emoji: '🧁', color: '#E91E63' },
    ],
    quickAmounts: [10, 20, 50, 100]
  }
]

const POSSettingsContext = createContext<POSSettingsContextType | undefined>(undefined)

export function POSSettingsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventSettings[]>(DEFAULT_EVENTS)
  const [selectedEventId, setSelectedEventId] = useState('regular')

  const currentEvent = events.find(e => e.id === selectedEventId) || events[0]

  const updateEventSettings = (eventId: string, settings: Partial<EventSettings>) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? { ...event, ...settings }
          : event
      )
    )
  }

  const addQuickItem = (eventId: string, item: Omit<QuickItem, 'id'>) => {
    const newItem = { ...item, id: Date.now().toString() }
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId
          ? { ...event, quickItems: [...event.quickItems, newItem] }
          : event
      )
    )
  }

  const removeQuickItem = (eventId: string, itemId: string) => {
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId
          ? { ...event, quickItems: event.quickItems.filter(item => item.id !== itemId) }
          : event
      )
    )
  }

  const updateQuickItem = (eventId: string, itemId: string, updates: Partial<QuickItem>) => {
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId
          ? {
              ...event,
              quickItems: event.quickItems.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              )
            }
          : event
      )
    )
  }

  const addEvent = (event: Omit<EventSettings, 'id'>) => {
    const newEvent = { ...event, id: Date.now().toString() }
    setEvents(prevEvents => [...prevEvents, newEvent])
  }

  const removeEvent = (eventId: string) => {
    setEvents(prevEvents => {
      const filtered = prevEvents.filter(event => event.id !== eventId)
      // If removing current event, switch to first available
      if (selectedEventId === eventId && filtered.length > 0) {
        setSelectedEventId(filtered[0].id)
      }
      return filtered
    })
  }

  const updateEvent = (eventId: string, updates: Partial<EventSettings>) => {
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId ? { ...event, ...updates } : event
      )
    )
  }

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('@pos_settings', JSON.stringify({
        events,
        selectedEventId
      }))
    } catch (error) {
      console.error('Error saving POS settings:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('@pos_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setEvents(parsed.events || DEFAULT_EVENTS)
        setSelectedEventId(parsed.selectedEventId || 'regular')
      }
    } catch (error) {
      console.error('Error loading POS settings:', error)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  return (
    <POSSettingsContext.Provider value={{
      events,
      selectedEventId,
      currentEvent,
      setSelectedEventId,
      updateEventSettings,
      addQuickItem,
      removeQuickItem,
      updateQuickItem,
      addEvent,
      removeEvent,
      updateEvent,
      saveSettings,
      loadSettings
    }}>
      {children}
    </POSSettingsContext.Provider>
  )
}

export function usePOSSettings() {
  const context = useContext(POSSettingsContext)
  if (!context) {
    throw new Error('usePOSSettings must be used within POSSettingsProvider')
  }
  return context
}