# Design Intent: Russian Edania 2 Map

- Goal: reproduce the referenced Edania 2 interactive map locally, with Russian UI and marker names.
- Audience: Russian-speaking Black Desert players using desktop or mobile browsers.
- Task class: reference-matched UI localization, not a redesign.
- Source of truth: the public map at `https://www.korbdo.co.kr/Edania2/index.html` and its current assets.
- Visual direction: retain the compact dark overlay, full-viewport canvas map, marker colors, density, and gallery behavior.
- Constraints: preserve search, filters, pan/zoom, screenshots, completion tracking, reset, and progress import/export.
- Non-goals: new accounts, server-side synchronization, new marker types, or changes to the map artwork.
- Responsive intent: keep the original desktop composition while ensuring Russian controls remain usable on narrow screens.

## Verification states

- Initial map load with all tile layers.
- Expanded/collapsed sidebar.
- Search results and zero-result search.
- Marker selection and screenshot lightbox navigation.
- Completion toggle and persisted state after reload.
- Export, reset, and import of progress.
- Desktop and mobile viewport smoke checks.
