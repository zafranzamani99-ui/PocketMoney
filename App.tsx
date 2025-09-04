import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, Text, ActivityIndicator } from 'react-native'
import { ErrorBoundary } from 'react-error-boundary'
import AppNavigator from './navigation/AppNavigator'
import { useFonts } from './hooks/useFonts'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { POSSettingsProvider } from './contexts/POSSettingsContext'

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
        Something went wrong
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
        {error.message}
      </Text>
      <Text 
        style={{ fontSize: 16, color: '#007AFF', textDecorationLine: 'underline' }}
        onPress={resetErrorBoundary}
      >
        Try again
      </Text>
    </View>
  )
}

// Inner App component that uses theme
function AppContent() {
  const { colors, isDark } = useTheme()
  const fontsLoaded = useFonts()

  if (!fontsLoaded) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ 
          color: colors.textPrimary, 
          fontSize: 18, 
          marginTop: 16,
          fontFamily: 'System' // Fallback font while loading
        }}>
          Loading fonts...
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppNavigator />
        <StatusBar style={isDark ? "light" : "dark"} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

// Main App component with ThemeProvider
export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset app state if needed
      }}
    >
      <ThemeProvider>
        <POSSettingsProvider>
          <AppContent />
        </POSSettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
