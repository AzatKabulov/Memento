# Memento

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

iPhone and Android phone applications. Preserve familiar navigation, permissions, accessibility, and system behavior on each platform. Tablet-specific layouts are an open scope decision.

## Stack

Proposed, not yet selected: React Native, Expo, and TypeScript, with local database/file storage and Supabase for accounts and private cloud backup. No application has been scaffolded.

## Users

People keeping a personal visual diary of ordinary moments. Volume 1 is a private personal journal; Volume 2 may allow friends or strangers to view permitted portions of a calendar.

## Product Purpose

Save one photo or short video for each day and turn those moments into a visual life timeline. Users can add an optional caption and revisit their lives through a calendar.

## Operating Context

Capture in the app for today or import from the phone's gallery for today or a past date. Browse days, months, and years. Existing moments can be replaced. Daily reminders are optional and should feel gentle.

## Capabilities and Constraints

- An account is required. Volume 1 uses email-and-password sign-in with email verification and password reset. Google and Apple sign-in are deferred.
- One photo or video up to 60 seconds per day, with an optional caption.
- Calendar video previews play silently while browsing. Opening a date enables its video's audio.
- Press and hold gently expands a memory for preview, inspired by iPhone Photos.
- Display videos in a circular frame by default, inspired by Telegram video messages. Preserve the underlying saved video beyond the visual crop. Exact recording controls remain a design decision.
- In-app camera capture is for today. Past dates can be filled only with photos or videos imported from the phone's gallery. Future dates cannot contain a moment.
- Support editing, deletion, private storage, backup, and export.
- No guilt about gaps or pressure to maintain a streak.
- Future social features: public/private accounts, approved access, and visibility controls for individual dates. All Volume 1 entries remain private.
- Later possibilities: monthly collages, annual recap videos, and anniversary memories.
- Open decisions: exact media processing limits; cloud provider, recovery model, and costs; final visual design; initial language and supported OS versions.

## Brand Commitments

The name is Memento. The app must feel comfy, personal, and aesthetic, like a diary the user enjoys opening. Photographs and videos lead the experience. Soft visual treatment and gentle motion should support that feeling without making controls difficult to understand.

## Evidence on Hand

The user provided a visual reference of a monthly photo calendar and described Telegram-style circular videos and iPhone Photos-style press-and-hold previews. There is no existing implementation or established design system in this workspace.

## Product Principles

1. Make saving one daily moment easy.
2. Treat gaps as ordinary, without penalties.
3. Keep personal memories private and recoverable.
4. Make revisiting the collection pleasant and simple.
5. Deliver the personal diary before adding social features.

## Planning Record

See PHASE_1_SPEC.md for confirmed first-release behavior and BUILD_PLAN.md for implementation phases, acceptance checks, dependencies, and explicitly provisional technical decisions. Neither document implies that features or release accounts already exist.
