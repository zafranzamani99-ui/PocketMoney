import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Linking,
  Modal,
} from 'react-native'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../navigation/AppNavigator'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface Customer {
  id: string
  name: string
  phone: string | null
  total_spent: number
  last_order_date: string | null
  created_at: string
}

export default function CustomersScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { colors } = useTheme()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('total_spent', { ascending: false })

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      Alert.alert('Error', 'Failed to load customers')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Error', 'Please enter customer name')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { error } = await supabase.from('customers').insert({
        user_id: user.id,
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
      })

      if (error) throw error

      setNewCustomerName('')
      setNewCustomerPhone('')
      setShowAddForm(false)
      loadCustomers()
      Alert.alert('Success', 'Customer added successfully')
    } catch (error) {
      Alert.alert('Error', 'Failed to add customer')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCustomer = async (customer: Customer) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', customer.id)

              if (error) throw error
              loadCustomers()
              Alert.alert('Success', 'Customer deleted successfully')
            } catch (error) {
              Alert.alert('Error', 'Failed to delete customer')
              console.error(error)
            }
          },
        },
      ]
    )
  }

  const handleCallCustomer = (phone: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No phone number available for this customer')
      return
    }

    const phoneUrl = `tel:${phone}`
    Linking.canOpenURL(phoneUrl).then(supported => {
      if (supported) {
        Linking.openURL(phoneUrl)
      } else {
        Alert.alert('Error', 'Cannot make phone calls on this device')
      }
    })
  }

  const handleWhatsAppCustomer = (phone: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No phone number available for this customer')
      return
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/\D/g, '')
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}`
    
    Linking.canOpenURL(whatsappUrl).then(supported => {
      if (supported) {
        Linking.openURL(whatsappUrl)
      } else {
        Alert.alert('WhatsApp Not Available', 'WhatsApp is not installed on this device')
      }
    })
  }

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    
    const nameMatch = customer.name.toLowerCase().includes(query)
    const phoneMatch = customer.phone && customer.phone.toLowerCase().includes(query)
    
    return nameMatch || phoneMatch
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getCustomerInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const renderCustomer = ({ item }: { item: Customer }) => (
    <View style={styles.customerCard}>
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerInitials}>
              {getCustomerInitials(item.name)}
            </Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{item.name}</Text>
            <Text style={styles.customerPhone}>
              {item.phone || 'No phone number'}
            </Text>
            <Text style={styles.customerStats}>
              Total Spent: RM {item.total_spent.toFixed(2)}
            </Text>
            <Text style={styles.customerLastOrder}>
              Last Order: {formatDate(item.last_order_date)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.customerActions}>
        {item.phone && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCallCustomer(item.phone!)}
            >
              <Text style={styles.actionButtonText}>📞 Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleWhatsAppCustomer(item.phone!)}
            >
              <Text style={styles.actionButtonText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCustomer(item)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            🗑️ Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Customers</Text>
            <Text style={styles.headerDescription}>Manage your customer relationships</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone number..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{customers.length}</Text>
          <Text style={styles.statLabel}>Total Customers</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            RM {customers.reduce((sum, c) => sum + c.total_spent, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id}
        style={styles.customersList}
        contentContainerStyle={styles.customersListContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadCustomers}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No Customers Yet</Text>
            <Text style={styles.emptyText}>
              Add your first customer to start tracking orders and building relationships
            </Text>
          </View>
        }
      />
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setShowAddForm(true)}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={showAddForm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Customer</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Customer Name"
              placeholderTextColor={colors.textSecondary}
              value={newCustomerName}
              onChangeText={setNewCustomerName}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number (Optional)"
              placeholderTextColor={colors.textSecondary}
              value={newCustomerPhone}
              onChangeText={setNewCustomerPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddForm(false)
                  setNewCustomerName('')
                  setNewCustomerPhone('')
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleAddCustomer}
                disabled={!newCustomerName.trim() || loading}
              >
                <Text style={[
                  styles.modalSaveButtonText,
                  (!newCustomerName.trim() || loading) && styles.disabledButtonText
                ]}>
                  {loading ? 'Adding...' : 'Add Customer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.xxl + Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  headerDescription: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as backButton for symmetry
  },
  floatingButton: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl + Spacing.lg, // Move higher up from bottom
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingButtonText: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.light,
  },
  disabledButtonText: {
    opacity: 0.5,
  },
  customersList: {
    flex: 1,
  },
  customersListContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  customerCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerHeader: {
    marginBottom: Spacing.md,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  customerInitials: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.bold,
    color: colors.primary,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  customerPhone: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  customerStats: {
    fontSize: Typography.fontSizes.caption,
    color: colors.success,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: Spacing.xs,
  },
  customerLastOrder: {
    fontSize: Typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  customerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary + '20',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: colors.error + '20',
  },
  actionButtonText: {
    fontSize: Typography.fontSizes.body,
    color: colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  deleteButtonText: {
    color: colors.error,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
})