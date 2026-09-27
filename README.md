# Memento

Memento is a private visual diary for iPhone and Android. Keep one photo or short video for each date and browse the days as a personal calendar. Volume 1 is personal only; sharing belongs to a later release.

The [product specification](PHASE_1_SPEC.md) defines behavior, [visual direction](DESIGN.md) records the matte calendar design, and the [build plan](BUILD_PLAN.md) tracks the full release path. [Phase 2–3 progress](PHASE_2_3_PROGRESS.md) distinguishes the working prototype from features still to build. [Phase 6 progress](PHASE_6_PROGRESS.md) covers calendar browsing and the memory viewer. [Phase 7 progress](PHASE_7_PROGRESS.md) records private-backup setup and remaining validation. [Phase 8 progress](PHASE_8_PROGRESS.md) covers reminders, settings, and portable archives.

[Phase 9 progress](PHASE_9_PROGRESS.md) records emulator smoke tests, reliability fixes, and the physical-device and backend checks still needed for release.

[Phase 10 beta preparation](PHASE_10_BETA.md) defines the entry gates, owner pilot, tester protocol, and feedback triage. No real-use beta has started.

[Phase 11 release preparation](PHASE_11_RELEASE.md) contains draft store copy, a data-handling inventory, and the remaining release gates. No store release has been submitted.

## Run the prototype

Use Node.js 22.13 or newer. From `mobile/`:

```sh
npm ci
npm start
```

Open it in Expo Go or a development build on a supported phone, or run `npm run web` for layout review. Without account configuration, this is a sample-memory preview and new moments disappear when the app restarts. Phase 4 adds native email accounts and account-scoped local storage; [Phase 4 progress](PHASE_4_PROGRESS.md) records what still needs backend and device verification. [Phase 5 progress](PHASE_5_PROGRESS.md) tracks capture and editing work. Phase 7 adds native backup code that needs a configured Supabase project and device verification. Phase 8 adds native reminder and archive flows that still need device tests.

To connect a Supabase project, copy `mobile/.env.example` to `mobile/.env` and set its project URL and publishable key. Never put a service-role key in the app. Configure email confirmation and allow the `memento://auth/callback` and `memento://auth/reset` redirect URLs in Supabase. Google and Apple providers still need credentials and native testing.

```sh
npm run typecheck
npm run lint
npm run format:check
npx expo-doctor
```

Device validation is required before relying on camera, library import, video clipping, audio, or hold behavior. A web preview and successful JavaScript bundle do not replace iPhone and Android testing.

## Test on a phone

For a quick UI and camera check, install Expo Go on the phone, run `npm start` from `mobile/`, and scan the QR code while the phone and computer are on the same network. With no Supabase configuration this is a sample-memory preview; new moments disappear when the app restarts. Do not use it as a real diary.

For an installable Android test APK, sign in to an Expo account, link this project to EAS Build, then run from `mobile/`:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

The `preview` profile in `mobile/eas.json` produces an internally distributed APK. When the cloud build finishes, open its install link on the Android phone. The APK launches without a development server, but account sign-in and persistent memories require a configured Supabase project. Configure the Supabase environment for the EAS build before relying on those features.

An APK cannot be installed on iPhone. Use the same EAS `preview` profile with `--platform ios` after registering the test iPhone and setting up Apple signing, or distribute a later iOS build through TestFlight. Internal iOS builds require an Apple Developer account and provisioning for the test device.
