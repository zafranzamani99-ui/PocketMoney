import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, Text } from 'react-native'
import AppNavigator from './navigation/AppNavigator'
import { useFonts } from './hooks/useFonts'

export default function App() {
  const fontsLoaded = useFonts()

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 18 }}>Loading...</Text>
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppNavigator />
        <StatusBar style="light" />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}
