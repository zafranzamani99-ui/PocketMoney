import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'
import { RootStackParamList } from '../navigation/AppNavigator'
import { debugSupabase } from '../utils/debugSupabase'
import { ButtonContainer, PrimaryButton, SecondaryButton } from '../components/buttons'

type NavigationProp = StackNavigationProp<RootStackParamList>

interface BusinessProfile {
  business_name: string
  business_type: string
  phone: string
  email: string
  address: string
  website: string
}

// Create a scrollable container that works on all platforms
const ScrollableContainer = ({ children }: { children: React.ReactNode }) => {
  const scrollContentStyle = {
    paddingBottom: Platform.OS === 'ios' ? 34 : 0, // Space for home indicator
  }

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
  } else {
    return (
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={scrollContentStyle}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          nestedScrollEnabled={true}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }
}

export default function BusinessProfileScreen() {
  const { colors } = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<BusinessProfile>({
    business_name: '',
    business_type: 'Food & Beverage',
    phone: '',
    email: '',
    address: '',
    website: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      console.log('📖 Loading business profile...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('❌ No authenticated user:', authError?.message)
        return
      }

      console.log('✅ User authenticated, loading profile for:', user.email)
      
      // Try to load profile from database
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('business_name, business_type, phone')
        .eq('id', user.id)
        .single()
        
      if (error) {
        console.error('❌ Error loading profile from DB:', error.message)
        // Use default values if no profile exists
        setProfile({
          business_name: '',
          business_type: 'Food & Beverage',
          phone: '',
          email: user.email || '',
          address: '',
          website: '',
        })
      } else {
        console.log('✅ Profile loaded from database:', userProfile)
        setProfile({
          business_name: userProfile.business_name || '',
          business_type: userProfile.business_type || 'Food & Beverage',
          phone: userProfile.phone || '',
          email: user.email || '',
          address: '', // Not stored in users table yet
          website: '', // Not stored in users table yet
        })
      }
    } catch (error) {
      console.error('❌ Unexpected error loading profile:', error)
    }
  }

  // Memoized input change handlers to prevent focus loss
  const updateBusinessName = useCallback((text: string) => {
    setProfile(prev => ({ ...prev, business_name: text }))
  }, [])

  const updateBusinessType = useCallback((type: string) => {
    setProfile(prev => ({ ...prev, business_type: type }))
  }, [])

  const updatePhone = useCallback((text: string) => {
    setProfile(prev => ({ ...prev, phone: text }))
  }, [])

  const updateEmail = useCallback((text: string) => {
    setProfile(prev => ({ ...prev, email: text }))
  }, [])

  const updateAddress = useCallback((text: string) => {
    setProfile(prev => ({ ...prev, address: text }))
  }, [])

  const updateWebsite = useCallback((text: string) => {
    setProfile(prev => ({ ...prev, website: text }))
  }, [])

  const saveProfile = async () => {
    if (!profile.business_name.trim()) {
      Alert.alert('Error', 'Business name is required')
      return
    }

    setLoading(true)
    try {
      console.log('💾 Attempting to save business profile...')
      
      // Debug connection first
      const debugResult = await debugSupabase.testAuth()
      if (!debugResult.success) {
        console.error('❌ Auth check failed:', debugResult.error)
        Alert.alert('Authentication Error', debugResult.error || 'Please log in again')
        return
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('❌ No authenticated user:', authError?.message)
        Alert.alert('Error', 'You must be logged in to save profile')
        return
      }

      console.log('✅ User authenticated:', user.email)
      
      // Try to update the users table
      const { data, error } = await supabase
        .from('users')
        .update({
          business_name: profile.business_name,
          business_type: profile.business_type,
          phone: profile.phone || null,
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Database save error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Check if user exists in users table
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (checkError) {
          console.error('❌ User not found in users table:', checkError.message)
          // Try to create the user record
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              business_name: profile.business_name,
              business_type: profile.business_type,
              phone: profile.phone || null,
            })
            
          if (insertError) {
            console.error('❌ Failed to create user record:', insertError.message)
            Alert.alert('Database Error', `Failed to create user profile: ${insertError.message}`)
            return
          } else {
            console.log('✅ User record created successfully')
            Alert.alert('Success', 'Business profile created successfully!')
            return
          }
        }
        
        Alert.alert('Database Error', `Failed to save profile: ${error.message}`)
        return
      }

      console.log('✅ Profile saved successfully:', data)
      Alert.alert('Success', 'Business profile updated successfully!')
    } catch (error: any) {
      console.error('❌ Unexpected error:', error)
      Alert.alert('Error', `Failed to save profile: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const businessTypes = [
    'Retail',
    'Food & Beverage', 
    'Service',
    'Online',
    'Technology',
    'Healthcare',
    'Education',
    'Manufacturing',
    'Construction',
    'Other',
  ]

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Business Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Edit Your Business Info</Text>
          <Text style={styles.headerSubtitle}>
            Keep your business information up to date
          </Text>
        </View>
      </LinearGradient>

      <ScrollableContainer>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={styles.input}
                value={profile.business_name}
                onChangeText={updateBusinessName}
                placeholder="Enter your business name"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Type</Text>
              <View style={styles.typeSelector}>
                {businessTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      profile.business_type === type && styles.typeChipSelected
                    ]}
                    onPress={() => updateBusinessType(type)}
                  >
                    <Text style={[
                      styles.typeChipText,
                      profile.business_type === type && styles.typeChipTextSelected
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={profile.phone}
                onChangeText={updatePhone}
                placeholder="+60 12-345-6789"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={profile.email}
                onChangeText={updateEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                returnKeyType="next"
                blurOnSubmit={false}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={profile.address}
                onChangeText={updateAddress}
                placeholder="Enter your business address"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website (Optional)</Text>
              <TextInput
                style={styles.input}
                value={profile.website}
                onChangeText={updateWebsite}
                placeholder="www.yourbusiness.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="url"
                returnKeyType="done"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Hours</Text>
            <View style={styles.hoursCard}>
              <Text style={styles.hoursTitle}>⏰ Operating Hours</Text>
              <Text style={styles.hoursText}>Monday - Friday: 8:00 AM - 9:00 PM</Text>
              <Text style={styles.hoursText}>Saturday - Sunday: 9:00 AM - 10:00 PM</Text>
              <TouchableOpacity style={styles.editHoursButton}>
                <Text style={styles.editHoursText}>Edit Hours</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Settings</Text>
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>📊</Text>
                <View>
                  <Text style={styles.settingTitle}>Tax Settings</Text>
                  <Text style={styles.settingDescription}>Configure GST/SST rates</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🏪</Text>
                <View>
                  <Text style={styles.settingTitle}>Store Logo</Text>
                  <Text style={styles.settingDescription}>Upload your business logo</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>📍</Text>
                <View>
                  <Text style={styles.settingTitle}>Location Services</Text>
                  <Text style={styles.settingDescription}>Enable GPS for deliveries</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tips & Guidelines</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>💡 Optimize Your Business Profile</Text>
              <Text style={styles.tipText}>
                • Complete all fields to improve customer trust and searchability
              </Text>
              <Text style={styles.tipText}>
                • Use a professional email address for business communications
              </Text>
              <Text style={styles.tipText}>
                • Keep your address accurate for delivery and pickup services
              </Text>
              <Text style={styles.tipText}>
                • Update business hours regularly to reflect current operations
              </Text>
              <Text style={styles.tipText}>
                • Consider adding a website to showcase your products/services
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.section}>
            <View style={styles.actionButtons}>
              <SecondaryButton 
                title="Cancel" 
                onPress={() => navigation.goBack()}
              />
              <PrimaryButton 
                title="Save Profile" 
                onPress={saveProfile}
                loading={loading}
                disabled={!profile.business_name.trim()}
              />
            </View>
          </View>

          {/* Extra spacing to ensure we can scroll to bottom */}
          <View style={styles.bottomSpacing} />
        </View>
      </ScrollableContainer>
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
    paddingTop: Spacing.lg, // Reduced padding - SafeAreaView handles notch/Dynamic Island
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xl, // Push title down
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 40, // Same width as backButton for symmetry
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
  content: {
    paddingVertical: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.sm,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  typeChipTextSelected: {
    color: colors.textPrimary,
  },
  hoursCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hoursTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  hoursText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  editHoursButton: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  editHoursText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.primary,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  settingTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: Typography.fontSizes.subheading,
    color: colors.textSecondary,
  },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipTitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tipText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
    marginBottom: Spacing.sm,
  },
  bottomSpacing: {
    height: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
})