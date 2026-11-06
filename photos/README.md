# Event photos

Put each event's photos in `photos/<slug>/`, where `<slug>` is the event's slug in `content/events.json`
(for example `photos/techsync24/`). Name files with numbers: `1.jpg`, `2.jpg`, and so on.
Allowed types: jpg, jpeg, png, webp. Keep each file under about 500 KB.

List every photo in the event's `photos` array, for example `"photos/techsync24/1.jpg"`.
`node scripts/check-content.mjs` fails if a listed file is missing or has another type,
and warns about files over 500 KB.
