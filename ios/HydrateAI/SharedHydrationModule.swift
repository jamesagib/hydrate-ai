import Foundation
import React

@objc(SharedHydrationModule)
class SharedHydrationModule: NSObject, RCTBridgeModule {
  static func moduleName() -> String! { "SharedHydrationModule" }
  static func requiresMainQueueSetup() -> Bool { true }

  @objc
  func write(_ consumedOz: NSNumber, goalOz: NSNumber, nextDrinkMinutes: NSNumber?) {
    SharedHydrationStore.write(consumedOz: consumedOz, goalOz: goalOz, nextDrinkMinutes: nextDrinkMinutes)
  }
} 