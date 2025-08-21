import React, { useState } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme'
import { LinearGradient } from 'expo-linear-gradient'
import DashboardScreen from '../screens/DashboardScreen'
import TransactionsScreen from '../screens/TransactionsScreen'
import OrdersScreen from '../screens/OrdersScreen'
import ProfileScreen from '../screens/ProfileScreen'
import ReceiptScannerModal from '../components/ReceiptScannerModal'

export type MainTabParamList = {
  Dashboard: undefined
  Transactions: undefined
  Scan: undefined
  Orders: undefined
  Profile: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

const TabIcon = ({ focused, emoji }: { focused: boolean; emoji: string }) => (
  <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
    <Text style={styles.iconEmoji}>{emoji}</Text>
  </View>
)

const ScanButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.scanButtonContainer}>
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      style={styles.scanButton}
    >
      <Text style={styles.scanEmoji}>📷</Text>
    </LinearGradient>
  </TouchableOpacity>
)

const EmptyScreen = () => <View />

export default function MainTabNavigator() {
  const [showScanModal, setShowScanModal] = useState(false)

  const handleScanSuccess = (extractedData: any) => {
    setShowScanModal(false)
    console.log('Scan result:', extractedData)
  }

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarLabelStyle: styles.tabBarLabel,
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
            tabBarLabel: 'Transactions',
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="💳" />,
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
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="📝" />,
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 90,
    paddingBottom: 25,
    paddingTop: 10,
  },
  tabBarLabel: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    marginTop: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  iconContainerFocused: {
    backgroundColor: Colors.primary + '20',
  },
  iconEmoji: {
    fontSize: 18,
  },
  scanButtonContainer: {
    position: 'absolute',
    top: -20,
    boxShadow: `0 4px 8px ${Colors.primary}4D`,
    elevation: 8,
  },
  scanButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.surface,
  },
  scanEmoji: {
    fontSize: 28,
  },
})