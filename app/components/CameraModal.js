import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function CameraModal({ visible, onClose, onDrinkDetected, onOpenManualLog }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [detectedDrink, setDetectedDrink] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);

  console.log('CameraModal render - visible:', visible, 'hasPermission:', hasPermission);

  useEffect(() => {
    (async () => {
      console.log('Requesting camera permission...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (!isCapturing) {
      setIsCapturing(true);
      try {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });

        if (!result.canceled && result.assets[0]) {
          setCapturedImage(result.assets[0]);
          setIsCapturing(false);
          setIsProcessing(true);
          
          // Send to edge function for analysis
          const analysisResult = await analyzeDrinkImage(result.assets[0].base64);
          
          if (analysisResult.success) {
            setDetectedDrink(analysisResult.data);
            setShowConfirmation(true);
          } else {
            Alert.alert('Error', 'Could not analyze the drink. Please try again.');
          }
        } else {
          setIsCapturing(false);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image. Please try again.');
        setIsCapturing(false);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const analyzeDrinkImage = async (base64Image) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-drink-image', {
        body: { image: base64Image }
      });

      if (error) {
        console.error('Edge function error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error calling edge function:', error);
      return { success: false, error: error.message };
    }
  };

  if (hasPermission === null) {
    console.log('CameraModal: Permission is null, returning null');
    return null;
  }

  if (hasPermission === false) {
    console.log('CameraModal: Permission denied, showing permission error');
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>No access to camera</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  console.log('CameraModal: Rendering main modal');
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 28 }} />
            <Text style={styles.headerTitle}>Scan Drink</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
          </View>

          {/* Camera frame overlay */}
          <View style={styles.frameOverlay}>
            {!showConfirmation ? (
              <>
                <View style={styles.scanFrame} />
                <Text style={styles.scanText}>Tap the button below to take a photo</Text>
                {capturedImage && (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: capturedImage.uri }} style={styles.previewImage} />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.confirmationContainer}>
                <View style={styles.detectionResult}>
                  <Text style={styles.detectionLabel}>Detected:</Text>
                  <Text style={styles.detectionName}>{detectedDrink.name}</Text>
                  <Text style={styles.detectionAmount}>
                    Estimated: {detectedDrink.estimatedOz} oz
                  </Text>
                  <Text style={styles.confidence}>
                    Confidence: {Math.round(detectedDrink.confidence * 100)}%
                  </Text>
                </View>
                
                {isManualMode ? (
                  <View style={styles.manualEntry}>
                    <Text style={styles.manualLabel}>Enter amount (oz):</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={customAmount}
                      onChangeText={setCustomAmount}
                      keyboardType="numeric"
                      placeholder="Enter ounces"
                      placeholderTextColor="#999"
                    />
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#4FC3F7" />
                <Text style={styles.processingText}>Analyzing drink...</Text>
              </View>
            ) : showConfirmation ? (
              <View style={styles.confirmationActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    if (isManualMode) {
                      setIsManualMode(false);
                      setCustomAmount('');
                    } else {
                      setIsManualMode(true);
                      setCustomAmount(detectedDrink?.estimatedOz?.toString() || '');
                    }
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isManualMode ? 'Back' : 'Edit Amount'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    const amount = isManualMode ? parseInt(customAmount) : detectedDrink.estimatedOz;
                    const drinkName = isManualMode ? 'Custom Drink' : detectedDrink.name;
                    
                    onDrinkDetected({
                      name: drinkName,
                      water_oz: amount,
                      checkinType: 'camera'
                    });
                    
                    // Reset state
                    setShowConfirmation(false);
                    setDetectedDrink(null);
                    setCapturedImage(null);
                    setIsManualMode(false);
                    setCustomAmount('');
                  }}
                >
                  <Text style={styles.primaryButtonText}>
                    {isManualMode ? 'Add Drink' : 'Confirm'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                  onPress={takePicture}
                  disabled={isCapturing}
                >
                  <Ionicons name="camera" size={32} color="white" />
                </TouchableOpacity>
                
                {/* Manual Add Button */}
                <TouchableOpacity
                  style={styles.manualAddButton}
                  onPress={() => {
                    onClose();
                    if (onOpenManualLog) {
                      onOpenManualLog();
                    }
                  }}
                >
                  <Text style={styles.manualAddText}>Add drink manually</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFEB',
  },
  overlay: {
    flex: 1,
    backgroundColor: '#F2EFEB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#000',
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
  },
  closeButton: {
    padding: 8,
  },
  frameOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 300,
    height: 300,
    borderWidth: 2,
    borderColor: '#4FC3F7',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    marginTop: 20,
    textAlign: 'center',
  },
  previewContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  bottomControls: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4FC3F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    marginTop: 10,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2EFEB',
  },
  permissionText: {
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
    color: '#333',
    marginBottom: 20,
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#4FC3F7',
  },
  manualAddButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4FC3F7',
    borderRadius: 24,
  },
  manualAddText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#4FC3F7',
    textAlign: 'center',
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detectionResult: {
    alignItems: 'center',
    marginBottom: 30,
  },
  detectionLabel: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    marginBottom: 8,
  },
  detectionName: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  detectionAmount: {
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
    color: '#4FC3F7',
    marginBottom: 4,
  },
  confidence: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#999',
  },
  manualEntry: {
    marginBottom: 30,
    width: '100%',
  },
  manualLabel: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    backgroundColor: 'white',
  },
  confirmationActions: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#4FC3F7',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
  },
}); 