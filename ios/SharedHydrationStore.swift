import Foundation
import WidgetKit

@objc class SharedHydrationStore: NSObject {
    static let appGroup = "group.com.hydrateai.shared"
    static let key = "hydration_today"
    static let fileName = "hydration_today.json"

    private static func fileURL() -> URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)?.appendingPathComponent(fileName)
    }

    @objc static func write(consumedOz: NSNumber, goalOz: NSNumber, nextDrinkMinutes: NSNumber?) {
        let consumed = consumedOz.intValue
        let goal = goalOz.intValue
        let next = nextDrinkMinutes?.intValue

        // Debug: trace write
        #if DEBUG
        print("[SharedHydrationStore] write consumed=\(consumed) goal=\(goal) next=\(String(describing: next))")
        #endif

        // 1) UserDefaults (legacy compatibility)
        if let defaults = UserDefaults(suiteName: appGroup) {
            var payload: [String: Any] = [
                "consumedOz": consumed,
                "goalOz": goal,
                "lastUpdated": Date().timeIntervalSince1970
            ]
            if let n = next { payload["nextDrinkMinutes"] = n }
            defaults.set(payload, forKey: key)
            defaults.synchronize()
        }

        // 2) File in App Group container (more reliable for WidgetKit)
        if let url = fileURL() {
            let dict: [String: Any] = [
                "consumedOz": consumed,
                "goalOz": goal,
                "nextDrinkMinutes": next as Any,
                "lastUpdated": Date().timeIntervalSince1970
            ]
            if let data = try? JSONSerialization.data(withJSONObject: dict, options: []) {
                do {
                    try data.write(to: url, options: .atomic)
                    #if DEBUG
                    print("[SharedHydrationStore] wrote file at \(url.path)")
                    #endif
                } catch {
                    // Swallow write errors to avoid crashing
                    #if DEBUG
                    print("[SharedHydrationStore] file write error: \(error)")
                    #endif
                }
            }
        }

        DispatchQueue.main.async {
            WidgetCenter.shared.reloadTimelines(ofKind: "com.hydrate.ai.widget")
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    static func read() -> (consumed: Int, goal: Int, next: Int?)? {
        // Prefer file
        if let url = fileURL(), let data = try? Data(contentsOf: url) {
            if let dict = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
                let consumed = dict["consumedOz"] as? Int ?? 0
                let goal = dict["goalOz"] as? Int ?? 0
                let next = dict["nextDrinkMinutes"] as? Int
                return (consumed, goal, next)
            }
        }
        // Fallback to defaults
        if let defaults = UserDefaults(suiteName: appGroup), let dict = defaults.dictionary(forKey: key) {
            let consumed = dict["consumedOz"] as? Int ?? 0
            let goal = dict["goalOz"] as? Int ?? 0
            let next = dict["nextDrinkMinutes"] as? Int
            return (consumed, goal, next)
        }
        return nil
    }
} 