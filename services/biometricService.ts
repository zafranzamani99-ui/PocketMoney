import * as LocalAuthentication from 'expo-local-authentication'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from 'react-native'

class BiometricService {
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled'

  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()
      return hasHardware && isEnrolled
    } catch (error) {
      console.error('Error checking biometric availability:', error)
      return false
    }
  }

  async getSupportedTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync()
    } catch (error) {
      console.error('Error getting supported biometric types:', error)
      return []
    }
  }

  async authenticate(reason?: string): Promise<boolean> {
    try {
      const isAvailable = await this.isAvailable()
      if (!isAvailable) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Please set up biometric authentication in your device settings first.'
        )
        return false
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Authenticate to access PocketMoney',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      })

      return result.success
    } catch (error) {
      console.error('Biometric authentication error:', error)
      return false
    }
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.BIOMETRIC_ENABLED_KEY, enabled.toString())
    } catch (error) {
      console.error('Error setting biometric enabled state:', error)
    }
  }

  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(this.BIOMETRIC_ENABLED_KEY)
      return enabled === 'true'
    } catch (error) {
      console.error('Error getting biometric enabled state:', error)
      return false
    }
  }

  async promptEnableBiometric(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Enable Biometric Authentication',
        'Would you like to enable biometric authentication for quick and secure access to PocketMoney?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Enable',
            onPress: async () => {
              const success = await this.authenticate('Verify your identity to enable biometric authentication')
              if (success) {
                await this.setBiometricEnabled(true)
                Alert.alert('Success', 'Biometric authentication has been enabled!')
              }
              resolve(success)
            },
          },
        ]
      )
    })
  }

  async disableBiometric(): Promise<void> {
    try {
      await this.setBiometricEnabled(false)
      Alert.alert('Disabled', 'Biometric authentication has been disabled.')
    } catch (error) {
      console.error('Error disabling biometric authentication:', error)
    }
  }

  getBiometricTypeString(types: LocalAuthentication.AuthenticationType[]): string {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID'
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID'
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris'
    }
    return 'Biometric'
  }

  // Check if user should be prompted for biometric setup
  async shouldPromptForBiometricSetup(): Promise<boolean> {
    try {
      const isAvailable = await this.isAvailable()
      const isEnabled = await this.isBiometricEnabled()
      const hasBeenPrompted = await AsyncStorage.getItem('biometric_setup_prompted')
      
      return isAvailable && !isEnabled && !hasBeenPrompted
    } catch (error) {
      console.error('Error checking if should prompt for biometric setup:', error)
      return false
    }
  }

  async markBiometricSetupPrompted(): Promise<void> {
    try {
      await AsyncStorage.setItem('biometric_setup_prompted', 'true')
    } catch (error) {
      console.error('Error marking biometric setup as prompted:', error)
    }
  }

  // Quick authentication for app lock/unlock
  async quickAuth(): Promise<boolean> {
    try {
      const isEnabled = await this.isBiometricEnabled()
      if (!isEnabled) return true // No biometric auth required

      return await this.authenticate('Unlock PocketMoney')
    } catch (error) {
      console.error('Quick auth error:', error)
      return false
    }
  }

  // Secure authentication for sensitive operations
  async secureAuth(operation: string): Promise<boolean> {
    try {
      const isAvailable = await this.isAvailable()
      if (!isAvailable) {
        // Fallback to asking user to confirm with a simple alert
        return new Promise((resolve) => {
          Alert.alert(
            'Confirm Action',
            `Are you sure you want to ${operation}?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Confirm', onPress: () => resolve(true) },
            ]
          )
        })
      }

      return await this.authenticate(`Confirm: ${operation}`)
    } catch (error) {
      console.error('Secure auth error:', error)
      return false
    }
  }
}

export const biometricService = new BiometricService()