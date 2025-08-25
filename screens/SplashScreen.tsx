import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Typography, Spacing } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'

const { width: screenWidth } = Dimensions.get('window')
const isTablet = screenWidth >= 768

interface SplashScreenProps {
  onFinish: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { colors } = useTheme()
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish()
    }, 2000)

    return () => clearTimeout(timer)
  }, [onFinish])

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        style={styles.container}
      >
        <View style={[styles.content, isTablet && styles.tabletContent]}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>💰</Text>
            <Text style={styles.title}>PocketMoney</Text>
            <Text style={styles.subtitle}>Track expenses, grow profits</Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    width: '100%',
  },
  tabletContent: {
    maxWidth: 800,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    fontSize: isTablet ? 120 : 80,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: isTablet ? Typography.fontSizes.heading * 2 : Typography.fontSizes.heading * 1.5,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: isTablet ? Typography.fontSizes.subheading : Typography.fontSizes.body,
    color: colors.textPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
})