import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DrinkConfirmationModal({ 
  visible, 
  detectedDrink, 
  onConfirm, 
  onClose,
  onManualEntry 
}) {
  const [customAmount, setCustomAmount] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);

  const handleConfirm = () => {
    if (isManualMode && (!customAmount || parseInt(customAmount) <= 0)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const amount = isManualMode ? parseInt(customAmount) : detectedDrink.estimatedOz;
    const drinkName = isManualMode ? 'Custom Drink' : detectedDrink.name;
    
    onConfirm({
      name: drinkName,
      water_oz: amount,
      checkinType: 'camera'
    });
    
    // Reset state
    setCustomAmount('');
    setIsManualMode(false);
  };

  const handleManualEntry = () => {
    setIsManualMode(true);
    setCustomAmount(detectedDrink?.estimatedOz?.toString() || '');
  };

  const handleClose = () => {
    setCustomAmount('');
    setIsManualMode(false);
    onClose();
  };

  if (!detectedDrink && !isManualMode) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.container}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>Confirm Drink</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {!isManualMode ? (
              <>
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

                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.secondaryButton} 
                    onPress={handleManualEntry}
                  >
                    <Text style={styles.secondaryButtonText}>Edit Amount</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={handleConfirm}
                  >
                    <Text style={styles.primaryButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
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

                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.secondaryButton} 
                    onPress={() => setIsManualMode(false)}
                  >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={handleConfirm}
                  >
                    <Text style={styles.primaryButtonText}>Add Drink</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
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
  },
  manualLabel: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#000',
    marginBottom: 12,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'column',
    gap: 12,
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
    color: '#000',
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
  },
}); 