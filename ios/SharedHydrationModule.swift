import Foundation
import WidgetKit

@objc(SharedHydrationModule)
class SharedHydrationModule: NSObject {
  static func moduleName() -> String! { "SharedHydrationModule" }
  static func requiresMainQueueSetup() -> Bool { true }

  @objc
  func write(_ consumedOz: NSNumber, goalOz: NSNumber, nextDrinkMinutes: NSNumber?) {
    SharedHydrationStore.write(consumedOz: consumedOz, goalOz: goalOz, nextDrinkMinutes: nextDrinkMinutes)
  }

  @objc
  func forceReload() {
    DispatchQueue.main.async {
      WidgetCenter.shared.reloadTimelines(ofKind: "com.hydrate.ai.widget")
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
} 