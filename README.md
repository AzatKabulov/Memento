# Memento

Memento is a private visual diary for iPhone and Android. Keep one photo or short video for each date and browse the days as a personal calendar. Volume 1 is personal only; sharing belongs to a later release.

The [product specification](PHASE_1_SPEC.md) defines behavior, [visual direction](DESIGN.md) records the matte calendar design, and the [build plan](BUILD_PLAN.md) tracks the full release path. [Phase 2–3 progress](PHASE_2_3_PROGRESS.md) distinguishes the working prototype from features still to build.

## Run the prototype

Use Node.js 22.13 or newer. From `mobile/`:

```sh
npm ci
npm start
```

Open it in Expo Go or a development build on a supported phone, or run `npm run web` for layout review. Without account configuration, this is a sample-memory preview and new moments disappear when the app restarts. Phase 4 adds native email accounts and account-scoped local storage; [Phase 4 progress](PHASE_4_PROGRESS.md) records what still needs backend and device verification. [Phase 5 progress](PHASE_5_PROGRESS.md) tracks capture and editing work. Cloud backup and export are later phases.

To connect a Supabase project, copy `mobile/.env.example` to `mobile/.env` and set its project URL and publishable key. Never put a service-role key in the app. Configure email confirmation and allow the `memento://auth/callback` and `memento://auth/reset` redirect URLs in Supabase. Google and Apple providers still need credentials and native testing.

```sh
npm run typecheck
npm run lint
npm run format:check
npx expo-doctor
```

Device validation is required before relying on camera, library import, video clipping, audio, or hold behavior. A web preview and successful JavaScript bundle do not replace iPhone and Android testing.
