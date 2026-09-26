# Phase 6 — calendar and memory viewer

The calendar now keeps complete Monday-first weeks, including leap days and trailing spaces. The year picker shows a large visual cover for each month with saved moments, and selecting a month returns to the same calendar view. There is no album screen.

Video tiles use silent looping playback only while visible and focused, with at most two active calendar players. Other native video tiles use a generated still; players stop while scrolling, when a memory is open, when reduced motion is enabled, or when the app is backgrounded. A long press opens a muted, enlarged preview. The memory viewer has pause/mute controls, previous/next navigation, horizontal swipe navigation, tap-to-zoom for photos, captions, and edit/remove actions.

Verified: date-boundary tests, TypeScript, lint, formatting, and Expo web/iOS/Android JavaScript exports. The web preview was checked at desktop and phone widths for seven-column alignment, year browsing, zoom, and previous/next navigation.

Still required for the Phase 6 completion gate: run the camera-to-calendar and video flows on an iPhone and Android phone, especially native thumbnail generation, long-press versus scroll, swipe gestures, audio focus, reduced motion, and performance with several years of media. Phase 5's durable, lightweight thumbnails and media import work also remain open; this phase's video stills are generated for the current app session.
