# Memento visual direction

The [Memento Figma design](https://www.figma.com/design/08k3CNlMtJDxHE1BAfRMZQ/Memento-%E2%80%94-Mobile-Diary-App?node-id=0-1) is the current visual reference. The owner also supplied a PDF export containing the calendar, camera, moment, settings, and hold-preview screens. The implementation follows that export while the Figma inspection API is unavailable for this file.

## Visual language

- Near-black, warm surfaces (`#100D0C` and `#201A18`) frame the user's own media.
- Ivory text (`#F6EDE0`), quiet taupe metadata (`#A89A8D`), and a restrained amber accent (`#D5A063`) establish hierarchy.
- Large serif month and moment headings pair with compact system text. Small uppercase labels identify sections.
- Controls, media frames, and cards have generous rounded corners. Lines remain subtle; calendar photos are never washed out by a glass layer.
- The calendar is the only primary diary view. A floating camera button opens today's capture flow.

## Screen behavior

1. **Calendar:** Seven columns display real photo and video thumbnails with the date below each saved moment. Empty dates stay quiet; today has an amber ring. Month arrows and the month/year picker navigate the diary. A visible settings control is retained for discoverability.
2. **Camera:** The live image fills a rounded viewfinder with a soft thirds grid and small Memento badge. Photo/video selection, light, shutter, camera flip, and library import remain functional. Capture is available for today; past dates use the library.
3. **Moment:** The date, large photo or circular video, caption, and edit action lead. Swipe/tap navigation, playback controls, sharing, and removal remain available below the main content. No capture time is shown because the current diary model does not store one.
4. **Settings:** Reminder, cloud backup, export, account, playback, and help are grouped in rounded cards. The design's app-lock and account-deletion controls are omitted until those features work. Cloud backup copy avoids promising encryption beyond the service's current implementation.
5. **Hold preview:** A centered rounded card appears over a dimmed calendar. Tap remains the primary accessible way to open a moment.

The concept PDF uses abstract media placeholders. Actual diary photos and video posters always replace those shapes, preserving the owner's requirement that images be legible directly in the calendar. The older [matte album concept](design/matte-album-concept.png) is superseded; it never introduced a separate album screen.
