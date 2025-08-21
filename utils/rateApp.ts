import { Alert, Linking, Platform } from 'react-native'

interface RateAppOptions {
  appStoreId?: string
  playStoreId?: string
  title?: string
  message?: string
  cancelText?: string
  rateText?: string
  laterText?: string
}

const defaultOptions: Required<RateAppOptions> = {
  appStoreId: '1234567890', // Replace with actual App Store ID
  playStoreId: 'com.pocketmoney.app', // Replace with actual Play Store package name
  title: 'Rate PocketMoney',
  message: 'We hope you\'re enjoying PocketMoney! Would you mind taking a moment to rate us? It really helps support the team.',
  cancelText: 'No Thanks',
  rateText: 'Rate Now',
  laterText: 'Maybe Later'
}

export class RateApp {
  private static hasBeenRated = false
  private static hasBeenAsked = false
  
  static async rateApp(options: RateAppOptions = {}): Promise<void> {
    const config = { ...defaultOptions, ...options }
    
    try {
      let storeUrl: string
      
      if (Platform.OS === 'ios') {
        storeUrl = `https://apps.apple.com/app/id${config.appStoreId}?action=write-review`
      } else if (Platform.OS === 'android') {
        storeUrl = `market://details?id=${config.playStoreId}`
      } else {
        // Web or other platforms
        storeUrl = 'https://pocketmoney.app/download'
      }
      
      const canOpen = await Linking.canOpenURL(storeUrl)
      
      if (canOpen) {
        await Linking.openURL(storeUrl)
        this.hasBeenRated = true
      } else {
        // Fallback to web URL for Android if Play Store app is not available
        if (Platform.OS === 'android') {
          const webUrl = `https://play.google.com/store/apps/details?id=${config.playStoreId}`
          await Linking.openURL(webUrl)
          this.hasBeenRated = true
        } else {
          throw new Error('Cannot open store URL')
        }
      }
    } catch (error) {
      console.error('Error opening app store:', error)
      Alert.alert(
        'Unable to Open Store',
        'We couldn\'t open the app store. Please search for "PocketMoney" in your app store to leave a review.',
        [{ text: 'OK' }]
      )
    }
  }
  
  static promptForRating(options: RateAppOptions = {}): Promise<'rate' | 'later' | 'never'> {
    const config = { ...defaultOptions, ...options }
    
    return new Promise((resolve) => {
      if (this.hasBeenRated || this.hasBeenAsked) {
        resolve('never')
        return
      }
      
      this.hasBeenAsked = true
      
      Alert.alert(
        config.title,
        config.message,
        [
          {
            text: config.cancelText,
            style: 'cancel',
            onPress: () => resolve('never')
          },
          {
            text: config.laterText,
            onPress: () => resolve('later')
          },
          {
            text: config.rateText,
            onPress: () => {
              this.rateApp(options)
              resolve('rate')
            }
          }
        ],
        { cancelable: true, onDismiss: () => resolve('never') }
      )
    })
  }
  
  static async smartPrompt(options: RateAppOptions = {}): Promise<void> {
    // Only show rating prompt if certain conditions are met
    const shouldPrompt = this.shouldShowRatingPrompt()
    
    if (shouldPrompt) {
      const result = await this.promptForRating(options)
      
      if (result === 'later') {
        // Schedule to ask again later (in a real app, you'd store this preference)
        console.log('User chose to rate later')
      } else if (result === 'rate') {
        console.log('User chose to rate now')
      } else {
        console.log('User declined to rate')
      }
    }
  }
  
  private static shouldShowRatingPrompt(): boolean {
    // In a real app, you would check:
    // - How many times the app has been opened
    // - How long the user has been using the app
    // - If they've performed key actions (e.g., scanned receipts, created transactions)
    // - If they haven't been asked recently
    
    // For demo purposes, we'll always return true unless already asked/rated
    return !this.hasBeenAsked && !this.hasBeenRated
  }
  
  static reset(): void {
    // For testing purposes - reset the state
    this.hasBeenRated = false
    this.hasBeenAsked = false
  }
  
  static getStatus(): { hasBeenRated: boolean; hasBeenAsked: boolean } {
    return {
      hasBeenRated: this.hasBeenRated,
      hasBeenAsked: this.hasBeenAsked
    }
  }
}

// Additional utility functions for rating prompts
export const createCustomRatingPrompt = (
  title: string,
  message: string,
  onRate: () => void,
  onLater: () => void,
  onNever: () => void
) => {
  Alert.alert(
    title,
    message,
    [
      { text: 'Not Now', style: 'cancel', onPress: onNever },
      { text: 'Remind Later', onPress: onLater },
      { text: 'Rate App', onPress: onRate }
    ],
    { cancelable: true, onDismiss: onNever }
  )
}

export const openAppStore = async (platform: 'ios' | 'android' | 'web' = Platform.OS as any) => {
  const urls = {
    ios: `https://apps.apple.com/app/id${defaultOptions.appStoreId}`,
    android: `https://play.google.com/store/apps/details?id=${defaultOptions.playStoreId}`,
    web: 'https://pocketmoney.app/download'
  }
  
  try {
    const url = urls[platform] || urls.web
    const canOpen = await Linking.canOpenURL(url)
    
    if (canOpen) {
      await Linking.openURL(url)
    } else {
      await Linking.openURL(urls.web)
    }
  } catch (error) {
    console.error('Failed to open app store:', error)
  }
}

export default RateApp