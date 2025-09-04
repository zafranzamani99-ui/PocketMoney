import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'

interface StatCardProps {
  title: string
  value: string
  change?: string
  positive?: boolean
  icon?: string
  loading?: boolean
  subtitle?: string
}

export default function StatCard({ 
  title, 
  value, 
  change, 
  positive, 
  icon,
  loading = false,
  subtitle
}: StatCardProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      
      <Text style={styles.value}>
        {loading ? 'Loading...' : value}
      </Text>
      
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      
      {change && !loading && (
        <Text style={[
          styles.change,
          positive ? styles.positiveChange : styles.negativeChange
        ]}>
          {change}
        </Text>
      )}
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  icon: {
    fontSize: 16,
  },
  value: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  change: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.medium,
  },
  positiveChange: {
    color: colors.success,
  },
  negativeChange: {
    color: colors.error,
  },
})