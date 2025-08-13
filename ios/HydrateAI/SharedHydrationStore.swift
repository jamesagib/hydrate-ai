import Foundation
import WidgetKit

@objc class SharedHydrationStore: NSObject {
    static let appGroup = "group.com.hydrate.ai"
    static let key = "hydration_today"

    @objc static func write(consumedOz: NSNumber, goalOz: NSNumber, nextDrinkMinutes: NSNumber?) {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }
        var payload: [String: Any] = [
            "consumedOz": consumedOz.intValue,
            "goalOz": goalOz.intValue,
            "lastUpdated": Date().timeIntervalSince1970
        ]
        if let mins = nextDrinkMinutes?.intValue { payload["nextDrinkMinutes"] = mins }
        defaults.set(payload, forKey: key)
        defaults.synchronize()
        WidgetCenter.shared.reloadTimelines(ofKind: "com.hydrate.ai.widget")
        WidgetCenter.shared.reloadAllTimelines()
    }

    static func read() -> (consumed: Int, goal: Int, next: Int?)? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let dict = defaults.dictionary(forKey: key) else { return nil }
        let consumed = dict["consumedOz"] as? Int ?? 0
        let goal = dict["goalOz"] as? Int ?? 0
        let next = dict["nextDrinkMinutes"] as? Int
        return (consumed, goal, next)
    }
} 