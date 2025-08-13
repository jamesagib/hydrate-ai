//
//  widgetsBundle.swift
//  widgets
//
//  Created by James Agib on 8/10/25.
//

import WidgetKit
import SwiftUI

@main
struct widgetsBundle: WidgetBundle {
    var body: some Widget {
        LogDrinkWidget()
        HydrationWidget()
        if #available(iOSApplicationExtension 18.0, *) {
            LogDrinkControl()
        }
        if #available(iOSApplicationExtension 16.1, *) {
            widgetsLiveActivity()
        }
    }
}
