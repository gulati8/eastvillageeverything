# Admin + Mobile Enrichment Tracker

## Workstreams

1. Admin supports enriched content safely.
2. Mobile uses enriched content cleanly.

## Admin: Current Slice

Status: in progress.

Done:
- Place form reorganized into clear sections: Basics, Photo, Tags, Current web fields, Editorial.
- Editorial fields are visible by default.
- Photo entry is upload/camera/photo-library only in the UI. No editable image URL input.
- Readiness panel shows old-web safety, mobile safety, photo, tags, contact, and editorial status.
- AI text and crop/resize are shown as planned next steps, not fake-working buttons.

Still needed:
- Real image processing: save original, list thumbnail, and detail hero variants.
- Optional focal-point/crop adjustment.
- Real AI text generation into editable fields.
- Enrichment status display for Google/hours data.
- Visual QA on desktop and mobile admin screens.

## Mobile: Later Slice

Status: not started in this slice.

Still needed:
- Polish place detail screen around enriched content.
- Replace older photo fallback with final fallback art system.
- Confirm blank optional fields never break list/detail rendering.
- Verify against production-like place data.

## Safety Rules

- Name remains required.
- New enriched fields stay optional.
- Old web must keep working with existing fields: name, address, phone, website, specials, notes, tags.
- Mobile must render safe fallbacks when photo, tags, hours, or editorial fields are blank.
- Admin should not expose raw image URL editing to Nicholas.
