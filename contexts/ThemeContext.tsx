import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Appearance, ColorSchemeName } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'

export interface ColorScheme {
  // Primary Colors
  primary: string
  primaryLight: string
  secondary: string
  accent: string
  background: string
  surface: string
  surfaceElevated: string
  light: string
  
  // Text Colors
  text: string
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
  card: string
  white: string
  
  // Gradients
  gradientStart: string
  gradientEnd: string
  gradientAccent: string
}

export interface ThemeContextType {
  theme: ThemeMode
  colors: ColorScheme
  isDark: boolean
  setTheme: (theme: ThemeMode) => Promise<void>
  toggleTheme: () => void
}

interface ThemeProviderProps {
  children: ReactNode
}

const lightColors: ColorScheme = {
  // Primary Colors
  primary: '#80D8C3',
  primaryLight: '#A8E6D0',
  secondary: '#4DA8DA', 
  accent: '#FFD66B',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceElevated: '#FFFFFF',
  light: '#F5F5F5',
  
  // Text Colors
  text: '#1A1A1A',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textDark: '#1A1A1A',
  
  // Status Colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // UI Elements
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  card: '#FFFFFF',
  white: '#FFFFFF',
  
  // Gradients
  gradientStart: '#80D8C3',
  gradientEnd: '#4DA8DA',
  gradientAccent: '#FFD66B',
}

const darkColors: ColorScheme = {
  // Primary Colors
  primary: '#80D8C3',
  primaryLight: '#A8E6D0',
  secondary: '#4DA8DA',
  accent: '#FFD66B',
  background: '#000000',
  surface: '#1A1A1A',
  surfaceElevated: '#2A2A2A',
  light: '#F5F5F5',
  
  // Text Colors
  text: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#6B7280',
  textDark: '#1A1A1A',
  
  // Status Colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#FFD66B',
  info: '#4DA8DA',
  
  // UI Elements
  border: '#2A2A2A',
  borderLight: '#374151',
  card: '#1A1A1A',
  white: '#FFFFFF',
  
  // Gradients
  gradientStart: '#80D8C3',
  gradientEnd: '#4DA8DA',
  gradientAccent: '#FFD66B',
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('system')
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark')

  // Determine current effective theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme
  const isDark = effectiveTheme === 'dark'
  const colors = isDark ? darkColors : lightColors

  // Load theme from storage and database
  useEffect(() => {
    loadTheme()
  }, [])

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }: { colorScheme: ColorSchemeName }) => {
      setSystemTheme(colorScheme === 'dark' ? 'dark' : 'light')
    })

    // Get initial system theme
    const initialTheme = Appearance.getColorScheme()
    setSystemTheme(initialTheme === 'dark' ? 'dark' : 'light')

    return () => subscription?.remove()
  }, [])

  const loadTheme = async (): Promise<void> => {
    try {
      // Try to load from AsyncStorage first (faster)
      const storedTheme = await AsyncStorage.getItem('theme')
      if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
        setThemeState(storedTheme as ThemeMode)
      }

      // Then sync with database if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('theme_mode')
          .eq('user_id', user.id)
          .single()

        if (!error && data?.theme_mode && ['light', 'dark', 'system'].includes(data.theme_mode)) {
          const dbTheme = data.theme_mode as ThemeMode
          setThemeState(dbTheme)
          // Update local storage to match database
          await AsyncStorage.setItem('theme', dbTheme)
        }
      }
    } catch (error) {
      console.error('Error loading theme:', error)
    }
  }

  const setTheme = async (newTheme: ThemeMode): Promise<void> => {
    try {
      setThemeState(newTheme)
      
      // Save to local storage
      await AsyncStorage.setItem('theme', newTheme)
      
      // Save to database if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            theme_mode: newTheme,
            updated_at: new Date().toISOString(),
          })
      }
    } catch (error) {
      console.error('Error saving theme:', error)
    }
  }

  const toggleTheme = (): void => {
    if (theme === 'system') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('system')
    }
  }

  const contextValue: ThemeContextType = {
    theme,
    colors,
    isDark,
    setTheme,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Export theme configurations for direct use
export { lightColors, darkColors }