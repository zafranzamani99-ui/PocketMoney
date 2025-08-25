import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Typography, Spacing, BorderRadius } from '../../constants/themeHooks'
import { useTheme } from '../../contexts/ThemeContext.js'

interface PrimaryButtonProps {
  title: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  style?: any
  size?: 'small' | 'medium' | 'large'
}

export default function PrimaryButton({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false, 
  style,
  size = 'medium'
}: PrimaryButtonProps) {
  const { colors } = useTheme()
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          minHeight: 40,
        }
      case 'large':
        return {
          paddingHorizontal: Spacing.xl,
          paddingVertical: Spacing.lg,
          minHeight: 56,
        }
      default:
        return {
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          minHeight: 48,
        }
    }
  }

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return Typography.fontSizes.bodySmall
      case 'large':
        return Typography.fontSizes.subheading
      default:
        return Typography.fontSizes.body
    }
  }

  const styles = createStyles(colors)

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getSizeStyles(),
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} size="small" />
      ) : (
        <Text style={[styles.text, { fontSize: getFontSize() }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  disabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
})
