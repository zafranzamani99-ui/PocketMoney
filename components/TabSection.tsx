import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'

interface TabItem {
  id: string
  title: string
  content: React.ReactNode
}

interface TabSectionProps {
  tabs: TabItem[]
  defaultTab?: string
}

export default function TabSection({ tabs, defaultTab }: TabSectionProps) {
  const { colors } = useTheme()
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const styles = createStyles(colors)

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.content}>
        {activeTabContent}
      </View>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexGrow: 0,
    marginBottom: Spacing.md,
  },
  tabBarContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activeTabText: {
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
})