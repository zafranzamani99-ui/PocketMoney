import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme, ColorScheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'

interface ExtractedReceiptData {
  store_name: string
  total_amount: number
  date: string
  items: Array<{ name: string; price: number }>
  payment_method?: string
  gst_amount?: number
}

interface ReceiptScannerModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: (extractedData: ExtractedReceiptData) => void
}

export default function ReceiptScannerModal({ visible, onClose, onSuccess }: ReceiptScannerModalProps) {
  const { colors } = useTheme()
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<CameraType>('back')
  const [flash, setFlash] = useState<FlashMode>('off')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const cameraRef = useRef<CameraView>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Cleanup effect
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      // Cleanup captured image URI to prevent memory leaks
      if (capturedImage) {
        setCapturedImage(null)
      }
    }
  }, [])

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission()
    }
  }, [visible, permission])

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || !isMountedRef.current) return

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      })

      if (photo?.uri && isMountedRef.current) {
        setCapturedImage(photo.uri)
      }
    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to take picture')
        console.error('takePicture error:', error)
      }
    }
  }, [])

  const pickImage = useCallback(async () => {
    if (!isMountedRef.current) return

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0] && isMountedRef.current) {
        setCapturedImage(result.assets[0].uri)
      }
    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to pick image')
        console.error('pickImage error:', error)
      }
    }
  }, [])

  const cropImage = async () => {
    if (!capturedImage) return

    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        capturedImage,
        [{ resize: { width: 1000 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      )

      setCapturedImage(manipResult.uri)
    } catch (error) {
      Alert.alert('Error', 'Failed to crop image')
      console.error(error)
    }
  }

  const processReceipt = async () => {
    if (!capturedImage) return

    setProcessing(true)
    try {
      // Upload image to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const fileName = `receipt_${user.id}_${Date.now()}.jpg`
      const response = await fetch(capturedImage)
      const blob = await response.blob()

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, blob)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      // Save receipt record
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
        })
        .select()
        .single()

      if (receiptError) throw receiptError

      // Process with Groq API (mock for now)
      const extractedData = await processWithGroq(publicUrl)

      // Update receipt with extracted data
      await supabase
        .from('receipts')
        .update({
          extracted_data: extractedData,
          processed_at: new Date().toISOString(),
        })
        .eq('id', receiptData.id)

      onSuccess(extractedData)
      handleClose()
    } catch (error) {
      Alert.alert('Error', 'Failed to process receipt')
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const processWithGroq = useCallback(async (imageUrl: string): Promise<ExtractedReceiptData> => {
    // Mock Groq API processing - replace with actual implementation
    const mockData: ExtractedReceiptData = {
      store_name: 'KK Mart',
      total_amount: 25.50,
      date: new Date().toISOString().split('T')[0],
      items: [
        { name: 'Bread', price: 3.50 },
        { name: 'Milk', price: 8.00 },
        { name: 'Eggs', price: 14.00 },
      ],
      payment_method: 'Cash',
      gst_amount: 1.53,
    }

    // Simulate API delay with proper cleanup
    return new Promise<ExtractedReceiptData>((resolve, reject) => {
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          timeoutRef.current = null
          resolve(mockData)
        } else {
          reject(new Error('Component unmounted'))
        }
      }, 2000)
    })
  }, [])

  const retakePhoto = useCallback(() => {
    if (isMountedRef.current) {
      setCapturedImage(null)
    }
  }, [])

  const handleClose = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (isMountedRef.current) {
      setCapturedImage(null)
      setProcessing(false)
    }
    onClose()
  }, [onClose])

  const styles = createStyles(colors)

  if (!permission) {
    return null
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.permissionContainer} edges={['top', 'bottom']}>
          <Text style={styles.permissionText}>Camera permission is required to scan receipts</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Receipt</Text>
        </View>

        {capturedImage ? (
          <View style={styles.previewContainer}>
            <ScrollView contentContainerStyle={styles.previewContent}>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
              
              <View style={styles.previewActions}>
                <TouchableOpacity style={styles.actionButton} onPress={retakePhoto}>
                  <Text style={styles.actionButtonText}>📷 Retake</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton} onPress={cropImage}>
                  <Text style={styles.actionButtonText}>✂️ Crop</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={processReceipt}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                      🔍 Process
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              flash={flash}
            >
              <TouchableOpacity onPress={handleClose} style={styles.closeButtonOverlay}>
                <Text style={styles.headerButton}>✕</Text>
              </TouchableOpacity>
              <View style={styles.scanFrame} />
            </CameraView>

            <TouchableOpacity onPress={pickImage} style={styles.galleryOption}>
              <Text style={styles.galleryText}>Upload receipt from Gallery</Text>
            </TouchableOpacity>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
              >
                <Text style={styles.controlButtonText}>
                  {flash === 'off' ? '🔦' : '💡'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
              >
                <Text style={styles.controlButtonText}>🔄</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: 'black',
  },
  closeButtonOverlay: {
    position: 'absolute',
    top: 5,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  galleryOption: {
    backgroundColor: colors.primary,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
  galleryText: {
    fontSize: Typography.fontSizes.body,
    fontFamily: Typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  title: {
    fontSize: Typography.fontSizes.subheading,
    fontWeight: Typography.fontWeights.bold,
    color: 'white',
  },
  headerButton: {
    fontSize: Typography.fontSizes.subheading,
    color: 'white',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: Spacing.lg,
  },
  permissionText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  permissionButtonText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  cancelButton: {
    padding: Spacing.md,
  },
  cancelButtonText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
    backgroundColor: 'black',
  },
  scanFrame: {
    position: 'absolute',
    top: '10%',
    left: '8%',
    right: '8%',
    height: '80%',
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: 'black',
    height: 100,
    marginBottom: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlButtonText: {
    fontSize: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.textPrimary,
  },
  previewContainer: {
    flex: 1,
  },
  previewContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  previewImage: {
    width: '90%',
    height: 400,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  previewActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  primaryButtonText: {
    color: colors.textPrimary,
  },
})