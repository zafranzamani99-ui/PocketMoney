import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'
import { usePOSSettings } from '../contexts/POSSettingsContext'

const { width: screenWidth } = Dimensions.get('window')
const isTablet = screenWidth >= 768

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

export default function POSSettingsScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const { 
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
    saveSettings 
  } = usePOSSettings()
  
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [editingItem, setEditingItem] = useState<QuickItem | null>(null)

  const handleUpdateQuickItem = (itemId: string, field: string, value: string | number) => {
    updateQuickItem(selectedEventId, itemId, { [field]: value })
  }

  const handleUpdateQuickAmount = (index: number, value: number) => {
    const updatedAmounts = currentEvent.quickAmounts.map((amount, i) =>
      i === index ? value : amount
    )
    updateEventSettings(selectedEventId, { quickAmounts: updatedAmounts })
  }

  const handleAddNewItem = () => {
    const newItem = {
      name: 'New Item',
      price: 1,
      emoji: '📦',
      color: '#2196F3'
    }
    addQuickItem(selectedEventId, newItem)
  }

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeQuickItem(selectedEventId, itemId) }
      ]
    )
  }

  const handleAddNewEvent = () => {
    const newEvent = {
      name: 'New Event',
      quickItems: [...currentEvent.quickItems],
      quickAmounts: [...currentEvent.quickAmounts]
    }
    addEvent(newEvent)
  }

  const handleDeleteEvent = (eventId: string) => {
    if (events.length <= 1) {
      Alert.alert('Cannot Delete', 'You must have at least one event.')
      return
    }
    
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeEvent(eventId) }
      ]
    )
  }

  const handleSaveSettings = async () => {
    await saveSettings()
    Alert.alert('Settings Saved', 'Your POS settings have been saved successfully!')
  }

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container} edges={isTablet ? ['top'] : ['top', 'bottom']}>
      <View style={[styles.wrapper, isTablet && styles.tabletWrapper]}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>POS Settings</Text>
          <TouchableOpacity onPress={handleSaveSettings}>
            <Text style={styles.saveBtn}>SAVE</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* EVENT MANAGEMENT */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EVENT MANAGEMENT</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddNewEvent}>
              <Text style={styles.addBtnText}>+ NEW EVENT</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.eventSelector}>
            {events.map(event => (
              <View key={event.id} style={styles.eventContainer}>
                <TouchableOpacity
                  style={[
                    styles.eventBtn,
                    selectedEventId === event.id && styles.eventBtnActive
                  ]}
                  onPress={() => setSelectedEventId(event.id)}
                >
                  <Text style={[
                    styles.eventText,
                    selectedEventId === event.id && styles.eventTextActive
                  ]}>
                    {event.name}
                  </Text>
                </TouchableOpacity>
                {events.length > 1 && (
                  <TouchableOpacity
                    style={styles.deleteEventBtn}
                    onPress={() => handleDeleteEvent(event.id)}
                  >
                    <Text style={styles.deleteEventText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* QUICK ITEMS MANAGEMENT */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>QUICK ITEMS</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddNewItem}>
              <Text style={styles.addBtnText}>+ ADD ITEM</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>Customize your quick sale items and prices</Text>
          
          <View style={styles.quickItemsGrid}>
            {currentEvent.quickItems.map(item => (
              <View key={item.id} style={[styles.itemCard, { borderColor: item.color }]}>
                <TouchableOpacity
                  style={styles.deleteItemBtn}
                  onPress={() => handleDeleteItem(item.id)}
                >
                  <Text style={styles.deleteItemText}>×</Text>
                </TouchableOpacity>
                
                <View style={styles.itemHeader}>
                  <TextInput
                    style={styles.emojiInput}
                    value={item.emoji}
                    onChangeText={(text) => handleUpdateQuickItem(item.id, 'emoji', text)}
                    placeholder="📦"
                    maxLength={2}
                  />
                  <TextInput
                    style={styles.nameInput}
                    value={item.name}
                    onChangeText={(text) => handleUpdateQuickItem(item.id, 'name', text)}
                    placeholder="Item Name"
                  />
                </View>
                
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Price:</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={item.price.toString()}
                    onChangeText={(text) => handleUpdateQuickItem(item.id, 'price', parseFloat(text) || 0)}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                  <Text style={styles.currency}>RM</Text>
                </View>
              </View>
            ))}
          </View>

          {/* QUICK AMOUNTS SETTINGS */}
          <Text style={styles.sectionTitle}>QUICK AMOUNTS</Text>
          <Text style={styles.sectionSubtitle}>Set quick amount buttons for fast sales</Text>
          
          <View style={styles.quickAmountsGrid}>
            {currentEvent.quickAmounts.map((amount, index) => (
              <View key={index} style={styles.amountCard}>
                <Text style={styles.amountLabel}>Amount {index + 1}:</Text>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    value={amount.toString()}
                    onChangeText={(text) => handleUpdateQuickAmount(index, parseFloat(text) || 0)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <Text style={styles.currency}>RM</Text>
                </View>
              </View>
            ))}
          </View>

          {/* EVENT PRICING INFO */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>💡 Event-Based Pricing</Text>
            <Text style={styles.infoText}>
              Switch between different pricing modes for regular sales vs special events like festivals, where you might charge higher prices.
            </Text>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrapper: {
    flex: 1,
  },
  tabletWrapper: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '95%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    fontSize: Typography.fontSizes.body,
    color: colors.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  saveBtn: {
    fontSize: Typography.fontSizes.body,
    color: colors.success,
    fontFamily: Typography.fontFamily.bold,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  addBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  addBtnText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.light,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSizes.bodySmall,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
  eventSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  eventContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minWidth: 120,
  },
  deleteEventBtn: {
    backgroundColor: colors.error,
    borderRadius: BorderRadius.sm,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  deleteEventText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  eventBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  eventText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  eventTextActive: {
    color: colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  quickItemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  itemCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  deleteItemBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: BorderRadius.sm,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  deleteItemText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  itemHeader: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emojiInput: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    backgroundColor: colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    minWidth: 40,
  },
  nameInput: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
    textAlign: 'center',
    backgroundColor: colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    minWidth: 80,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceLabel: {
    fontSize: Typography.fontSizes.bodySmall,
    color: colors.textSecondary,
    marginRight: Spacing.xs,
  },
  priceInput: {
    backgroundColor: colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    textAlign: 'center',
    minWidth: 60,
    marginRight: Spacing.xs,
  },
  currency: {
    fontSize: Typography.fontSizes.bodySmall,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  amountCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: Typography.fontSizes.bodySmall,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    backgroundColor: colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    textAlign: 'center',
    minWidth: 80,
    marginRight: Spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  infoTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.primary,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: Typography.fontSizes.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
})