import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'

// Create a scrollable container that works on all platforms
const ScrollableContainer = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === 'web') {
    return (
      <div style={{
        flex: 1,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        height: '100%',
        maxHeight: 'calc(100vh - 200px)'
      }}>
        {children}
      </div>
    )
  }
  
  return (
    <ScrollView 
      style={{ flex: 1 }} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
    >
      {children}
    </ScrollView>
  )
}

interface Transaction {
  id: string
  type: 'income' | 'expense'
  description: string | null
  amount: number
  category: string
  created_at: string
  receipt_url?: string | null
  payment_method?: string | null
  customer?: string
  notes?: string
}

interface TransactionDetailModalProps {
  visible: boolean
  onClose: () => void
  transaction: Transaction | null
}

export default function TransactionDetailModal({ visible, onClose, transaction }: TransactionDetailModalProps) {
  const { colors } = useTheme()
  if (!transaction) return null

  const handleEdit = () => {
    Alert.alert('Edit Transaction', 'Edit functionality will be implemented')
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onClose()
          },
        },
      ]
    )
  }

  const formatDateTime = (created_at: string) => {
    const dateObj = new Date(created_at)
    return {
      date: dateObj.toLocaleDateString('en-MY', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: dateObj.toLocaleTimeString('en-MY', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      shortDate: dateObj.toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }
  }

  const getTransactionEmoji = (type: string) => {
    return type === 'income' ? '💰' : '💸'
  }

  const getTransactionColor = (type: string) => {
    return type === 'income' ? colors.success : colors.error
  }

  const { date, time, shortDate } = formatDateTime(transaction.created_at)
  const styles = createStyles(colors)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.modalWrapper}>
        <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Transaction Details</Text>
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <ScrollableContainer>
            {/* Featured Amount Card */}
            <LinearGradient
              colors={[getTransactionColor(transaction.type) + '25', getTransactionColor(transaction.type) + '10']}
              style={styles.amountCard}
            >
              <Text style={styles.transactionEmoji}>
                {getTransactionEmoji(transaction.type)}
              </Text>
              <Text style={[styles.typeText, { color: getTransactionColor(transaction.type) }]}>
                {transaction.type.toUpperCase()}
              </Text>
              <Text style={styles.amountValue}>
                {transaction.type === 'income' ? '+' : '-'}RM {transaction.amount.toFixed(2)}
              </Text>
              <Text style={styles.categoryBadge}>{transaction.category}</Text>
            </LinearGradient>

            {/* Transaction Information */}
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Transaction Information</Text>
              
              <DetailRow 
                label="Transaction ID" 
                value={`#${transaction.id.slice(-8).toUpperCase()}`} 
                colors={colors}
              />
              
              <DetailRow 
                label="Description" 
                value={transaction.description || 'No description'} 
                colors={colors}
              />
              
              <DetailRow 
                label="Date" 
                value={shortDate} 
                colors={colors}
              />
              
              <DetailRow 
                label="Time" 
                value={time} 
                colors={colors}
              />
              
              <DetailRow 
                label="Amount" 
                value={`RM ${transaction.amount.toFixed(2)}`} 
                colors={colors}
                valueStyle={{ color: getTransactionColor(transaction.type), fontFamily: Typography.fontFamily.bold }}
              />
            </View>

            {/* Additional Details */}
            {(transaction.payment_method || transaction.customer || transaction.notes) && (
              <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>Additional Details</Text>
                
                {transaction.payment_method && (
                  <DetailRow 
                    label="Payment Method" 
                    value={transaction.payment_method} 
                    colors={colors}
                  />
                )}
                
                {transaction.customer && (
                  <DetailRow 
                    label="Customer" 
                    value={transaction.customer} 
                    colors={colors}
                  />
                )}
                
                {transaction.notes && (
                  <DetailRow 
                    label="Notes" 
                    value={transaction.notes} 
                    colors={colors}
                  />
                )}
              </View>
            )}

            {/* Receipt Section */}
            {transaction.receipt_url && (
              <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>Receipt</Text>
                <TouchableOpacity style={styles.receiptButton}>
                  <Text style={styles.receiptIcon}>📄</Text>
                  <Text style={styles.receiptText}>View Receipt</Text>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.editActionButton} onPress={handleEdit}>
                <Text style={styles.editActionText}>✏️ Edit Transaction</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteText}>🗑️ Delete Transaction</Text>
              </TouchableOpacity>
            </View>
          </ScrollableContainer>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

// Helper component for detail rows
const DetailRow = ({ label, value, colors, valueStyle = {} }: any) => (
  <View style={createDetailRowStyles(colors).row}>
    <Text style={createDetailRowStyles(colors).label}>{label}</Text>
    <Text style={[createDetailRowStyles(colors).value, valueStyle]}>{value}</Text>
  </View>
)

const createDetailRowStyles = (colors: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  label: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    flex: 1.5,
    textAlign: 'right',
  },
})

const createStyles = (colors: any) => StyleSheet.create({
  modalWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.subheading,
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
  amountCard: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  transactionEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  typeText: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  amountValue: {
    fontSize: Typography.fontSizes.display,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  infoCard: {
    backgroundColor: colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  receiptIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  receiptText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    flex: 1,
  },
  chevron: {
    fontSize: Typography.fontSizes.subheading,
    color: colors.textSecondary,
  },
  actionButtons: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  editActionButton: {
    backgroundColor: colors.primary + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  editActionText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.primary,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: colors.error + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  deleteText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.error,
    textAlign: 'center',
  },
})