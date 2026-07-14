# CutCoach Native

Native Flutter foundation for direct Apple HealthKit access.

## Current milestone

- native iOS app shell
- direct HealthKit permission request
- reads today's total step count
- refreshes when the app returns to foreground
- no Shortcuts, Safari bridge, Supabase step bridge, or personal automation required
- existing web app remains untouched

## Required Mac setup

A Mac with the current stable Flutter SDK and Xcode is required to generate and run the iOS project.

From this directory:

```bash
flutter create --platforms=ios --org de.reemaru --project-name cutcoach_native .
flutter pub get
open ios/Runner.xcworkspace
```

In Xcode:

1. Select the `Runner` target.
2. Open **Signing & Capabilities**.
3. Select your Apple development team.
4. Add the **HealthKit** capability.
5. Use a unique bundle identifier, for example `de.reemaru.cutcoach`.

Add these entries to `ios/Runner/Info.plist` inside `<dict>`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>CutCoach liest deine Schritte, um deinen täglichen Fortschritt automatisch anzuzeigen.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>CutCoach benötigt diese Berechtigung für die Apple-Health-Integration.</string>
```

Then connect the iPhone and run:

```bash
flutter run
```

The first launch shows Apple's Health permission sheet. After permission is granted, the app reads today's steps directly from HealthKit.

## Next migration stages

1. Persist settings and daily data locally.
2. Port calories, macros, water, weight, training, and alcohol logic.
3. Add native navigation and the food library.
4. Add backup/import migration from the current PWA.
5. Prepare TestFlight distribution.
