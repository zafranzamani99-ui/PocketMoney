import React, { useState } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../contexts/ThemeContext'

const { width: screenWidth } = Dimensions.get('window')
const isTablet = screenWidth >= 768
import DashboardScreen from '../screens/DashboardScreen'
import TransactionsScreen from '../screens/TransactionsScreen'
import OrdersScreen from '../screens/OrdersScreen'
import ProfileScreen from '../screens/ProfileScreen'
import ReceiptScannerModal from '../components/ReceiptScannerModal'

interface ColorScheme {
  // Primary Colors
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  surfaceElevated: string
  light: string
  
  // Text Colors
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textDark: string
  
  // Status Colors
  success: string
  error: string
  warning: string
  info: string
  
  // UI Elements
  border: string
  borderLight: string
  
  // Gradients
  gradientStart: string
  gradientEnd: string
  gradientAccent: string
}

export type MainTabParamList = {
  Dashboard: undefined
  Transactions: undefined
  Scan: undefined
  Orders: undefined
  Profile: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

const TabIcon = ({ focused, emoji }: { focused: boolean; emoji: string }) => {
  const { colors } = useTheme()
  const dynamicStyles = createStyles(colors as ColorScheme)
  
  return (
    <View style={[dynamicStyles.iconContainer, focused && dynamicStyles.iconContainerFocused]}>
      <Text style={dynamicStyles.iconEmoji}>{emoji}</Text>
    </View>
  )
}

const ScanButton = ({ onPress }: { onPress: () => void }) => {
  const { colors } = useTheme()
  const dynamicStyles = createStyles(colors as ColorScheme)
  
  return (
    <TouchableOpacity onPress={onPress} style={dynamicStyles.scanButtonContainer}>
      <LinearGradient
        colors={[(colors as ColorScheme).primary, (colors as ColorScheme).primary]}
        style={dynamicStyles.scanButton}
      >
        <Text style={dynamicStyles.scanEmoji}>📷</Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

const EmptyScreen = () => <View />

export default function MainTabNavigator() {
  const [showScanModal, setShowScanModal] = useState(false)
  const { colors } = useTheme()
  const dynamicStyles = createStyles(colors as ColorScheme)

  const handleScanSuccess = (extractedData: any) => {
    setShowScanModal(false)
    console.log('Scan result:', extractedData)
  }

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: dynamicStyles.tabBar,
          tabBarActiveTintColor: (colors as ColorScheme).primary,
          tabBarInactiveTintColor: (colors as ColorScheme).textSecondary,
          tabBarLabelStyle: dynamicStyles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🏠" />,
          }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionsScreen}
          options={{
            tabBarLabel: 'Expense',
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="💸" />,
          }}
        />
        <Tab.Screen
          name="Scan"
          component={EmptyScreen}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => <ScanButton onPress={() => setShowScanModal(true)} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              setShowScanModal(true)
            },
          }}
        />
        <Tab.Screen
          name="Orders"
          component={OrdersScreen}
          options={{
            tabBarLabel: 'Orders',
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="📋" />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="👤" />,
          }}
        />
      </Tab.Navigator>

      <ReceiptScannerModal
        visible={showScanModal}
        onClose={() => setShowScanModal(false)}
        onSuccess={handleScanSuccess}
      />
    </>
  )
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.borderLight,
    borderTopWidth: 0.5,
    height: isTablet ? 120 : 95,
    paddingBottom: isTablet ? 35 : 28,
    paddingTop: isTablet ? 20 : 12,
    paddingHorizontal: isTablet ? Spacing.xl * 2 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: isTablet ? Typography.fontSizes.body : Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.semiBold,
    marginTop: isTablet ? 10 : 6,
  },
  iconContainer: {
    width: isTablet ? 56 : 40,
    height: isTablet ? 56 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isTablet ? 28 : 20,
  },
  iconContainerFocused: {
    backgroundColor: colors.primary + '15',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  iconEmoji: {
    fontSize: isTablet ? 32 : 22,
  },
  scanButtonContainer: {
    position: 'absolute',
    top: -20,
    elevation: 8,
  },
  scanButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
  },
  scanEmoji: {
    fontSize: 28,
  },
})