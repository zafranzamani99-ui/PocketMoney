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
} from 'react-native'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { supabase } from '../lib/supabase'

interface Customer {
  id: string
  name: string
  phone: string | null
  total_spent: number
  last_order_date: string | null
  created_at: string
}

export default function CustomersScreen() {
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

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchQuery))
  )

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          placeholderTextColor={Colors.textSecondary}
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

      {showAddForm && (
        <View style={styles.addForm}>
          <Text style={styles.addFormTitle}>Add New Customer</Text>
          
          <TextInput
            style={styles.addFormInput}
            placeholder="Customer Name"
            placeholderTextColor={Colors.textSecondary}
            value={newCustomerName}
            onChangeText={setNewCustomerName}
          />
          
          <TextInput
            style={styles.addFormInput}
            placeholder="Phone Number (Optional)"
            placeholderTextColor={Colors.textSecondary}
            value={newCustomerPhone}
            onChangeText={setNewCustomerPhone}
            keyboardType="phone-pad"
          />

          <View style={styles.addFormActions}>
            <TouchableOpacity
              style={styles.addFormCancelButton}
              onPress={() => {
                setShowAddForm(false)
                setNewCustomerName('')
                setNewCustomerPhone('')
              }}
            >
              <Text style={styles.addFormCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.addFormSaveButton}
              onPress={handleAddCustomer}
              disabled={!newCustomerName.trim() || loading}
            >
              <Text style={[
                styles.addFormSaveButtonText,
                (!newCustomerName.trim() || loading) && styles.disabledButtonText
              ]}>
                {loading ? 'Adding...' : 'Add Customer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  addButtonText: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
  },
  addForm: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addFormTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  addFormInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  addFormActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  addFormCancelButton: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addFormCancelButtonText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
  },
  addFormSaveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  addFormSaveButtonText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  customerInitials: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  customerPhone: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  customerStats: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.success,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: Spacing.xs,
  },
  customerLastOrder: {
    fontSize: Typography.fontSizes.caption,
    color: Colors.textSecondary,
  },
  customerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary + '20',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.error + '20',
  },
  actionButtonText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  deleteButtonText: {
    color: Colors.error,
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
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
})