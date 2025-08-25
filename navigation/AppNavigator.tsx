import React, { useState, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import SplashScreen from '../screens/SplashScreen'
import LoginScreen from '../screens/LoginScreen'
import SignUpScreen from '../screens/SignUpScreen'
import MainTabNavigator from './MainTabNavigator'
import TransactionDetailScreen from '../screens/TransactionDetailScreen'
import OrderDetailScreen from '../screens/OrderDetailScreen'
import BusinessProfileScreen from '../screens/BusinessProfileScreen'
import WalletManagementScreen from '../screens/WalletManagementScreen'
import PremiumUpgradeScreen from '../screens/PremiumUpgradeScreen'
import GoogleSheetsSyncScreen from '../screens/GoogleSheetsSyncScreen'
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen'
import DarkModeSettingsScreen from '../screens/DarkModeSettingsScreen'
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen'
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen'
import HelpFAQScreen from '../screens/HelpFAQScreen'
import ContactSupportScreen from '../screens/ContactSupportScreen'
import TermsPrivacyScreen from '../screens/TermsPrivacyScreen'
import AddOrderScreen from '../screens/AddOrderScreen'
import CustomersScreen from '../screens/CustomersScreen'
import POSScreen from '../screens/POSScreen'
import POSSettingsScreen from '../screens/POSSettingsScreen'
import AnalyticsScreen from '../screens/AnalyticsScreen'

export type RootStackParamList = {
  Splash: undefined
  Login: undefined
  SignUp: undefined
  Main: undefined
  TransactionDetail: {
    transaction: {
      id: string
      type: 'income' | 'expense'
      description: string
      amount: number
      category: string
      date: string
      time: string
      receipt_url?: string
      payment_method?: string
      customer?: string
      notes?: string
    }
  }
  OrderDetail: {
    order: {
      id: string
      amount: number
      status: 'pending' | 'paid' | 'completed'
      payment_method: string | null
      created_at: string
      notes?: string
      customers?: {
        name: string
        phone: string | null
        email?: string
      }
    }
  }
  BusinessProfile: undefined
  WalletManagement: undefined
  PremiumUpgrade: undefined
  GoogleSheetsSync: undefined
  NotificationSettings: undefined
  DarkModeSettings: undefined
  LanguageSelection: undefined
  PrivacySecurity: undefined
  HelpFAQ: undefined
  ContactSupport: undefined
  TermsPrivacy: undefined
  AddOrder: undefined
  POSSettings: undefined
  Customers: undefined
  POS: undefined
  Analytics: undefined
}

const Stack = createStackNavigator<RootStackParamList>()

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (isLoading || showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
            <Stack.Screen name="WalletManagement" component={WalletManagementScreen} />
            <Stack.Screen name="PremiumUpgrade" component={PremiumUpgradeScreen} />
            <Stack.Screen name="GoogleSheetsSync" component={GoogleSheetsSyncScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="DarkModeSettings" component={DarkModeSettingsScreen} />
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
            <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
            <Stack.Screen name="HelpFAQ" component={HelpFAQScreen} />
            <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
            <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
            <Stack.Screen name="AddOrder" component={AddOrderScreen} />
            <Stack.Screen name="POSSettings" component={POSSettingsScreen} />
            <Stack.Screen name="Customers" component={CustomersScreen} />
            <Stack.Screen name="POS" component={POSScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen
                  {...props}
                  onLoginSuccess={() => {}}
                  onNavigateToSignUp={() => props.navigation.navigate('SignUp')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="SignUp">
              {(props) => (
                <SignUpScreen
                  {...props}
                  onSignUpSuccess={() => props.navigation.navigate('Login')}
                  onNavigateToLogin={() => props.navigation.navigate('Login')}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}