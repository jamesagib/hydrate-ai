//
//  widgets.swift
//  widgets
//
//  Created by James Agib on 8/10/25.
//

import WidgetKit
import SwiftUI

// MARK: - Entry
struct HydrationEntry: TimelineEntry {
    let date: Date
    let consumedOz: Int
    let goalOz: Int
    let nextDrinkMinutes: Int?

    var percent: Int {
        guard goalOz > 0 else { return 0 }
        return min(100, Int((Double(consumedOz) / Double(goalOz)) * 100.0))
    }
}

private func readShared() -> (consumed: Int, goal: Int, next: Int?)? {
    let defaults = UserDefaults(suiteName: "group.com.hydrate.ai")
    if let dict = defaults?.dictionary(forKey: "hydration_today") {
        let consumed = dict["consumedOz"] as? Int ?? 0
        let goal = dict["goalOz"] as? Int ?? 0
        let next = dict["nextDrinkMinutes"] as? Int
        return (consumed, goal, next)
    }
    return nil
}

// MARK: - Provider
struct HydrationProvider: TimelineProvider {
    func placeholder(in context: Context) -> HydrationEntry {
        HydrationEntry(date: Date(), consumedOz: 32, goalOz: 64, nextDrinkMinutes: 15)
    }

    func getSnapshot(in context: Context, completion: @escaping (HydrationEntry) -> Void) {
        if let data = readShared() {
            completion(HydrationEntry(date: Date(), consumedOz: data.consumed, goalOz: data.goal, nextDrinkMinutes: data.next))
        } else {
            completion(HydrationEntry(date: Date(), consumedOz: 40, goalOz: 64, nextDrinkMinutes: 12))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HydrationEntry>) -> Void) {
        let entryData = readShared()
        let entry = HydrationEntry(date: Date(), consumedOz: entryData?.consumed ?? 40, goalOz: entryData?.goal ?? 64, nextDrinkMinutes: entryData?.next ?? 12)
        // Refresh in 30 minutes as a fallback
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Views
struct HydrationWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: HydrationEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            if #available(iOS 16.0, *) {
                Gauge(value: Double(entry.consumedOz), in: 0...Double(entry.goalOz)) {
                    Image(systemName: "drop.fill")
                } currentValueLabel: {
                    Text("\(entry.percent)%")
                }
                .gaugeStyle(.accessoryCircularCapacity)
            }
        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "drop.fill")
                VStack(alignment: .leading, spacing: 2) {
                    if let mins = entry.nextDrinkMinutes {
                        Text("Next in \(mins)m").font(.system(size: 13, weight: .semibold))
                    } else {
                        Text("On track").font(.system(size: 13, weight: .semibold))
                    }
                    Text("Quick Log").font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }
        case .systemSmall:
            VStack(spacing: 8) {
                ZStack {
                    Circle().stroke(Color(.systemTeal).opacity(0.2), lineWidth: 8)
                    Circle()
                        .trim(from: 0, to: CGFloat(entry.percent) / 100)
                        .stroke(LinearGradient(colors: [Color(#colorLiteral(red: 0.168, green: 0.753, blue: 0.894, alpha: 1)), Color(#colorLiteral(red: 0.11, green: 0.82, blue: 0.63, alpha: 1))], startPoint: .topLeading, endPoint: .bottomTrailing), style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    VStack(spacing: 2) {
                        Text("\(entry.percent)%").font(.system(size: 20, weight: .bold))
                        Text("\(entry.consumedOz)/\(entry.goalOz) oz").font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 8)
            }
            .widgetURL(URL(string: "water-ai://tabs/home?scan=1"))
        case .systemMedium:
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    ProgressView(value: Double(entry.percent) / 100.0) {
                        Text("Hydration").font(.system(size: 13, weight: .semibold))
                    } currentValueLabel: {
                        Text("\(entry.percent)%")
                    }
                    Text("Goal: \(entry.goalOz) oz").font(.system(size: 11)).foregroundStyle(.secondary)
                    if let mins = entry.nextDrinkMinutes {
                        Text("Next suggested: in \(mins)m").font(.system(size: 12))
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    Label("+8 oz", systemImage: "plus.circle.fill").font(.system(size: 13, weight: .semibold))
                    Label("+16 oz", systemImage: "plus.circle.fill").font(.system(size: 13, weight: .semibold))
                }
            }
            .widgetURL(URL(string: "water-ai://tabs/home?scan=1"))
            .padding(.horizontal, 8)
        case .systemLarge:
            VStack(alignment: .leading, spacing: 12) {
                Text("Today").font(.system(size: 14, weight: .semibold))
                ProgressView(value: Double(entry.percent) / 100.0) {
                    Text("Hydration").font(.system(size: 13, weight: .semibold))
                } currentValueLabel: {
                    Text("\(entry.percent)%")
                }
                HStack {
                    Label("Water", systemImage: "drop.fill")
                    Spacer()
                    Text("\(entry.consumedOz) oz")
                }.font(.system(size: 12))
                Spacer(minLength: 0)
                HStack {
                    Image(systemName: "flame.fill")
                    Text("Streak: 5 days")
                }.font(.system(size: 13, weight: .semibold))
            }
            .padding(.horizontal, 10)
            .widgetURL(URL(string: "hydrate-ai://tabs/stats"))
        default:
            Text("Hydrate AI")
        }
    }
}

// MARK: - Widget
struct HydrationWidget: Widget {
    let kind: String = "com.hydrate.ai.widget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HydrationProvider()) { entry in
            HydrationWidgetView(entry: entry)
        }
        .configurationDisplayName("Hydration Progress")
        .description("See progress and your next reminder.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular])
    }
}


