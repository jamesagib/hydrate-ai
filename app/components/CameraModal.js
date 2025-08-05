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
import drinkHydrationService from '../../lib/drinkHydrationService';

export default function CameraModal({ visible, onClose, onDrinkDetected, onOpenManualLog }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [detectedDrink, setDetectedDrink] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [topDrinks, setTopDrinks] = useState([]);
  const [loadingTopDrinks, setLoadingTopDrinks] = useState(false);
  const [isTrialUser, setIsTrialUser] = useState(false);
  const [hydrationTip, setHydrationTip] = useState(null);
  const [remainingScans, setRemainingScans] = useState(null);

  // Reset function to clear all state
  const resetModalState = () => {
    setCapturedImage(null);
    setDetectedDrink(null);
    setShowConfirmation(false);
    setIsManualMode(false);
    setCustomAmount('');
    setIsCapturing(false);
    setIsProcessing(false);
    setHydrationTip(null);
    setRemainingScans(null);
  };

  // Enhanced close function that resets state
  const handleClose = () => {
    resetModalState();
    onClose();
  };

  console.log('CameraModal render - visible:', visible, 'hasPermission:', hasPermission);

  useEffect(() => {
    (async () => {
      console.log('Requesting camera permission...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Fetch top drinks and check subscription status when modal opens
  useEffect(() => {
    if (visible) {
      resetModalState(); // Reset state when modal opens
      fetchTopDrinks();
      checkSubscriptionStatus();
    }
  }, [visible]);

  // Check if user is on trial and get remaining scans
  const checkSubscriptionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('user_id', user.id)
          .single();
        
        if (!error && profile) {
          // Default to trial if no subscription status or if it's a trial status
          const isTrial = !profile.subscription_status || 
                         profile.subscription_status === 'trial' || 
                         profile.subscription_status === 'TRIAL' ||
                         profile.subscription_status === 'trialing' || 
                         profile.subscription_status === 'TRIALING';
          setIsTrialUser(isTrial);
          
          // Check today's scan count for all users
          const today = new Date().toISOString().split('T')[0];
          const { data: scanCount, error: countError } = await supabase
            .from('scan_logs')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`);
          
          if (!countError) {
            const currentScans = scanCount?.length || 0;
            
            if (isTrial) {
              // For trial users, limit is 3 scans
              const maxScans = 3;
              setRemainingScans(Math.max(0, maxScans - currentScans));
            } else {
              // For paid users, limit is 8 scans
              const maxScans = 8;
              if (currentScans >= maxScans) {
                // Store that paid user has reached limit
                setRemainingScans(0);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };



  // Helper function to get drink emoji and color
  const getDrinkInfo = (drinkName) => {
    const lowerName = drinkName.toLowerCase();
    
    // Coffee variations
    if (lowerName.includes('coffee') || lowerName.includes('latte') || lowerName.includes('cappuccino') || 
        lowerName.includes('espresso') || lowerName.includes('americano') || lowerName.includes('mocha')) {
      return { emoji: '☕', color: '#8B4513' };
    }
    
    // Tea variations
    if (lowerName.includes('tea') || lowerName.includes('chai')) {
      return { emoji: '🫖', color: '#228B22' };
    }
    
    // Soda variations
    if (lowerName.includes('soda') || lowerName.includes('pop') || lowerName.includes('cola') || 
        lowerName.includes('coke') || lowerName.includes('pepsi') || lowerName.includes('sprite') ||
        lowerName.includes('fanta') || lowerName.includes('dr pepper')) {
      return { emoji: '🥤', color: '#FF6B35' };
    }
    
    // Juice variations
    if (lowerName.includes('juice') || lowerName.includes('orange') || lowerName.includes('apple') ||
        lowerName.includes('cranberry') || lowerName.includes('grape')) {
      return { emoji: '🧃', color: '#FFA500' };
    }
    
    // Milk variations
    if (lowerName.includes('milk') || lowerName.includes('dairy')) {
      return { emoji: '🥛', color: '#FFFFFF' };
    }
    
    // Energy drinks
    if (lowerName.includes('energy') || lowerName.includes('red bull') || lowerName.includes('monster') ||
        lowerName.includes('rockstar')) {
      return { emoji: '⚡', color: '#FFD700' };
    }
    
    // Sports drinks
    if (lowerName.includes('gatorade') || lowerName.includes('powerade') || lowerName.includes('sports')) {
      return { emoji: '🏃', color: '#00CED1' };
    }
    
    // Water variations
    if (lowerName.includes('water') || lowerName.includes('bottled') || lowerName.includes('purified') ||
        lowerName.includes('mineral') || lowerName.includes('sparkling')) {
      return { emoji: '💧', color: '#87CEEB' };
    }
    
    // Beer/alcohol
    if (lowerName.includes('beer') || lowerName.includes('wine') || lowerName.includes('alcohol') ||
        lowerName.includes('cocktail') || lowerName.includes('drink')) {
      return { emoji: '🍺', color: '#FFD700' };
    }
    
    // Default
    return { emoji: '🥤', color: '#4FC3F7' };
  };

  // Calculate actual water content based on drink type
  const calculateWaterContent = (drinkName, totalVolume) => {
    const lowerName = drinkName.toLowerCase();
    
    // Water-based drinks (mostly water)
    if (lowerName.includes('water') || lowerName.includes('bottled') || lowerName.includes('purified') ||
        lowerName.includes('mineral') || lowerName.includes('sparkling')) {
      return totalVolume; // 100% water content
    }
    
    // Coffee and tea (mostly water)
    if (lowerName.includes('coffee') || lowerName.includes('latte') || lowerName.includes('cappuccino') || 
        lowerName.includes('espresso') || lowerName.includes('americano') || lowerName.includes('mocha') ||
        lowerName.includes('tea') || lowerName.includes('chai')) {
      return Math.round(totalVolume * 0.95); // 95% water content
    }
    
    // Soda and carbonated drinks (mostly water)
    if (lowerName.includes('soda') || lowerName.includes('pop') || lowerName.includes('cola') || 
        lowerName.includes('coke') || lowerName.includes('pepsi') || lowerName.includes('sprite') ||
        lowerName.includes('fanta') || lowerName.includes('dr pepper')) {
      return Math.round(totalVolume * 0.9); // 90% water content
    }
    
    // Juice (mostly water)
    if (lowerName.includes('juice') || lowerName.includes('orange') || lowerName.includes('apple') ||
        lowerName.includes('cranberry') || lowerName.includes('grape')) {
      return Math.round(totalVolume * 0.85); // 85% water content
    }
    
    // Milk (mostly water)
    if (lowerName.includes('milk') || lowerName.includes('dairy')) {
      return Math.round(totalVolume * 0.87); // 87% water content
    }
    
    // Energy drinks (mostly water)
    if (lowerName.includes('energy') || lowerName.includes('red bull') || lowerName.includes('monster') ||
        lowerName.includes('rockstar')) {
      return Math.round(totalVolume * 0.9); // 90% water content
    }
    
    // Sports drinks (mostly water)
    if (lowerName.includes('gatorade') || lowerName.includes('powerade') || lowerName.includes('sports')) {
      return Math.round(totalVolume * 0.95); // 95% water content
    }
    
    // Beer/alcohol (mostly water)
    if (lowerName.includes('beer') || lowerName.includes('wine') || lowerName.includes('alcohol') ||
        lowerName.includes('cocktail') || lowerName.includes('drink')) {
      return Math.round(totalVolume * 0.9); // 90% water content
    }
    
    // Default: assume mostly water
    return Math.round(totalVolume * 0.9); // 90% water content
  };

  const fetchTopDrinks = async () => {
    try {
      setLoadingTopDrinks(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get top 3 most frequent drinks from hydration_checkins
      const { data, error } = await supabase
        .from('hydration_checkins')
        .select('raw_input, value')
        .eq('user_id', user.id)
        .not('raw_input', 'is', null)
        .not('raw_input', 'eq', '')
        .order('created_at', { ascending: false })
        .limit(100); // Get last 100 checkins to analyze frequency

      if (error) {
        console.error('Error fetching top drinks:', error);
        return;
      }

      // Count frequency of each drink
      const drinkCounts = {};
      data.forEach(checkin => {
        const drinkName = checkin.raw_input;
        if (drinkName && drinkName !== 'Custom Drink') {
          drinkCounts[drinkName] = (drinkCounts[drinkName] || 0) + 1;
        }
      });

      // Get top 3 most frequent drinks with emoji and color
      const topDrinksList = Object.entries(drinkCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => {
          const drinkInfo = getDrinkInfo(name);
          return { 
            name, 
            count, 
            emoji: drinkInfo.emoji, 
            color: drinkInfo.color 
          };
        });

      setTopDrinks(topDrinksList);
    } catch (error) {
      console.error('Error fetching top drinks:', error);
    } finally {
      setLoadingTopDrinks(false);
    }
  };

  const takePicture = async () => {
    if (!isCapturing) {
      setIsCapturing(true);
      
      try {
        // Check scan limit from state (already checked when modal opened)
        if (isTrialUser && remainingScans <= 0) {
          Alert.alert('Daily Limit Reached', 'You\'ve reached your daily limit of 3 scans on the free trial. Due to high demand, we have to limit the trial plan.');
          setIsCapturing(false);
          return;
        }
        
        if (!isTrialUser && remainingScans <= 0) {
          Alert.alert('Connection Error', 'Connection error. Please try again later.');
          setIsCapturing(false);
          return;
        }

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
            // Get hydration tip for the detected drink
            const tip = drinkHydrationService.getHydrationTip(analysisResult.data.name);
            setHydrationTip(tip);
            setShowConfirmation(true);
          } else {
            // Handle other errors (not limit related since we checked already)
            Alert.alert('Error', analysisResult.error || 'Could not analyze the drink. Please try again.');
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('Current user:', user);
      console.log('User ID being passed:', user?.id);
      
      const { data, error } = await supabase.functions.invoke('analyze-drink-image', {
        body: { 
          image: base64Image,
          userId: user?.id || null
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        return { 
          success: false, 
          error: error.message,
          errorType: data?.errorType || 'UNKNOWN_ERROR',
          limitExceeded: data?.limitExceeded || false
        };
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
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
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
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
          </View>

          {/* Trial Notice */}
          {isTrialUser && (
            <View style={styles.trialNotice}>
              <Ionicons name="information-circle" size={16} color="#FF6B35" />
              <Text style={styles.trialNoticeText}>
                {remainingScans !== null 
                  ? `You have ${remainingScans} scan${remainingScans !== 1 ? 's' : ''} remaining today on the free trial.`
                  : 'Due to high demand, you can only scan 3 drinks on the free trial. Thank you for your understanding.'
                }
              </Text>
            </View>
          )}

          {/* Camera frame overlay */}
          <View style={styles.frameOverlay}>
            {!showConfirmation ? (
              <>
                {/* Live preview rectangle - commented out for now */}
                {/* <View style={styles.scanFrame} /> */}
                
                {!capturedImage ? (
                  <>
                    <Text style={styles.scanText}>Choose how to add your drink</Text>
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={styles.takePictureButton}
                        onPress={takePicture}
                        disabled={isCapturing}
                      >
                        <Ionicons name="camera" size={24} color="white" />
                        <Text style={styles.takePictureText}>Take Picture</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.manualAddButton}
                        onPress={() => {
                          resetModalState();
                          onClose();
                          if (onOpenManualLog) {
                            onOpenManualLog();
                          }
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={24} color="#4FC3F7" />
                        <Text style={styles.manualAddText}>Add drink manually</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Quick Add Section */}
                    {topDrinks.length > 0 && (
                      <View style={styles.quickAddSection}>
                        <Text style={styles.quickAddTitle}>Quick Add</Text>
                        <View style={styles.quickAddButtons}>
                          {topDrinks.map((drink, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.quickAddCard}
                              onPress={() => {
                                // Calculate actual water content for quick add drinks
                                const waterContent = calculateWaterContent(drink.name, 8);
                                // Get hydration tip for quick add drinks
                                const tip = drinkHydrationService.getHydrationTip(drink.name);
                                
                                // Show hydration tip as a brief alert for quick add
                                Alert.alert(
                                  '💧 Hydration Tip',
                                  tip.tip,
                                  [
                                    {
                                      text: 'Got it!',
                                      onPress: () => {
                                        onDrinkDetected({
                                          name: drink.name,
                                          water_oz: waterContent,
                                          total_oz: 8,
                                          checkinType: 'quick_add'
                                        });
                                      }
                                    }
                                  ]
                                );
                              }}
                            >
                              {/* Drink Icon */}
                              <View style={[styles.quickAddIcon, { backgroundColor: drink.color }]}>
                                <Text style={styles.quickAddIconEmoji}>{drink.emoji}</Text>
                              </View>
                              
                              {/* Content */}
                              <View style={styles.quickAddContent}>
                                <Text style={styles.quickAddDrinkName}>
                                  {drink.name} - {calculateWaterContent(drink.name, 8)} oz
                                </Text>
                                
                                <View style={styles.quickAddDetails}>
                                  <Text style={styles.quickAddCount}>
                                    {drink.count} time{drink.count !== 1 ? 's' : ''} logged
                                  </Text>
                                </View>
                              </View>
                              
                              {/* Add Icon */}
                              <View style={styles.quickAddIconContainer}>
                                <Ionicons name="add" size={24} color="#4FC3F7" />
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.imagePreviewContainer}>
                    <Image 
                      source={{ uri: capturedImage.uri }} 
                      style={[
                        styles.previewImage,
                        isProcessing && styles.previewImageProcessing
                      ]} 
                    />
                    {isProcessing && (
                      <View style={styles.processingContainer}>
                        <ActivityIndicator size="large" color="#4FC3F7" />
                        <Text style={styles.processingText}>Analyzing image...</Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.confirmationContainer}>
                <View style={styles.detectionResult}>
                  <Text style={styles.detectionLabel}>Detected:</Text>
                  <Text style={styles.detectionName}>{detectedDrink.name}</Text>
                  <Text style={styles.detectionAmount}>
                    Total: {detectedDrink.estimatedOz} oz
                  </Text>
                  <Text style={styles.waterContent}>
                    Water content: {calculateWaterContent(detectedDrink.name, detectedDrink.estimatedOz)} oz
                  </Text>
                  <Text style={styles.confidence}>
                    Confidence: {Math.round(detectedDrink.confidence * 100)}%
                  </Text>
                </View>
                
                {/* Hydration Tip */}
                {hydrationTip && (
                  <View style={[styles.hydrationTipContainer, { borderLeftColor: hydrationTip.color }]}>
                    <Text style={styles.hydrationTipTitle}>💧 Hydration Tip</Text>
                    <Text style={styles.hydrationTipText}>{hydrationTip.tip}</Text>
                  </View>
                )}
                
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

          {/* Bottom controls - only for confirmation */}
          {showConfirmation && (
            <View style={styles.bottomControls}>
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
                    const totalAmount = isManualMode ? parseInt(customAmount) : detectedDrink.estimatedOz;
                    const drinkName = isManualMode ? 'Custom Drink' : detectedDrink.name;
                    
                    // Calculate actual water content
                    const waterContent = calculateWaterContent(drinkName, totalAmount);
                    
                    onDrinkDetected({
                      name: drinkName,
                      water_oz: waterContent,
                      total_oz: totalAmount,
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
            </View>
          )}
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
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
    paddingHorizontal: 40,
  },
  takePictureButton: {
    backgroundColor: '#4FC3F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  takePictureText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
  },
  imagePreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '95%',
    backgroundColor: 'transparent',
  },
  previewImage: {
    width: '100%',
    height: '60%',
    borderRadius: 12,
    resizeMode: 'cover',
  },
  previewImageProcessing: {
    transform: [{ scale: 0.9 }],
  },
  processingContainer: {
    marginTop: 20,
    alignItems: 'center',
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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4FC3F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
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
  waterContent: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#4FC3F7',
    marginTop: 4,
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
  quickAddSection: {
    marginTop: 30,
    width: '100%',
    paddingHorizontal: 40,
  },
  quickAddTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  quickAddButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  quickAddCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickAddIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  quickAddIconEmoji: {
    fontSize: 20,
  },
  quickAddContent: {
    flex: 1,
  },
  quickAddDrinkName: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'black',
    marginBottom: 4,
  },
  quickAddDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickAddCount: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: '#666',
  },
  quickAddIconContainer: {
    marginLeft: 12,
  },
  trialNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  trialNoticeText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  hydrationTipContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  hydrationTipTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  hydrationTipText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    lineHeight: 20,
  },
}); 