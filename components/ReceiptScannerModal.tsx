import React, { useState, useRef, useEffect } from 'react'
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
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { Typography, Spacing, BorderRadius } from '../constants/themeHooks'
import { useTheme } from '../contexts/ThemeContext.js'
import { supabase } from '../lib/supabase'

interface ReceiptScannerModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: (extractedData: any) => void
}

export default function ReceiptScannerModal({ visible, onClose, onSuccess }: ReceiptScannerModalProps) {
  const { colors } = useTheme()
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<CameraType>('back')
  const [flash, setFlash] = useState<FlashMode>('off')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission()
    }
  }, [visible, permission])

  const takePicture = async () => {
    if (!cameraRef.current) return

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      })

      if (photo?.uri) {
        setCapturedImage(photo.uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture')
      console.error(error)
    }
  }

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image')
      console.error(error)
    }
  }

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

  const processWithGroq = async (imageUrl: string) => {
    // Mock Groq API processing - replace with actual implementation
    const mockData = {
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

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    return mockData
  }

  const retakePhoto = () => {
    setCapturedImage(null)
  }

  const handleClose = () => {
    setCapturedImage(null)
    setProcessing(false)
    onClose()
  }

  const styles = createStyles(colors)

  if (!permission) {
    return null
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission is required to scan receipts</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.headerButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scan Receipt</Text>
          <TouchableOpacity onPress={pickImage}>
            <Text style={styles.headerButton}>📁</Text>
          </TouchableOpacity>
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
              <View style={styles.cameraOverlay}>
                <View style={styles.scanGuide}>
                  <Text style={styles.guideText}>Position receipt within the frame</Text>
                  <View style={styles.scanFrame} />
                </View>
              </View>
            </CameraView>

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
  headerButton: {
    fontSize: Typography.fontSizes.subheading,
    color: colors.primary,
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
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanGuide: {
    alignItems: 'center',
  },
  guideText: {
    fontSize: Typography.fontSizes.body,
    color: colors.textPrimary,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xl,
  },
  scanFrame: {
    width: 250,
    height: 300,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: BorderRadius.md,
    backgroundColor: 'transparent',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: colors.background,
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