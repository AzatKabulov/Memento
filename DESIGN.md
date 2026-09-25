# Memento visual direction

Memento should feel like opening a personal photo album in a quiet room. The calendar is the album index: photographs carry the color, while the surrounding interface is matte charcoal. A missed date is a calm, dark space.

The owner selected the **matte photo album** concept. [Visual reference](design/matte-album-concept.png) shows its mood and photo-first treatment; its sample dates and navigation labels are illustrative, not product rules.

Phone-size prototype captures: [welcome](design/prototype-welcome.png), [calendar](design/prototype-calendar.png), and [moment viewer](design/prototype-moment.png). These are web layout previews of the React Native app; native captures follow during device testing.

## Design decisions

- **Palette:** matte charcoal `#212121`, raised charcoal `#2D2C2B`, ivory ink `#F1EAE2`, muted stone `#A8A29B`, hairline `#44413E`, and a restrained warm-ivory action color. Light mode is deferred until the core dark album is validated.
- **Typography:** clear system text for controls and small metadata; a serif face for the Memento wordmark, month title, and memory headings. Avoid decorative text for long captions.
- **Shape:** close-set, nearly square-cornered photo tiles, circular video windows, and soft pill actions. The media remains the focal point.
- **App icon:** a simple pair of photo frames with a sun and horizon, in ivory on charcoal. It remains provisional until checked at launcher sizes on both phones.
- **Motion:** short fades and subtle scale on hold preview. Tap always opens the full moment, so hold is optional. Respect reduced-motion settings when animation is added.
- **Navigation:** calendar opens first for returning users. Today is prominent, month navigation is close to the month title, and settings is secondary. Native back behavior must work on both systems.
- **Language:** intimate and plain. Empty states invite a memory without implying a missed day is a failure.

## Phase 2 screen map

1. Welcome/sign-in concept, then empty calendar.
2. Month calendar, year jump, today action, occupied and empty days.
3. Source choice: camera for today, gallery for today or a past date.
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
