import Expo
import React
import ReactAppDependencyProvider
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
  }
}

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    // Handle widget sync deep link: water-ai://sync?consumed=..&goal=..&next=..
    if url.scheme == "water-ai" {
      let comps = URLComponents(url: url, resolvingAgainstBaseURL: false)
      if comps?.host == "sync" {
        var consumed: Int = 0
        var goal: Int = 0
        var next: Int? = nil
        comps?.queryItems?.forEach { item in
          if item.name == "consumed", let v = item.value, let n = Int(v) { consumed = n }
          if item.name == "goal", let v = item.value, let n = Int(v) { goal = n }
          if item.name == "next", let v = item.value, let n = Int(v) { next = n }
        }
        SharedHydrationStore.write(consumedOz: NSNumber(value: consumed), goalOz: NSNumber(value: goal), nextDrinkMinutes: next != nil ? NSNumber(value: next!) : nil)
        return true
      }
    }
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
