import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Typography, Spacing } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  onBackPress?: () => void
  rightElement?: React.ReactNode
  showBackButton?: boolean
}

export default function ScreenHeader({ 
  title, 
  subtitle, 
  onBackPress, 
  rightElement,
  showBackButton = true
}: ScreenHeaderProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          {showBackButton && onBackPress && (
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          )}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        {rightElement && (
          <View style={styles.rightSection}>
            {rightElement}
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: Spacing.md,
    padding: Spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightSection: {
    marginLeft: Spacing.md,
  },
})