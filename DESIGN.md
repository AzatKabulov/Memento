# Memento visual direction

Memento should feel like a quiet personal diary. Photographs carry the color, while the surrounding interface is matte charcoal. A missed date is a calm, dark space. Rounded, translucent controls add a gentle glass quality without obscuring memories.

The owner selected the **matte photo album** concept for its visual mood, then clarified that the app has **one monthly calendar view**, not a separate album view. [Visual reference](design/matte-album-concept.png) shows the mood; its sample dates and navigation labels are illustrative, not product rules.

Phone-size prototype captures: [welcome](design/prototype-welcome.png), [calendar](design/prototype-calendar.png), and [moment viewer](design/prototype-moment.png). These are web layout previews of the React Native app; native captures follow during device testing.

## Design decisions

- **Palette:** matte charcoal `#212121`, raised charcoal `#2D2C2B`, ivory ink `#F1EAE2`, muted stone `#A8A29B`, hairline `#44413E`, and a restrained warm-ivory action color. Light mode is deferred until the core dark calendar is validated.
- **Typography:** clear system text for controls and small metadata; a serif face for the Memento wordmark, month title, and memory headings. Avoid decorative text for long captions.
- **Shape:** rounded calendar dates, circular video windows, and pill-shaped actions. Photos fill their date tiles and remain as visible as the seven-column calendar permits.
- **Glass:** translucent navigation and action surfaces, restrained borders, and blur on the floating capture bar. Do not blur or wash out photos. Check Android rendering and contrast on devices.
- **App icon:** a simple pair of photo frames with a sun and horizon, in ivory on charcoal. It remains provisional until checked at launcher sizes on both phones.
- **Motion:** short fades and subtle scale on hold preview. Tap always opens the full moment, so hold is optional. Respect reduced-motion settings when animation is added.
- **Navigation:** the monthly calendar is the sole main view. Today is prominent, month navigation is close to the month title, and settings is secondary. Native back behavior must work on both systems.
- **Camera:** a restrained retro-camera feel, with a clear viewfinder, warm ivory controls, a small recording light, and soft rounded surfaces. The live image remains unobstructed.
- **Language:** intimate and plain. Empty states invite a memory without implying a missed day is a failure.

## Phase 2 screen map

1. Welcome/sign-in concept, then empty calendar.
2. Month calendar, year jump, today action, occupied and empty days.
3. Tapping an empty today opens the camera with a library action below capture. Tapping an empty past date opens the library directly. Future dates stay inactive.
4. Editor: media framing, selected date, optional caption, Save.
5. Moment viewer: circular video with sound when opened, photo viewing, caption, edit/delete, and hold preview from the calendar.
6. Settings: appearance, reminders, autoplay, backup, export, and account areas. These are design placeholders until their implementation phases.

## States to design and verify

Empty diary, incomplete month, selected day, imported video over 60 seconds, denied permission, cancelled picker, unsaved draft, failed local save, offline, backup pending, and media that cannot play. Each state needs a direct next action. The current prototype demonstrates the main flow but does not claim real account access, persistent storage, trimming, or backup.

## Interaction rules

- Each date holds at most one moment. Today may use camera or gallery; past dates use gallery only; future dates are inactive.
- Visible calendar videos loop silently. Focused playback starts with sound and stops on leaving the viewer. Hold preview stays silent.
- A video is circular in the calendar and by default in the viewer. The saved original remains uncropped for future reframing.
- A long press expands a tile. Tap opens it. VoiceOver/TalkBack users can use tap; essential behavior never depends on holding.
- Minimum interactive target is 44 points where practical. Meaningful images need accessible labels; captions wrap at larger text sizes.

The generated visual concepts are exploratory references. Dates, labels, and navigation in the implementation follow the product specification rather than literal pixels from a generated image.
