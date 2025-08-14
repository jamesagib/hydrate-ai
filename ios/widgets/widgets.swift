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
    // Prefer UserDefaults (updated every write) then file
    let defaults = UserDefaults(suiteName: "group.com.hydrateai.shared")
    if let dict = defaults?.dictionary(forKey: "hydration_today") {
        let consumed = (dict["consumedOz"] as? NSNumber)?.intValue ?? (dict["consumedOz"] as? Int ?? 0)
        let goal = (dict["goalOz"] as? NSNumber)?.intValue ?? (dict["goalOz"] as? Int ?? 0)
        let next = (dict["nextDrinkMinutes"] as? NSNumber)?.intValue ?? (dict["nextDrinkMinutes"] as? Int)
        return (consumed, goal, next)
    }
    if let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.hydrateai.shared")?.appendingPathComponent("hydration_today.json"),
       let data = try? Data(contentsOf: url),
       let dict = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
        let consumed = (dict["consumedOz"] as? NSNumber)?.intValue ?? (dict["consumedOz"] as? Int ?? 0)
        let goal = (dict["goalOz"] as? NSNumber)?.intValue ?? (dict["goalOz"] as? Int ?? 0)
        let next = (dict["nextDrinkMinutes"] as? NSNumber)?.intValue ?? (dict["nextDrinkMinutes"] as? Int)
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
    @Environment(\.colorScheme) var colorScheme
    let entry: HydrationEntry

    private var trackOpacity: Double { colorScheme == .dark ? 0.28 : 0.18 }
    private var chipOpacity: Double { colorScheme == .dark ? 0.28 : 0.18 }

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
                    Circle().stroke(Color.teal.opacity(trackOpacity), lineWidth: 8)
                    Circle()
                        .trim(from: 0, to: CGFloat(entry.percent) / 100)
                        .stroke(LinearGradient(colors: [Color.teal, Color.green], startPoint: .topLeading, endPoint: .bottomTrailing), style: StrokeStyle(lineWidth: 8, lineCap: .round))
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
                VStack(alignment: .trailing, spacing: 8) {
                    Link(destination: URL(string: "water-ai://tabs/home?oz=8")!) {
                        HStack(spacing: 6) {
                            Image(systemName: "plus.circle.fill").font(.system(size: 14, weight: .semibold))
                            Text("Add 8oz").font(.system(size: 13, weight: .semibold))
                        }
                        .padding(.vertical, 6)
                        .padding(.horizontal, 10)
                        .background(Color.teal.opacity(chipOpacity))
                        .clipShape(Capsule())
                    }
                    Link(destination: URL(string: "water-ai://tabs/home?oz=16")!) {
                        HStack(spacing: 6) {
                            Image(systemName: "plus.circle.fill").font(.system(size: 14, weight: .semibold))
                            Text("Add 16oz").font(.system(size: 13, weight: .semibold))
                        }
                        .padding(.vertical, 6)
                        .padding(.horizontal, 10)
                        .background(Color.teal.opacity(chipOpacity))
                        .clipShape(Capsule())
                    }
                    Link(destination: URL(string: "water-ai://tabs/home?scan=1")!) {
                        HStack(spacing: 6) {
                            Image(systemName: "magnifyingglass").font(.system(size: 14, weight: .semibold))
                            Text("Log Drink").font(.system(size: 13, weight: .semibold))
                        }
                        .padding(.vertical, 6)
                        .padding(.horizontal, 10)
                        .background(Color.teal.opacity(chipOpacity))
                        .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 8)
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
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}

// MARK: - Quick Log Widget
struct LogEntry: TimelineEntry { let date: Date }

struct QuickLogProvider: TimelineProvider {
    func placeholder(in context: Context) -> LogEntry { LogEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (LogEntry) -> Void) { completion(LogEntry(date: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LogEntry>) -> Void) {
        completion(Timeline(entries: [LogEntry(date: Date())], policy: .after(Date().addingTimeInterval(3600))))
    }
}

struct QuickLogView: View {
    @Environment(\.widgetFamily) var family
    var body: some View {
        switch family {
        case .accessoryRectangular:
            HStack(spacing: 8) {
                Image(systemName: "camera.viewfinder")
                Text("Log Drink").font(.system(size: 13, weight: .semibold))
                Spacer(minLength: 0)
            }
        case .accessoryCircular:
            ZStack {
                Image(systemName: "camera.viewfinder")
                    .font(.system(size: 14, weight: .semibold))
            }
        case .accessoryInline:
            Text("Log Drink")
        default:
            VStack(spacing: 6) {
                Image(systemName: "camera.viewfinder").font(.system(size: 28, weight: .bold))
                Text("Log Drink").font(.system(size: 13, weight: .semibold))
            }
        }
    }
}

struct LogDrinkWidget: Widget {
    let kind: String = "com.hydrate.ai.widget.quicklog"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickLogProvider()) { _ in
            QuickLogView()
                .widgetURL(URL(string: "water-ai://tabs/home?scan=1"))
        }
        .configurationDisplayName("Log Drink")
        .description("Open the camera to scan or add manually.")
        .supportedFamilies([.systemSmall, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}


