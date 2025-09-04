import React, { useEffect, useRef, useState, memo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext'

const { width: screenWidth } = Dimensions.get('window')

interface OrderCompletionModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  orderAmount: number
  customerName?: string
}

const BoxWrappingAnimation = memo(({ show, colors }: { show: boolean; colors: any }) => {
  const boxScale = useRef(new Animated.Value(0)).current
  const boxRotation = useRef(new Animated.Value(0)).current
  const ribbonScale = useRef(new Animated.Value(0)).current
  const sparkleAnimations = Array.from({ length: 6 }, () => ({
    scale: useRef(new Animated.Value(0)).current,
    rotation: useRef(new Animated.Value(0)).current,
    translateX: useRef(new Animated.Value(0)).current,
    translateY: useRef(new Animated.Value(0)).current,
  }))

  useEffect(() => {
    if (show) {
      // Sequential animation: box appears → spins → transforms to gift → sparkles
      Animated.sequence([
        // 1. Box appears with bounce
        Animated.spring(boxScale, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
        // 2. Box spins once (still plain box)
        Animated.timing(boxRotation, {
          toValue: 360,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // 3. Transform to gift box (plain box fades out, gift appears)
        Animated.spring(ribbonScale, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        // 4. Small delay before sparkles
        Animated.delay(300),
      ]).start(() => {
        // Sparkles animation
        const sparkleAnimationsArray = sparkleAnimations.map((sparkle, index) => {
          const angle = (index * 60) * Math.PI / 180 // 60 degrees apart
          const radius = 80
          
          return Animated.parallel([
            // Scale in and out
            Animated.sequence([
              Animated.timing(sparkle.scale, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(sparkle.scale, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
            ]),
            // Move outward
            Animated.timing(sparkle.translateX, {
              toValue: Math.cos(angle) * radius,
              duration: 800,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.translateY, {
              toValue: Math.sin(angle) * radius,
              duration: 800,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            // Rotation
            Animated.timing(sparkle.rotation, {
              toValue: 720,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        })

        Animated.stagger(100, sparkleAnimationsArray).start()
      })
    } else {
      // Reset all animations
      boxScale.setValue(0)
      boxRotation.setValue(0)
      ribbonScale.setValue(0)
      sparkleAnimations.forEach(sparkle => {
        sparkle.scale.setValue(0)
        sparkle.rotation.setValue(0)
        sparkle.translateX.setValue(0)
        sparkle.translateY.setValue(0)
      })
    }
  }, [show])

  if (!show) return null

  const styles = createStyles(colors)

  return (
    <View style={styles.animationContainer} pointerEvents="none">
      {/* Sparkles */}
      {sparkleAnimations.map((sparkle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.sparkle,
            {
              transform: [
                { translateX: sparkle.translateX },
                { translateY: sparkle.translateY },
                { scale: sparkle.scale },
                { rotate: sparkle.rotation.interpolate({
                  inputRange: [0, 720],
                  outputRange: ['0deg', '720deg'],
                }) },
              ],
            },
          ]}
        >
          <Text style={styles.sparkleEmoji}>✨</Text>
        </Animated.View>
      ))}

      {/* Gift Box Animation */}
      <View style={styles.giftBoxContainer}>
        {/* Step 1: Plain Box (shows first, then disappears) */}
        <Animated.View
          style={[
            styles.plainBox,
            {
              transform: [
                { scale: boxScale },
                { rotate: boxRotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }) },
              ],
              opacity: ribbonScale.interpolate({
                inputRange: [0, 0.1, 1],
                outputRange: [1, 0, 0], // Fade out when ribbon appears
              }),
            },
          ]}
        >
          <Text style={styles.plainBoxEmoji}>📦</Text>
        </Animated.View>

        {/* Step 2: Gift Box (shows after ribbon animation starts) */}
        <Animated.View
          style={[
            styles.giftBox,
            {
              transform: [{ scale: ribbonScale }],
              opacity: ribbonScale,
            },
          ]}
        >
          <Text style={styles.giftBoxEmoji}>🎁</Text>
        </Animated.View>
      </View>
    </View>
  )
})

export default function OrderCompletionModal({
  visible,
  onClose,
  onConfirm,
  orderAmount,
  customerName,
}: OrderCompletionModalProps) {
  const { colors } = useTheme()
  const [showAnimation, setShowAnimation] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  
  // Preserve customer name during animation to prevent it from changing
  const [preservedCustomerName, setPreservedCustomerName] = useState<string | undefined>(customerName)
  
  const scaleAnimation = useRef(new Animated.Value(0)).current
  const slideAnimation = useRef(new Animated.Value(50)).current
  const opacityAnimation = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible && !isClosing) {
      setShowAnimation(false)
      setIsProcessing(false)
      setIsClosing(false)
      // Capture and preserve customer name when modal opens
      setPreservedCustomerName(customerName)
      
      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnimation, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else if (!visible) {
      // Reset animations and states
      setIsClosing(false)
      setShowAnimation(false)
      setIsProcessing(false)
      scaleAnimation.setValue(0)
      slideAnimation.setValue(50)
      opacityAnimation.setValue(0)
    }
  }, [visible, customerName, isClosing])

  const handleConfirm = () => {
    if (isProcessing || isClosing) return // Prevent multiple triggers
    
    setIsProcessing(true)
    setIsClosing(true)
    setShowAnimation(true)
    
    // Wait for animation to start, then close modal and confirm
    setTimeout(() => {
      onConfirm()
      setTimeout(() => {
        onClose()
        // Reset closing state after modal closes
        setTimeout(() => {
          setIsClosing(false)
        }, 100)
      }, 2000) // Let animation play longer for box wrapping
    }, 500)
  }

  const styles = createStyles(colors)

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  { scale: scaleAnimation },
                  { translateY: slideAnimation },
                ],
                opacity: opacityAnimation,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.headerIcon}>📋</Text>
              </View>
              <Text style={styles.title}>Complete Order</Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.questionText}>
                Ready to complete the order for{' '}
                <Text style={styles.customerName}>
                  {preservedCustomerName || 'customer'}
                </Text>
                ?
              </Text>
              
              <View style={styles.orderSummary}>
                <Text style={styles.summaryLabel}>Order Total</Text>
                <Text style={styles.summaryValue}>RM {orderAmount.toFixed(2)}</Text>
                <Text style={styles.summaryNote}>
                  This order will be marked as completed and delivered
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            {!isProcessing && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    if (!isProcessing) {
                      onClose()
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={isProcessing}
                >
                  <Text style={styles.cancelButtonText}>Not Yet</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <View style={styles.confirmButtonContent}>
                    <Text style={styles.confirmButtonIcon}>✅</Text>
                    <Text style={styles.confirmButtonText}>Complete!</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Processing State */}
            {isProcessing && (
              <View style={styles.processingContainer}>
                <Text style={styles.processingText}>Order Completed!</Text>
                <Text style={styles.processingSubtext}>
                  Ready for delivery • RM {orderAmount.toFixed(2)}
                </Text>
              </View>
            )}
          </Animated.View>
        </SafeAreaView>

        {/* Box Wrapping Animation Overlay */}
        <BoxWrappingAnimation show={showAnimation} colors={colors} />
      </View>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: Typography.fontSizes.heading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Content
  content: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  questionText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  customerName: {
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textPrimary,
  },
  orderSummary: {
    backgroundColor: colors.background,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    alignItems: 'center',
    minWidth: 200,
  },
  summaryLabel: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: Typography.fontSizes.display,
    fontFamily: Typography.fontFamily.bold,
    color: colors.primary,
    marginBottom: Spacing.xs,
  },
  summaryNote: {
    fontSize: Typography.fontSizes.bodySmall,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Action Buttons
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.semiBold,
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  confirmButtonIcon: {
    fontSize: 20,
  },
  confirmButtonText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.bold,
    color: colors.textPrimary,
  },

  // Processing State
  processingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  processingText: {
    fontSize: Typography.fontSizes.subheading,
    fontFamily: Typography.fontFamily.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  processingSubtext: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.regular,
    color: colors.textSecondary,
  },

  // Animation
  animationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  giftBoxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 100,
  },
  plainBox: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plainBoxEmoji: {
    fontSize: 60,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  giftBox: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftBoxEmoji: {
    fontSize: 60,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleEmoji: {
    fontSize: 20,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
})