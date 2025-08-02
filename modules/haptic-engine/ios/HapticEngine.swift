import Foundation
import UIKit
import CoreHaptics
import React

@objc(HapticEngine)
class HapticEngine: RCTEventEmitter {
  
  private var engine: CHHapticEngine?
  private var continuousPlayer: CHHapticAdvancedPatternPlayer?
  private var isEngineRunning = false
  
  override init() {
    super.init()
    setupHapticEngine()
  }
  
  private func setupHapticEngine() {
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else {
      print("Haptics not supported on this device")
      return
    }
    
    do {
      engine = try CHHapticEngine()
      try engine?.start()
      isEngineRunning = true
      
      // Restore engine when app becomes active
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(restoreEngine),
        name: UIApplication.didBecomeActiveNotification,
        object: nil
      )
      
      engine?.resetHandler = { [weak self] in
        print("Haptic engine reset")
        self?.isEngineRunning = false
      }
      
      engine?.stoppedHandler = { reason in
        print("Haptic engine stopped: \(reason)")
      }
      
    } catch {
      print("Failed to start haptic engine: \(error)")
    }
  }
  
  @objc private func restoreEngine() {
    guard !isEngineRunning else { return }
    
    do {
      try engine?.start()
      isEngineRunning = true
    } catch {
      print("Failed to restore haptic engine: \(error)")
    }
  }
  
  @objc func playProgressiveHaptic(intensity: Float, sharpness: Float) {
    guard isEngineRunning, let engine = engine else { return }
    
    do {
      let intensityParameter = CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity)
      let sharpnessParameter = CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness)
      
      let event = CHHapticEvent(
        eventType: .hapticContinuous,
        parameters: [intensityParameter, sharpnessParameter],
        relativeTime: 0,
        duration: 0.1
      )
      
      let pattern = try CHHapticPattern(events: [event], parameters: [])
      let player = try engine.makeAdvancedPlayer(with: pattern)
      
      try player.start(atTime: 0)
      
    } catch {
      print("Failed to play haptic: \(error)")
    }
  }
  
  @objc func playImpactHaptic(style: String) {
    let impactStyle: UIImpactFeedbackGenerator.FeedbackStyle
    
    switch style {
    case "light":
      impactStyle = .light
    case "medium":
      impactStyle = .medium
    case "heavy":
      impactStyle = .heavy
    case "rigid":
      impactStyle = .rigid
    case "soft":
      impactStyle = .soft
    default:
      impactStyle = .medium
    }
    
    let impactFeedback = UIImpactFeedbackGenerator(style: impactStyle)
    impactFeedback.impactOccurred()
  }
  
  @objc func playNotificationHaptic(type: String) {
    let notificationType: UINotificationFeedbackGenerator.FeedbackType
    
    switch type {
    case "success":
      notificationType = .success
    case "warning":
      notificationType = .warning
    case "error":
      notificationType = .error
    default:
      notificationType = .success
    }
    
    let notificationFeedback = UINotificationFeedbackGenerator()
    notificationFeedback.notificationOccurred(notificationType)
  }
  
  deinit {
    NotificationCenter.default.removeObserver(self)
  }
  
  // MARK: - RCTEventEmitter
  override func supportedEvents() -> [String]! {
    return []
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
} 