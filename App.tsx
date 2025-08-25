import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, Text } from 'react-native'
import AppNavigator from './navigation/AppNavigator'
import { useFonts } from './hooks/useFonts'
import { ThemeProvider, useTheme } from './contexts/ThemeContext.js'
import { POSSettingsProvider } from './contexts/POSSettingsContext'

// Inner App component that uses theme
function AppContent() {
  const { colors, isDark } = useTheme()
  const fontsLoaded = useFonts()

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.textPrimary, fontSize: 18 }}>Loading...</Text>
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
export default function App() {
  return (
    <ThemeProvider>
      <POSSettingsProvider>
        <AppContent />
      </POSSettingsProvider>
    </ThemeProvider>
  )
}
