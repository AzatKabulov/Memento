# Memento visual direction

The [Figma Make mockup](https://www.figma.com/make/YR4qJTCzTcbqfvr03twAsb/Memento-Mobile-App-Mockup) is the current visual reference for the calendar. Its preview contains one completed screen, so the other flows continue to follow the earlier [Memento Figma design](https://www.figma.com/design/08k3CNlMtJDxHE1BAfRMZQ/Memento-%E2%80%94-Mobile-Diary-App?node-id=0-1) and PDF export until new screens are supplied.

## Visual language

- A warm near-black surface (`#17120F`) frames the user's media in dark mode. The optional ivory light mode retains the same composition and clear empty-date boundaries.
- Ivory text (`#F2EADB`), quiet taupe metadata, and a restrained gold accent (`#E2BF8A`) establish hierarchy.
- Instrument Serif provides the display voice; DM Sans carries compact labels and controls. The month heading is large and airy, with the year tucked beside it.
- Controls, media frames, and cards have generous rounded corners. Lines remain subtle; calendar photos are never washed out by a glass layer.
- The calendar is the only primary diary view. A floating camera button opens today's capture flow.

## Screen behavior

1. **Calendar:** A Sunday-first seven-column grid displays full-bleed photo tiles and circular video tiles. Saved dates sit inside the media, leaving more room for the image. Empty dates have subtle rounded boundaries so adjacent days remain distinct; today has a stronger gold border. The month controls sit in a single capsule, a short private-memory count follows the grid, and a metallic camera control floats at the bottom. The month/year picker and settings control remain available.
2. **Camera:** The live image fills a rounded viewfinder with a soft thirds grid and small Memento badge. Photo/video selection, light, shutter, camera flip, and library import remain functional. Capture is available for today; past dates use the library.
3. **Moment:** The date, large photo or circular video, caption, and edit action lead. Video playback has a circular surface without a square card shadow. Swipe/tap navigation, playback controls, sharing, and removal remain available below the main content. No capture time is shown because the current diary model does not store one.
4. **Settings:** Dark/light appearance, reminder, cloud backup, export, account, playback, and help are grouped in rounded cards. The design's app-lock and account-deletion controls are omitted until those features work. Cloud backup copy avoids promising encryption beyond the service's current implementation.
5. **Hold preview:** A hold opens a persistent rounded card over a blurred calendar. Tap outside or swipe vertically to dismiss; horizontal swipes move between saved moments with paired slide animations. Tap remains the primary accessible way to open a moment.

In the moment editor, tap the photo to open a focused crop sheet, then drag it to choose the calendar crop. The editor page scrolls normally outside the sheet. The original media remains intact; the selected focal point is stored locally, in archives, and in cloud backups after the framing migration.

The mockup uses illustrative memories. Actual diary photos and video posters take their place in the app, preserving the owner's requirement that images be legible directly in the calendar. The older [matte album concept](design/matte-album-concept.png) is superseded; it never introduced a separate album screen.
