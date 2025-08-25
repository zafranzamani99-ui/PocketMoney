import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'

interface FeatureCardProps {
  title: string
  description: string
  emoji: string
  onPress: () => void
  badge?: string
  comingSoon?: boolean
  premium?: boolean
}

export default function FeatureCard({ 
  title, 
  description, 
  emoji, 
  onPress, 
  badge,
  comingSoon = false,
  premium = false
}: FeatureCardProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        comingSoon && styles.cardDisabled,
        premium && styles.cardPremium
      ]} 
      onPress={onPress}
      disabled={comingSoon}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>{emoji}</Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
          {premium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {comingSoon && (
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.md,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardPremium: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  badgeText: {
    fontSize: Typography.fontSizes.tiny,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },
  premiumBadge: {
    backgroundColor: colors.accent,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  premiumBadgeText: {
    fontSize: Typography.fontSizes.tiny,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textDark,
  },
  title: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeights.body,
  },
  comingSoonText: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.warning,
    marginTop: Spacing.sm,
  },
})