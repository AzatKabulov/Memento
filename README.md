# Memento

Memento is a private visual diary for iPhone and Android. Keep one photo or short video for each date and browse the days as a personal calendar. Volume 1 is personal only; sharing belongs to a later release.

The [product specification](PHASE_1_SPEC.md) defines behavior, [visual direction](DESIGN.md) records the selected matte photo album design, and the [build plan](BUILD_PLAN.md) tracks the full release path. [Phase 2–3 progress](PHASE_2_3_PROGRESS.md) distinguishes the working prototype from features still to build.

## Run the prototype

Use Node.js 22.13 or newer. From `mobile/`:

```sh
npm ci
npm start
```

Open it in Expo Go or a development build on a supported phone, or run `npm run web` for layout review. The prototype uses sample memories. Photos or videos added during a session are kept only in memory; they disappear when the app restarts. Account sign-in, durable storage, private backup, and export are later implementation phases.

```sh
npm run typecheck
npm run lint
npm run format:check
npx expo-doctor
```

Device validation is required before relying on camera, library import, video clipping, audio, or hold behavior. A web preview and successful JavaScript bundle do not replace iPhone and Android testing.
