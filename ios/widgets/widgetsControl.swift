//
//  widgetsControl.swift
//  widgets
//
//  Created by James Agib on 8/10/25.
//

import AppIntents
import SwiftUI
import WidgetKit

@available(iOSApplicationExtension 18.0, *)
struct LogDrinkControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: "com.hydrate.ai.logdrink"
        ) {
            ControlWidgetButton(action: LogDrinkIntent()) {
                Label("Log Drink", systemImage: "camera.viewfinder")
            }
        }
        .displayName("Log Drink")
        .description("Open scan to log a drink.")
    }
}

@available(iOSApplicationExtension 18.0, *)
struct LogDrinkIntent: ControlConfigurationIntent {
    static let title: LocalizedStringResource = "Log Drink"
    static let description = IntentDescription(stringLiteral: "Open scan to log a drink.")
    static let openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        .result(opensIntent: OpenURLIntent(URL(string: "water-ai://tabs/home?scan=1")!))
    }
}
