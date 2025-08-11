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
        HydrationWidget()
        if #available(iOSApplicationExtension 18.0, *) {
            widgetsControl()
        }
        if #available(iOSApplicationExtension 16.1, *) {
            widgetsLiveActivity()
        }
    }
}
