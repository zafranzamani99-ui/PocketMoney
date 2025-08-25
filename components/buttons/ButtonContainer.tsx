import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Spacing } from '../../constants/themeHooks'
import { useTheme } from '../../contexts/ThemeContext.js'

interface ButtonContainerProps {
  children: React.ReactNode
  style?: any
}

export default function ButtonContainer({ children, style }: ButtonContainerProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: Spacing.md,
  },
})
