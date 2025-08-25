import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Typography, Spacing, BorderRadius } from '../../constants/themeHooks'
import { useTheme } from '../../contexts/ThemeContext.js'

interface SecondaryButtonProps {
  title: string
  onPress: () => void
  disabled?: boolean
  style?: any
  size?: 'small' | 'medium' | 'large'
}

export default function SecondaryButton({ 
  title, 
  onPress, 
  disabled = false, 
  style,
  size = 'medium'
}: SecondaryButtonProps) {
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
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.text, 
        { fontSize: getFontSize() },
        disabled && styles.disabledText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  text: {
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.textSecondary,
  },
})
