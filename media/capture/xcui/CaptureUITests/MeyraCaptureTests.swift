import XCTest

/// Drives the installed Meyra debug build (com.omerozkan.mira.ios) and prints timestamped markers that the host
/// script (media/capture/run_capture.py) uses to cut clips/stills out of one continuous simulator recording.
/// Marker format:  CAPTURE_MARK|<epoch seconds>|<screen>|<phase>   (phase: start | still | use | end | missing:<why>)
final class MeyraCaptureTests: XCTestCase {
    let meyra = XCUIApplication(bundleIdentifier: "com.omerozkan.mira.ios")
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    override func setUp() { continueAfterFailure = true }

    func mark(_ screen: String, _ phase: String) {
        print(String(format: "CAPTURE_MARK|%.3f|%@|%@", Date().timeIntervalSince1970, screen, phase))
    }
    func wait(_ s: Double) { Thread.sleep(forTimeInterval: s) }
    func tapNorm(_ x: Double, _ y: Double) { meyra.coordinate(withNormalizedOffset: CGVector(dx: x, dy: y)).tap() }
    func swipeUpSlow(from y0: Double = 0.75, to y1: Double = 0.35) {
        let a = meyra.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: y0))
        let b = meyra.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: y1))
        a.press(forDuration: 0.05, thenDragTo: b, withVelocity: .slow, thenHoldForDuration: 0.2)
    }
    /// Taps a native (SpringBoard) permission button if it is on screen; returns true when tapped.
    @discardableResult
    func allowSystemAlert(_ labels: [String], timeout: Double = 6) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            for app in [springboard, meyra] {
                for label in labels {
                    let b = app.alerts.buttons[label].exists ? app.alerts.buttons[label] : app.buttons[label]
                    if b.exists && b.isHittable && (app == springboard || app.alerts.count > 0) { b.tap(); return true }
                }
            }
            Thread.sleep(forTimeInterval: 0.3)
        } while Date() < deadline
        return false
    }
    func adVisible() -> Bool {
        meyra.staticTexts.matching(NSPredicate(format: "label ==[c] %@", "Test mode")).firstMatch.exists ||
        meyra.buttons.matching(NSPredicate(format: "label ==[c] %@", "Close Advertisement")).firstMatch.exists
    }

    func testAdClose() {
        meyra.activate(); wait(1.0)
        print("ADCLOSE before=\(adVisible())")
        let acts = handleInterruptions(for: 20)
        print("ADCLOSE actions=\(acts) after=\(adVisible())")
    }

    func exactButton(_ app: XCUIApplication, _ label: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label ==[c] %@", label)).firstMatch
    }

    /// Handles everything that can cover the app: iOS permission alerts (answered by reading the alert title) and
    /// ads (closed via their own "Uygulamaya dön"/close button). Returns the list of actions taken.
    @discardableResult
    func handleInterruptions(for seconds: Double = 4, confirmLocationSheet: Bool = false, humanDelay: Double = 0) -> [String] {
        var actions: [String] = []
        let deadline = Date().addingTimeInterval(seconds)
        var quietSince = Date()
        while Date() < deadline {
            var acted = false
            let alert = springboard.alerts.firstMatch
            if alert.exists {
                let title = alert.label.lowercased()
                let choice: [String]
                if title.contains("konum") || title.contains("location") { choice = ["Uygulamayı Kullanırken İzin Ver", "Allow While Using App"] }
                else if title.contains("bildirim") || title.contains("notification") { choice = ["İzin Ver", "Allow"] }
                else if title.contains("takip") || title.contains("track") { choice = ["Uygulamadan Takip Etmemesini İste", "Ask App Not to Track"] }
                else { choice = [] }
                for c in choice {
                    let b = alert.buttons.matching(NSPredicate(format: "label ==[c] %@", c)).firstMatch
                    if b.exists {
                        if humanDelay > 0 { mark("first_run", "dialog_shown"); wait(humanDelay) }  // let viewers read the real dialog
                        if b.exists && b.isHittable { b.tap(); actions.append("alert:\(c)"); acted = true }
                        break
                    }
                }
            }
            if !acted && adVisible() {
                // AdMob full-screen ad: the visible exit "Uygulamaya dön ›" (top right) is not exposed to accessibility,
                // so tap its on-screen position; it appears after a short countdown, so retry until the ad is gone.
                // Interstitial ads expose a real "Close Advertisement" X (top right); app-open ads hide their exit text.
                let x = meyra.buttons.matching(NSPredicate(format: "label ==[c] %@", "Close Advertisement")).firstMatch
                if x.exists && x.isHittable && x.frame.minX > 200 { x.tap(); wait(1.2) }
                if adVisible() { tapNorm(0.87, 0.095); wait(1.2) }   // app-open ad: "Uygulamaya dön ›"
                if adVisible() { tapNorm(0.935, 0.098); wait(1.2) }  // interstitial X position
                if adVisible(), x.exists, x.isHittable { x.tap(); wait(1.0) }
                if !adVisible() { actions.append("ad:closed") }
                acted = true
            }
            if !acted && confirmLocationSheet {
                let yes = meyra.buttons.matching(NSPredicate(format: "label ==[c] %@", "Evet, doğru")).firstMatch
                if yes.exists && yes.isHittable {
                    if humanDelay > 0 { mark("first_run", "sheet_shown"); wait(humanDelay) }
                    if yes.exists && yes.isHittable && !adVisible() { yes.tap(); actions.append("sheet:Evet, doğru"); acted = true }
                }
            }
            if acted { quietSince = Date(); wait(0.8) } else {
                if Date().timeIntervalSince(quietSince) > 2.0 && Date().addingTimeInterval(0.5) > deadline { break }
                wait(0.3)
            }
        }
        return actions
    }

    /// Finds any element whose label contains `text` (Flutter semantics are exposed to XCUITest).
    func element(containing text: String) -> XCUIElement {
        meyra.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] %@", text)).firstMatch
    }
    @discardableResult
    func tapLabel(_ text: String, timeout: Double = 8) -> Bool {
        let e = element(containing: text)
        guard e.waitForExistence(timeout: timeout) else { return false }
        e.tap(); return true
    }
    func dumpTree(_ name: String) {
        print("TREE_BEGIN|\(name)")
        print(meyra.debugDescription)
        print("TREE_END|\(name)")
    }

    /// Atomic accessibility snapshot (safe even if the UI changes while we read it).
    func labels() -> [String] {
        guard let root = try? meyra.snapshot() else { return [] }
        var out: [String] = []
        func walk(_ s: XCUIElementSnapshot) {
            let l = s.label.trimmingCharacters(in: .whitespacesAndNewlines)
            if !l.isEmpty {
                out.append("\(s.elementType.rawValue)|\(Int(s.frame.minX)),\(Int(s.frame.minY)),\(Int(s.frame.width))x\(Int(s.frame.height))|\(l.replacingOccurrences(of: "\n", with: " / "))")
            }
            s.children.forEach(walk)
        }
        walk(root)
        return out
    }
    func dumpLabels(_ name: String) {
        print("LABELS_BEGIN|\(name)"); labels().forEach { print("L|\($0)") }; print("LABELS_END|\(name)")
    }

    /// Go back from a pushed screen: labelled back button first, then the iOS edge-swipe gesture.
    func goBack() {
        for l in ["Geri", "Back", "Kapat"] {
            let b = meyra.buttons.matching(NSPredicate(format: "label ==[c] %@", l)).firstMatch
            if b.exists && b.isHittable { b.tap(); return }
        }
        let a = meyra.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.5))
        a.press(forDuration: 0.05, thenDragTo: meyra.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5)))
    }

    // MARK: - Capture scenarios (host records the simulator screen; markers define clips)

    /// Opens a feature from the "Daha Fazla" grid, records open → still → use → end, then returns.
    /// Pops pushed screens until the tab bar is usable again.
    func ensureTabBar() {
        for _ in 0..<5 {
            let tab = meyra.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] %@", "Daha Fazla")).firstMatch
            if tab.exists && tab.isHittable { return }
            handleInterruptions(for: 1)
            goBack(); wait(1.0)
        }
    }

    func capture(_ screen: String, item: String, settle: Double = 3.0, use: () -> Void) {
        handleInterruptions(for: 2)
        ensureTabBar()
        tapLabel("Daha Fazla", timeout: 4); wait(1.2)
        mark(screen, "start")
        guard tapLabel(item, timeout: 5) else { mark(screen, "missing:not_found_\(item)"); return }
        wait(settle)
        let ads = handleInterruptions(for: 1.5)
        if !ads.isEmpty { print("INTERRUPTIONS|\(screen)|\(ads)"); mark(screen, "start"); wait(1.5) }  // restart clip after an ad
        mark(screen, "still"); wait(1.5)
        dumpLabels("cap:\(screen)")
        mark(screen, "use")
        use()
        mark(screen, "end")
        goBack(); wait(1.5)
    }

    func testCaptureFeatures() {
        meyra.activate(); wait(2)
        print("INTERRUPTIONS|\(handleInterruptions(for: 8, confirmLocationSheet: true))")
        ensureTabBar()
        tapLabel("Anasayfa", timeout: 3); wait(2)
        handleInterruptions(for: 3)
        // Home + prayer times (the table lives on the home screen)
        mark("home", "start"); wait(1.0); mark("home", "still"); wait(2.0); dumpLabels("cap:home")
        mark("home", "use"); swipeUpSlow(from: 0.70, to: 0.45); wait(2.5)
        mark("prayer_times", "start"); wait(0.3); mark("prayer_times", "still"); wait(3.0); mark("prayer_times", "use"); wait(1.0); mark("prayer_times", "end")
        swipeUpSlow(from: 0.75, to: 0.30); wait(2.5); mark("home", "end")
        swipeDownToTop()

        capture("qibla", item: "Kıble", settle: 4.0) { wait(6) }
        capture("quran", item: "Kur'an-ı Kerim") {
            swipeUpSlow(); wait(1.5)
            let a = meyra.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.35)); a.press(forDuration: 0.05, thenDragTo: meyra.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.8)), withVelocity: .slow, thenHoldForDuration: 0.2)
            wait(1.5)
            if tapLabel("Fatiha", timeout: 4) { wait(3.5); mark("quran_surah", "still"); wait(1.0); dumpLabels("cap:quran_surah"); swipeUpSlow(); wait(2.5); goBack(); wait(1.5) }
        }
        capture("zikirmatik", item: "Zikirmatik") {
            for _ in 0..<12 { tapNorm(0.5, 0.54); wait(0.75) }
            wait(1.5)
        }
        capture("dua", item: "Dualar") {
            if tapLabel("Günlük Dualar", timeout: 4) {
                wait(2.5); mark("dua_list", "still"); dumpLabels("cap:dua_list"); wait(1.0)
                tapNorm(0.5, 0.30); wait(3.0); mark("dua_detail", "still"); dumpLabels("cap:dua_detail"); wait(1.5); swipeUpSlow(); wait(2.0)
                goBack(); wait(1.2); goBack(); wait(1.2)
            }
        }
        capture("notifications", item: "Bildirimler") { swipeUpSlow(from: 0.7, to: 0.5); wait(2.0) }
        capture("worship_tracking", item: "İbadet Takibi") {
            for tab in ["Kaza", "Oruç", "Namaz"] { tapLabel(tab, timeout: 3); wait(2.0) }
        }
        capture("esmaul_husna", item: "Esmaül Hüsna") { swipeUpSlow(); wait(2.5) }
        capture("religious_days", item: "Dini Günler") { swipeUpSlow(); wait(2.5) }
        capture("zakat", item: "Zekat") { wait(3) }
        capture("mosques", item: "Camiler", settle: 6.0) { wait(4) }
        capture("learn_quran", item: "Kur'an Öğreniyorum") { swipeUpSlow(); wait(2.5) }
        // Hatim lives on the home screen ("Kur'an Oku / Hatim ve cüz takibi"), not in the "Daha Fazla" grid.
        handleInterruptions(for: 2)
        ensureTabBar()
        tapLabel("Anasayfa", timeout: 3); wait(1.5)
        swipeUpSlow(from: 0.75, to: 0.40); wait(1.5)
        mark("hatim", "start")
        if tapLabel("Hatim ve cüz takibi", timeout: 5) {
            wait(3.0); handleInterruptions(for: 1.5)
            mark("hatim", "still"); wait(1.5); dumpLabels("cap:hatim")
            mark("hatim", "use"); wait(3.0); mark("hatim", "end")
            goBack(); wait(1.5)
        } else { mark("hatim", "missing:not_found_home_card") }
        swipeDownToTop()
    }

    func swipeDownToTop() {
        for _ in 0..<3 {
            let a = meyra.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3))
            a.press(forDuration: 0.05, thenDragTo: meyra.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.9)))
        }
        wait(1.0)
    }

    /// Fresh install → real permission dialogs → location confirmation → prayer times → notification settings.
    /// The host reinstalls the app before this test, so this is one continuous, unedited first-run take.
    func testCaptureFirstRun() {
        mark("first_run", "start")
        meyra.launch()
        mark("first_run", "launched")
        // Answer each interruption as it appears (alert titles decide the button), recording when each happened.
        var seen = Set<String>()
        let deadline = Date().addingTimeInterval(45)
        while Date() < deadline && !seen.contains("sheet:Evet, doğru") {
            for a in handleInterruptions(for: 1.5, confirmLocationSheet: true, humanDelay: 1.6) where !seen.contains(a) {
                seen.insert(a)
                let phase: String
                switch true {
                case a.contains("Kullanırken"), a.contains("While Using"): phase = "location_allowed"
                case a == "alert:İzin Ver", a == "alert:Allow": phase = "notifications_allowed"
                case a.contains("Takip"), a.contains("Track"): phase = "tracking_answered"
                case a.hasPrefix("ad:"): phase = "ad_closed"
                default: phase = "location_confirmed"
                }
                mark("first_run", phase)
            }
        }
        if !seen.contains("sheet:Evet, doğru") { mark("first_run", "missing:no_location_sheet") }
        // Wait until the prayer-time table has really loaded, closing any ad that appears meanwhile.
        let tableDeadline = Date().addingTimeInterval(40)
        var timesVisible = false
        while Date() < tableDeadline {
            if adVisible() {
                mark("first_run", "ad_shown")
                handleInterruptions(for: 12)
                mark("first_run", "ad_closed")
            }
            if element(containing: "Sabah vaktinin başlangıcı").exists && !adVisible() { timesVisible = true; break }
            wait(0.4)
        }
        mark("first_run", timesVisible ? "times_visible" : "missing:times_not_loaded")
        wait(3.0)
        handleInterruptions(for: 1)
        if tapLabel("Daha Fazla", timeout: 4) { wait(1.0) }
        handleInterruptions(for: 1)
        if tapLabel("Bildirimler", timeout: 5) {
            wait(1.5); handleInterruptions(for: 1)
            mark("first_run", "notification_settings"); wait(2.0)
            if tapLabel("Vakit Öncesi Hatırlatıcı", timeout: 3) { mark("first_run", "reminder_toggled") }
            wait(2.5)
        } else { mark("first_run", "missing:notification_settings") }
        mark("first_run", "end")
    }

    func testAdProbe() {
        meyra.activate(); wait(1.5)
        print("ADPROBE_BEGIN")
        for e in meyra.descendants(matching: .any).allElementsBoundByIndex where !e.label.isEmpty || e.elementType == .button {
            print("AD|\(e.elementType.rawValue)|\(Int(e.frame.minX)),\(Int(e.frame.minY)),\(Int(e.frame.width))x\(Int(e.frame.height))|hit=\(e.isHittable)|\(e.label)|id=\(e.identifier)")
        }
        print("ADPROBE_END")
    }

    /// Exploration 3: open each feature from the "Daha Fazla" grid and dump its labels.
    func testExplore3() {
        meyra.activate(); wait(2)
        for item in ["Kıble", "Kur'an-ı Kerim", "Zikirmatik", "Dualar", "Bildirimler", "İbadet Takibi", "Esmaül Hüsna", "Dini Günler", "Camiler", "Zekat"] {
            tapLabel("Daha Fazla"); wait(1.5)
            if !tapLabel(item, timeout: 4) { print("MISSING|\(item)"); continue }
            wait(3.5); dumpLabels("screen:\(item)")
            goBack(); wait(1.5)
        }
        tapLabel("Anasayfa"); wait(1)
    }

    /// Exploration 2 (keeps app state): confirm location, map home (scrolled) and the "Daha Fazla" tab.
    func testExplore2() {
        meyra.activate()
        wait(2)
        tapLabel("Evet, doğru", timeout: 4)
        wait(3)
        allowSystemAlert(["Uygulamadan Takip Etmemesini İste", "Ask App Not to Track", "İzin Ver", "Allow"], timeout: 3)
        dumpLabels("home_top")
        swipeUpSlow(); wait(1.5); dumpLabels("home_mid")
        swipeUpSlow(); wait(1.5); dumpLabels("home_low")
        swipeUpSlow(); wait(1.5); dumpLabels("home_bottom")
        tapLabel("Daha Fazla"); wait(2.5); dumpLabels("more_top")
        swipeUpSlow(); wait(1.5); dumpLabels("more_low")
        tapLabel("Kitaplar"); wait(2.5); dumpLabels("learn")
        tapLabel("Anasayfa"); wait(2)
    }

    /// Exploration: launch and dump the accessibility tree of the main tabs (used to map real navigation).
    func testExplore() {
        meyra.launch()
        wait(10)
        allowSystemAlert(["İzin Ver", "Allow"], timeout: 4)
        wait(2)
        allowSystemAlert(["İzin Ver", "Allow", "Uygulamadan Takip Etmemesini İste", "Ask App Not to Track"], timeout: 4)
        wait(3)
        dumpTree("home")
    }
}
