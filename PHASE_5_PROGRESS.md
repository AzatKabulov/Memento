# Phase 5 — capture and moment editor

Phase 5 is underway. The camera now has a front/back switch, a recording timer, a 60-second recording limit, recovery guidance for denied permissions, and a rounded retro viewfinder style. Today can use the camera or library; past dates use the library. Import validation checks the video duration and limits photos to 25 MB and videos to 45 MiB for Supabase Free compatibility. The editor carries duration through to storage and offers top/center/bottom photo framing while keeping the complete photo. A SQLite migration preserves that framing for saved moments.

The account-connected native store verifies the media limits again before committing a file. Replacing a moment still keeps the earlier file until the new entry commits. The editor labels local saving accurately; private cloud backup is a later phase.

Still required for the Phase 5 completion gate: in-app trimming of over-60-second imports, reliable capture-date suggestions, lightweight calendar thumbnails, draft recovery after process interruption, and iPhone/Android device checks for camera, microphone, gallery, file sizes, replacement, and playback. The current web preview checks layout but cannot validate native capture.
