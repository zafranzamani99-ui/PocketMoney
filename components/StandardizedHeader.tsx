import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native'
import { Typography, Spacing } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'

const { width: screenWidth } = Dimensions.get('window')
const isTablet = screenWidth >= 768

interface StandardizedHeaderProps {
  title: string
  rightComponent?: React.ReactNode
  showGreeting?: boolean
  greetingText?: string
  businessName?: string
}

export default function StandardizedHeader({ 
  title, 
  rightComponent,
  showGreeting = false,
  greetingText,
  businessName
}: StandardizedHeaderProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          {showGreeting ? (
            <>
              <Text style={styles.greeting}>{greetingText}</Text>
              <Text style={styles.businessName}>{businessName}</Text>
            </>
          ) : (
            <Text style={styles.title}>{title}</Text>
          )}
        </View>
        
        {rightComponent && (
          <View style={styles.headerRight}>
            {rightComponent}
          </View>
        )}
      </View>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    marginTop: Spacing.xxl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSizes.display,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  greeting: {
    fontSize: isTablet ? Typography.fontSizes.subheading : Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  businessName: {
    fontSize: isTablet ? Typography.fontSizes.display : Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
})