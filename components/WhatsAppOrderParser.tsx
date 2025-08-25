import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'

interface ParsedOrder {
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  customerName?: string
  customerPhone?: string
  totalAmount: number
  paymentStatus: 'pending' | 'paid' | 'confirmed'
  paymentMethod?: string
}

interface WhatsAppOrderParserProps {
  visible: boolean
  onClose: () => void
  onOrderParsed: (order: ParsedOrder) => void
}

export default function WhatsAppOrderParser({ visible, onClose, onOrderParsed }: WhatsAppOrderParserProps) {
  const { colors }: any = useTheme()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedOrder | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  const styles = useMemo(() => createStyles(colors), [colors])

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to photos to upload WhatsApp screenshots')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri)
        parseWhatsAppImage(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take screenshots')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri)
        parseWhatsAppImage(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo')
    }
  }

  const parseWhatsAppImage = async (imageUri: string) => {
    setIsLoading(true)
    try {
      // Simulate AI parsing with common Malaysian order patterns
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock parsed data - in production, this would call an AI service
      const mockParsedData: ParsedOrder = {
        items: [
          { name: 'Nasi Lemak', quantity: 2, price: 3.50 },
          { name: 'Teh Tarik', quantity: 2, price: 2.00 },
          { name: 'Roti Canai', quantity: 1, price: 1.50 }
        ],
        customerName: 'Ahmad bin Ali',
        customerPhone: '+60123456789',
        totalAmount: 12.50,
        paymentStatus: 'confirmed',
        paymentMethod: 'Online Banking'
      }
      
      setParsedData(mockParsedData)
    } catch (error) {
      Alert.alert('Parsing Error', 'Could not parse WhatsApp screenshot. Please try again or enter manually.')
    } finally {
      setIsLoading(false)
    }
  }

  const saveOrder = async () => {
    if (!parsedData) return

    try {
      setIsLoading(true)
      
      // Create customer if doesn't exist
      let customerId = null
      if (parsedData.customerPhone) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', parsedData.customerPhone)
          .single()

        if (existingCustomer) {
          customerId = existingCustomer.id
        } else {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              name: parsedData.customerName || 'WhatsApp Customer',
              phone: parsedData.customerPhone,
            })
            .select('id')
            .single()
          
          customerId = newCustomer?.id
        }
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          amount: parsedData.totalAmount,
          status: parsedData.paymentStatus === 'confirmed' ? 'paid' : 'pending',
          payment_method: parsedData.paymentMethod || 'cash',
          customer_id: customerId,
          notes: 'Parsed from WhatsApp',
        })
        .select('id')
        .single()

      if (orderError) throw orderError

      // Create order items
      if (order?.id) {
        const orderItems = parsedData.items.map(item => ({
          order_id: order.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        }))

        await supabase.from('order_items').insert(orderItems)
      }

      // If paid, create transaction
      if (parsedData.paymentStatus === 'confirmed') {
        await supabase.from('transactions').insert({
          type: 'income',
          amount: parsedData.totalAmount,
          description: `WhatsApp Order - ${parsedData.customerName || 'Customer'}`,
          category: 'Sales',
          payment_method: parsedData.paymentMethod || 'cash',
        })
      }

      Alert.alert('Success', 'WhatsApp order has been saved successfully!')
      onOrderParsed(parsedData)
      onClose()
      resetState()
    } catch (error) {
      Alert.alert('Error', 'Failed to save order. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetState = () => {
    setSelectedImage(null)
    setParsedData(null)
    setEditMode(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const updateParsedData = (field: string, value: any) => {
    if (!parsedData) return
    setParsedData({ ...parsedData, [field]: value })
  }

  const updateItem = (index: number, field: string, value: any) => {
    if (!parsedData) return
    const newItems = [...parsedData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setParsedData({ ...parsedData, items: newItems })
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>WhatsApp Parser</Text>
          <TouchableOpacity 
            onPress={() => setEditMode(!editMode)} 
            style={styles.editButton}
            disabled={!parsedData}
          >
            <Text style={[styles.editButtonText, !parsedData && { opacity: 0.5 }]}>
              {editMode ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!selectedImage ? (
            /* Upload Section */
            <View style={styles.uploadSection}>
              <Text style={styles.uploadTitle}>📱 Upload WhatsApp Screenshot</Text>
              <Text style={styles.uploadSubtitle}>
                Take a screenshot of your WhatsApp order conversation and we'll extract the details automatically
              </Text>
              
              <View style={styles.uploadButtons}>
                <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                  <Text style={styles.uploadIcon}>📸</Text>
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>💡 Tips for better parsing:</Text>
                <Text style={styles.tip}>• Include the full order conversation</Text>
                <Text style={styles.tip}>• Make sure text is clear and readable</Text>
                <Text style={styles.tip}>• Include payment confirmation if available</Text>
                <Text style={styles.tip}>• Works with BM and English</Text>
              </View>
            </View>
          ) : (
            /* Preview and Results */
            <View style={styles.previewSection}>
              {/* Image Preview */}
              <View style={styles.imagePreview}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.changeImageButton} 
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              </View>

              {/* Loading State */}
              {isLoading && !parsedData && (
                <View style={styles.loadingCard}>
                  <Text style={styles.loadingIcon}>🤖</Text>
                  <Text style={styles.loadingTitle}>Parsing WhatsApp Order...</Text>
                  <Text style={styles.loadingText}>
                    Our AI is reading your screenshot and extracting order details
                  </Text>
                </View>
              )}

              {/* Parsed Results */}
              {parsedData && (
                <View style={styles.resultsSection}>
                  <Text style={styles.resultsTitle}>📋 Extracted Order Details</Text>
                  
                  {/* Customer Info */}
                  <View style={styles.resultCard}>
                    <Text style={styles.cardTitle}>Customer Information</Text>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Name:</Text>
                      {editMode ? (
                        <TextInput
                          style={styles.fieldInput}
                          value={parsedData.customerName || ''}
                          onChangeText={(text) => updateParsedData('customerName', text)}
                          placeholder="Customer name"
                          placeholderTextColor={colors.textSecondary}
                        />
                      ) : (
                        <Text style={styles.fieldValue}>{parsedData.customerName || 'N/A'}</Text>
                      )}
                    </View>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Phone:</Text>
                      {editMode ? (
                        <TextInput
                          style={styles.fieldInput}
                          value={parsedData.customerPhone || ''}
                          onChangeText={(text) => updateParsedData('customerPhone', text)}
                          placeholder="Phone number"
                          placeholderTextColor={colors.textSecondary}
                        />
                      ) : (
                        <Text style={styles.fieldValue}>{parsedData.customerPhone || 'N/A'}</Text>
                      )}
                    </View>
                  </View>

                  {/* Order Items */}
                  <View style={styles.resultCard}>
                    <Text style={styles.cardTitle}>Order Items</Text>
                    {parsedData.items.map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          {editMode ? (
                            <TextInput
                              style={styles.itemNameInput}
                              value={item.name}
                              onChangeText={(text) => updateItem(index, 'name', text)}
                              placeholder="Item name"
                              placeholderTextColor={colors.textSecondary}
                            />
                          ) : (
                            <Text style={styles.itemName}>{item.name}</Text>
                          )}
                          <View style={styles.itemDetails}>
                            {editMode ? (
                              <>
                                <TextInput
                                  style={styles.itemDetailInput}
                                  value={item.quantity.toString()}
                                  onChangeText={(text) => updateItem(index, 'quantity', parseInt(text) || 0)}
                                  placeholder="Qty"
                                  keyboardType="numeric"
                                  placeholderTextColor={colors.textSecondary}
                                />
                                <Text style={styles.itemDetailSeparator}>×</Text>
                                <TextInput
                                  style={styles.itemDetailInput}
                                  value={item.price.toString()}
                                  onChangeText={(text) => updateItem(index, 'price', parseFloat(text) || 0)}
                                  placeholder="Price"
                                  keyboardType="decimal-pad"
                                  placeholderTextColor={colors.textSecondary}
                                />
                              </>
                            ) : (
                              <Text style={styles.itemDetail}>
                                {item.quantity} × RM{item.price.toFixed(2)}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Text style={styles.itemTotal}>
                          RM{(item.quantity * item.price).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Payment Info */}
                  <View style={styles.resultCard}>
                    <Text style={styles.cardTitle}>Payment Details</Text>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Total Amount:</Text>
                      <Text style={[styles.fieldValue, styles.totalAmount]}>
                        RM{parsedData.totalAmount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Status:</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: parsedData.paymentStatus === 'confirmed' ? colors.success + '20' : colors.accent + '20' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: parsedData.paymentStatus === 'confirmed' ? colors.success : colors.accent }
                        ]}>
                          {parsedData.paymentStatus === 'confirmed' ? '✅ Paid' : '⏳ Pending'}
                        </Text>
                      </View>
                    </View>
                    {parsedData.paymentMethod && (
                      <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>Method:</Text>
                        <Text style={styles.fieldValue}>{parsedData.paymentMethod}</Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.saveButton} 
                      onPress={saveOrder}
                      disabled={isLoading}
                    >
                      <Text style={styles.saveButtonText}>
                        {isLoading ? 'Saving...' : '💾 Save Order'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.retryButton} onPress={() => setSelectedImage(null)}>
                      <Text style={styles.retryButtonText}>🔄 Try Another Image</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  editButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.primary + '15',
  },
  editButtonText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  uploadSection: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  uploadSubtitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.lineHeights.body,
  },
  uploadButtons: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  uploadButton: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  uploadButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  tipsCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    width: '100%',
  },
  tipsTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tip: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  previewSection: {
    padding: Spacing.lg,
  },
  imagePreview: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  previewImage: {
    width: 200,
    height: 300,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
    marginBottom: Spacing.md,
  },
  changeImageButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changeImageText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  loadingTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resultsSection: {
    gap: Spacing.lg,
  },
  resultsTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  fieldValue: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  fieldInput: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 2,
    textAlign: 'right',
  },
  totalAmount: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.success,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.bold,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  itemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  itemName: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  itemNameInput: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.xs,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDetail: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  itemDetailInput: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    width: 60,
    textAlign: 'center',
  },
  itemDetailSeparator: {
    fontSize: Typography.fontSizes.bodySmall,
    color: colors.textSecondary,
    marginHorizontal: Spacing.xs,
  },
  itemTotal: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  actionButtons: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  retryButton: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
})
