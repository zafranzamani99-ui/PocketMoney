import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { voiceService, VoiceResult } from '../services/voiceService'

interface VoiceInputModalProps {
  visible: boolean
  onClose: () => void
  onResult: (result: VoiceResult) => void
}

export default function VoiceInputModal({ visible, onClose, onResult }: VoiceInputModalProps) {
  const { colors } = useTheme()
  const [isListening, setIsListening] = useState(false)
  const [pulseAnim] = useState(new Animated.Value(1))
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null)

  useEffect(() => {
    if (visible) {
      initializeVoice()
    } else {
      cleanup()
    }

    return () => cleanup()
  }, [visible])

  useEffect(() => {
    if (isListening) {
      startPulseAnimation()
    } else {
      stopPulseAnimation()
    }
  }, [isListening])

  const initializeVoice = async () => {
    try {
      await voiceService.initialize()
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize voice recognition')
      console.error(error)
    }
  }

  const cleanup = async () => {
    try {
      if (isListening) {
        await voiceService.stopListening()
        setIsListening(false)
      }
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  }

  const startListening = async () => {
    try {
      await voiceService.startListening()
      setIsListening(true)
      setLastResult(null)
      
      // Add timeout to stop listening after 10 seconds
      setTimeout(() => {
        if (isListening) {
          stopListening()
        }
      }, 10000)
    } catch (error) {
      Alert.alert('Error', 'Failed to start voice recognition')
      console.error(error)
    }
  }

  const stopListening = async () => {
    try {
      await voiceService.stopListening()
      setIsListening(false)
    } catch (error) {
      console.error('Stop listening error:', error)
    }
  }

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation()
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }

  const handleVoiceResult = (result: VoiceResult) => {
    setLastResult(result)
    setIsListening(false)
    
    if (result.command !== 'unknown') {
      setTimeout(() => {
        onResult(result)
        onClose()
      }, 2000) // Show result for 2 seconds
    }
  }

  // Simulate voice processing (replace with actual voice service integration)
  useEffect(() => {
    if (isListening) {
      // This would be replaced by actual voice service callbacks
      const timer = setTimeout(() => {
        // Mock result for demonstration
        const mockResult: VoiceResult = {
          command: 'expense',
          amount: 25.50,
          description: 'Petrol for delivery',
          category: 'Transport',
        }
        handleVoiceResult(mockResult)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isListening])

  const examples = voiceService.getExampleCommands()

  const styles = createStyles(colors)

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Voice Input</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.micSection}>
            <Animated.View style={[styles.micContainer, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity
                style={[
                  styles.micButton,
                  isListening && styles.micButtonActive,
                ]}
                onPress={isListening ? stopListening : startListening}
              >
                <Text style={styles.micIcon}>🎤</Text>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.statusText}>
              {isListening 
                ? 'Listening... Speak now!' 
                : lastResult 
                  ? 'Processing complete!'
                  : 'Tap microphone to start'
              }
            </Text>

            {lastResult && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Recognized:</Text>
                <View style={styles.resultCard}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Command:</Text>
                    <Text style={styles.resultValue}>{lastResult.command.toUpperCase()}</Text>
                  </View>
                  
                  {lastResult.amount && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Amount:</Text>
                      <Text style={styles.resultValue}>RM {lastResult.amount.toFixed(2)}</Text>
                    </View>
                  )}
                  
                  {lastResult.description && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Description:</Text>
                      <Text style={styles.resultValue}>{lastResult.description}</Text>
                    </View>
                  )}
                  
                  {lastResult.category && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Category:</Text>
                      <Text style={styles.resultValue}>{lastResult.category}</Text>
                    </View>
                  )}
                  
                  {lastResult.customer && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Customer:</Text>
                      <Text style={styles.resultValue}>{lastResult.customer}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>How to Use Voice Input</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipItem}>• Speak clearly and at normal pace</Text>
              <Text style={styles.tipItem}>• Include amounts in Ringgit (RM) or dollars</Text>
              <Text style={styles.tipItem}>• Mention what the expense or income is for</Text>
              <Text style={styles.tipItem}>• Use simple, direct phrases</Text>
              <Text style={styles.tipItem}>• Works in English and Bahasa Malaysia</Text>
            </View>
          </View>

          <View style={styles.examplesSection}>
            {Object.entries(examples).map(([category, exampleList]) => (
              <View key={category} style={styles.exampleCategory}>
                <Text style={styles.exampleCategoryTitle}>{category}</Text>
                <View style={styles.exampleList}>
                  {exampleList.map((example, index) => (
                    <View key={index} style={styles.exampleItem}>
                      <Text style={styles.exampleText}>"{example}"</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.languageSection}>
            <Text style={styles.languageTitle}>Supported Languages</Text>
            <View style={styles.languageList}>
              <View style={styles.languageItem}>
                <Text style={styles.languageFlag}>🇺🇸</Text>
                <Text style={styles.languageText}>English</Text>
              </View>
              <View style={styles.languageItem}>
                <Text style={styles.languageFlag}>🇲🇾</Text>
                <Text style={styles.languageText}>Bahasa Malaysia</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  cancelButton: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  micSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  micContainer: {
    marginBottom: Spacing.lg,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  micIcon: {
    fontSize: 48,
  },
  statusText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  resultContainer: {
    width: '100%',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  resultLabel: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  resultValue: {
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeights.bold,
    flex: 1,
    textAlign: 'right',
  },
  tipsSection: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipsTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipItem: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  examplesSection: {
    marginBottom: Spacing.lg,
  },
  exampleCategory: {
    marginBottom: Spacing.lg,
  },
  exampleCategoryTitle: {
    fontSize: Typography.fontSizes.body,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  exampleList: {
    gap: Spacing.sm,
  },
  exampleItem: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exampleText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  languageSection: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageTitle: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  languageList: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
  },
})