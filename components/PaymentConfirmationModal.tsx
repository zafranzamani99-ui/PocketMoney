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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

interface PaymentConfirmationModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  amount: number
  customerName?: string
}

const CashAnimation = memo(({ show, colors }: { show: boolean; colors: any }) => {
  const [isAnimating, setIsAnimating] = useState(false)

  // Increased cash bills for big money effect
  const cashAnimations = Array.from({ length: 18 }, () => ({
    translateY: useRef(new Animated.Value(-100)).current,
    translateX: useRef(new Animated.Value(Math.random() * screenWidth)).current,
    rotation: useRef(new Animated.Value(0)).current,
    scale: useRef(new Animated.Value(0)).current,
  }))

  // Increased fireworks for spectacular effect
  const fireworksAnimations = Array.from({ length: 12 }, () => ({
    translateX: useRef(new Animated.Value(0)).current,
    translateY: useRef(new Animated.Value(0)).current,
    scale: useRef(new Animated.Value(0)).current,
    rotation: useRef(new Animated.Value(0)).current,
  }))

  useEffect(() => {
    if (show && !isAnimating) {
      setIsAnimating(true)
      // 1. Start fireworks first with simpler animation
      const fireworksAnimationsArray = fireworksAnimations.map((firework, index) => {
        const angle = (index * 30) * Math.PI / 180 // 30 degrees apart for 12 particles
        const radius = 120 + Math.random() * 50 // Good radius for visual impact
        
        return Animated.parallel([
          // Burst outward
          Animated.timing(firework.translateX, {
            toValue: Math.cos(angle) * radius,
            duration: 500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(firework.translateY, {
            toValue: Math.sin(angle) * radius,
            duration: 500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // Scale animation - simpler
          Animated.sequence([
            Animated.timing(firework.scale, {
              toValue: 1,
              duration: 100,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.delay(200),
            Animated.timing(firework.scale, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          // Simple rotation
          Animated.timing(firework.rotation, {
            toValue: 360,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      })

      // 2. Fast cash animation - much shorter duration
      const cashWave1 = cashAnimations.slice(0, 6).map((cash) => {
        return Animated.parallel([
          // Fall down - much faster
          Animated.timing(cash.translateY, {
            toValue: screenHeight + 50,
            duration: 1200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // Horizontal drift
          Animated.timing(cash.translateX, {
            toValue: (screenWidth * 0.1) + Math.random() * (screenWidth * 0.8),
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Simple rotation
          Animated.timing(cash.rotation, {
            toValue: Math.random() * 720,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Scale animation - faster
          Animated.sequence([
            Animated.timing(cash.scale, {
              toValue: 1,
              duration: 150,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.delay(800),
            Animated.timing(cash.scale, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]),
        ])
      })

      const cashWave2 = cashAnimations.slice(6, 12).map((cash) => {
        return Animated.parallel([
          // Fall down - faster
          Animated.timing(cash.translateY, {
            toValue: screenHeight + 50,
            duration: 1100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // Horizontal drift
          Animated.timing(cash.translateX, {
            toValue: Math.random() * screenWidth,
            duration: 1100,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Simple rotation
          Animated.timing(cash.rotation, {
            toValue: Math.random() * 540,
            duration: 1100,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Scale animation - faster
          Animated.sequence([
            Animated.timing(cash.scale, {
              toValue: 0.9,
              duration: 120,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.delay(750),
            Animated.timing(cash.scale, {
              toValue: 0,
              duration: 230,
              useNativeDriver: true,
            }),
          ]),
        ])
      })

      const cashWave3 = cashAnimations.slice(12).map((cash) => {
        return Animated.parallel([
          // Fall down - fastest
          Animated.timing(cash.translateY, {
            toValue: screenHeight + 50,
            duration: 1000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // Horizontal drift
          Animated.timing(cash.translateX, {
            toValue: (screenWidth * 0.2) + Math.random() * (screenWidth * 0.6),
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Simple rotation
          Animated.timing(cash.rotation, {
            toValue: Math.random() * 360,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Scale animation - fastest
          Animated.sequence([
            Animated.timing(cash.scale, {
              toValue: 0.8,
              duration: 100,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.delay(700),
            Animated.timing(cash.scale, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ])
      })

      // Start animations with staggered waves for big money effect
      Animated.parallel([
        Animated.stagger(50, fireworksAnimationsArray),
        Animated.stagger(80, cashWave1),
        Animated.sequence([
          Animated.delay(300),
          Animated.stagger(70, cashWave2)
        ]),
        Animated.sequence([
          Animated.delay(600),
          Animated.stagger(90, cashWave3)
        ])
      ]).start(() => {
        // Animation completed - faster
        setTimeout(() => setIsAnimating(false), 400)
      })
      
    } else if (!show) {
      // Reset all animations and flags
      setIsAnimating(false)
      cashAnimations.forEach(cash => {
        cash.translateY.setValue(-100)
        cash.translateX.setValue(Math.random() * screenWidth)
        cash.rotation.setValue(0)
        cash.scale.setValue(0)
      })
      fireworksAnimations.forEach(firework => {
        firework.translateX.setValue(0)
        firework.translateY.setValue(0)
        firework.scale.setValue(0)
        firework.rotation.setValue(0)
      })
    }
  }, [show])

  if (!show) return null

  const styles = createStyles(colors)

  return (
    <View style={styles.animationContainer} pointerEvents="none">
      {/* Fireworks burst from center */}
      <View style={styles.fireworksCenter}>
        {fireworksAnimations.map((firework, index) => (
          <Animated.View
            key={`firework-${index}`}
            style={[
              styles.fireworkParticle,
              {
                transform: [
                  { translateX: firework.translateX },
                  { translateY: firework.translateY },
                  { scale: firework.scale },
                  { rotate: firework.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }) },
                ],
              },
            ]}
          >
            <Text style={styles.fireworkEmoji}>
              {['✨', '🎆', '🎇', '💫', '⭐'][index % 5]}
            </Text>
          </Animated.View>
        ))}
      </View>

      {/* Cash money falling */}
      {cashAnimations.map((cash, index) => (
        <Animated.View
          key={`cash-${index}`}
          style={[
            styles.cashBill,
            {
              transform: [
                { translateX: cash.translateX },
                { translateY: cash.translateY },
                { rotate: cash.rotation.interpolate({
                  inputRange: [0, 1080],
                  outputRange: ['0deg', '1080deg'],
                }) },
                { scale: cash.scale },
              ],
            },
          ]}
        >
          <Text style={styles.cashEmoji}>
            {['💵', '💴', '💶', '💷'][index % 4]}
          </Text>
        </Animated.View>
      ))}
    </View>
  )
})

export default function PaymentConfirmationModal({
  visible,
  onClose,
  onConfirm,
  amount,
  customerName,
}: PaymentConfirmationModalProps) {
  const { colors } = useTheme()
  const [showAnimation, setShowAnimation] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  
  // Preserve customer name during animation to prevent it from changing
  const [preservedCustomerName, setPreservedCustomerName] = useState<string | undefined>(customerName)
  
  // Animated amount counter
  const animatedAmount = useRef(new Animated.Value(amount)).current
  const [displayAmount, setDisplayAmount] = useState(amount)
  
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
      // Reset amount counter
      animatedAmount.setValue(amount)
      setDisplayAmount(amount)
      
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
      animatedAmount.setValue(amount)
      setDisplayAmount(amount)
    }
  }, [visible, customerName, isClosing, amount])

  const handleConfirm = () => {
    if (isProcessing || isClosing) return // Prevent multiple triggers
    
    setIsProcessing(true)
    setIsClosing(true)
    
    // Start amount countdown animation
    const amountListener = animatedAmount.addListener(({ value }) => {
      setDisplayAmount(Math.max(0, Math.round(value * 100) / 100))
    })
    
    Animated.timing(animatedAmount, {
      toValue: 0,
      duration: 1200, // Match cash animation duration
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // Can't use native driver for non-transform values
    }).start(() => {
      animatedAmount.removeListener(amountListener)
    })
    
    // Start animation after a brief delay to ensure UI is stable
    setTimeout(() => {
      setShowAnimation(true)
    }, 200)
    
    // Wait for animation to complete, then close modal
    setTimeout(() => {
      onConfirm()
      setTimeout(() => {
        onClose()
        // Reset closing state after modal closes
        setTimeout(() => {
          setIsClosing(false)
        }, 100)
      }, 1500) // Much shorter to match fast animation (1200ms + buffer)
    }, 800)
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
                <Text style={styles.headerIcon}>💰</Text>
              </View>
              <Text style={styles.title}>Payment Confirmation</Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.questionText}>
                Did you receive payment from{' '}
                <Text style={styles.customerName}>
                  {preservedCustomerName || 'customer'}
                </Text>
                ?
              </Text>
              
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Amount</Text>
                <Text style={styles.amountValue}>RM {displayAmount.toFixed(2)}</Text>
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
                    <Text style={styles.confirmButtonIcon}>💵</Text>
                    <Text style={styles.confirmButtonText}>Received!</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Processing State */}
            {isProcessing && (
              <View style={styles.processingContainer}>
                <Text style={styles.processingText}>Payment Received!</Text>
                <Text style={styles.processingSubtext}>
                  RM {amount.toFixed(2)} added to your wallet
                </Text>
              </View>
            )}
          </Animated.View>
        </SafeAreaView>

        {/* Cash Animation Overlay */}
        <CashAnimation show={showAnimation} colors={colors} />
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
    backgroundColor: colors.success + '20',
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
  amountContainer: {
    backgroundColor: colors.background,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 2,
    borderColor: colors.success + '30',
    alignItems: 'center',
    minWidth: 150,
  },
  amountLabel: {
    fontSize: Typography.fontSizes.caption,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: Typography.fontSizes.display,
    fontFamily: Typography.fontFamily.bold,
    color: colors.success,
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
    backgroundColor: colors.success,
    shadowColor: colors.success,
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
    color: colors.success,
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
    zIndex: 1000,
  },
  
  // Fireworks
  fireworksCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 1,
    zIndex: 1002,
  },
  fireworkParticle: {
    position: 'absolute',
    zIndex: 1002,
  },
  fireworkEmoji: {
    fontSize: 24,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  
  // Cash money
  cashBill: {
    position: 'absolute',
    zIndex: 1001,
  },
  cashEmoji: {
    fontSize: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
})