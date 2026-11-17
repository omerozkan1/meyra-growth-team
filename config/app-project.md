# Meyra app source (read-only for the growth team)

| Item | Value | Verified 2026-11-14 |
|---|---|---|
| Flutter project | `/Users/omer/projects/meyra_flutter` | ✔ `pubspec.yaml` name `meyra_flutter` |
| Android applicationId | `com.omerozkan.meyra` | ✔ matches Google Play listing |
| iOS bundle id | `com.omerozkan.mira.ios` (widget: `.PrayerWidget`) | ✔ from `project.pbxproj` |
| Feature folders (`lib/features/`) | assistant, calendar, discover, dua, esmaul_husna, favorites, hadith, hatim, home, journey, learn, more, mosque, onboarding, premium, qadha, qibla, quran, settings, splash, tracking, zakat, zikirmatik | ✔ exist in code; behaviour verified only once captured |
| Backend in debug builds | **Production** Firebase (Auth anonymous sign-in, Analytics enabled, Firestore `meyradb`, App Check, Crashlytics, Remote Config), RevenueCat, AdMob | ✔ from `lib/main.dart`, `lib/core/services/startup_service.dart` |
| Devices on this Mac | iOS Simulators (iPhone 17 Pro, iOS 26.2–26.5), Android AVD `Pixel_8_Pro` | ✔ `xcrun simctl`, `~/.android/avd` |

## Rules
- Never edit files in the Flutter project. Captures are built from a **copy** outside it (`~/projects/.meyra-capture-build`, git-ignored, disposable).
- Running the app touches production services (see table). Do it only with the owner's explicit approval, recorded below.
- No real user data, no personal accounts, fixed simulator location (Istanbul, Fatih Camii area), no purchases.

## Owner decisions
| Date | Decision |
|---|---|
| 2026-11-14 ~21:55 TRT | Owner approved running the debug app in the iOS Simulator against production (expected footprint: 1 anonymous Firebase Auth user, debug analytics events, 1 anonymous RevenueCat customer, AdMob test ads). Filter analytics for this date/time window. |

## Findings to share with the owner (not changed by us)
- `new-upload-key.jks` (Android upload keystore) is **tracked in git** in the Flutter repo. Consider removing it from the repo history and rotating the upload key via Play Console.
