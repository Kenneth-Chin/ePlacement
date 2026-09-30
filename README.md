# ePlacement Practice

ePlacement Practice is a free, open-source rehearsal tool for Malaysian dental placement candidates. It simulates the timed clinic-selection workflow, but it does not connect to or submit information to the official ePlacement service.

## What is included

- A public landing page with concise practice instructions.
- A searchable dashboard containing 793 clinic records across 17 location groups.
- A randomized, timed clinic-selection simulation.
- A device-only leaderboard stored in the browser's `localStorage`.
- Responsive desktop and mobile layouts.

## Run locally

No build step or package installation is required. Serve `ePlacement-master/` with any static HTTP server, for example:

```powershell
npx serve ePlacement-master
```

Opening `index.html` directly also works in most browsers, but a local HTTP server more closely matches production.

## Verify the clinic snapshot

```powershell
node ePlacement-master/verify-clinic-data.mjs
```

The source snapshot metadata is in `clinics_raw.json`. `generate-clinic-data.mjs` transforms it into the browser-ready `clinic-data.js` file.

## Vercel

The root `vercel.json` deliberately serves `ePlacement-master/` as the static output directory and adds baseline browser security headers. In Vercel, use the **Other** framework preset and leave the build command blank.

## Public leaderboard recommendation

The current leaderboard is intentionally local to each browser. For a shared leaderboard, place all database access behind server-side API routes; never expose a database write credential in client JavaScript. A small Postgres table is the simplest durable source of truth, with server-side validation, rate limiting, profanity/moderation controls, nickname-only entries, a deletion/reporting mechanism, and a short privacy notice. Redis sorted sets are useful later if leaderboard traffic becomes large, but they are not a substitute for an auditable durable record at this project's likely scale.

## Data and third-party material

Clinic names, districts, and facility codes were collected from the public GIReT/DIS clinic directory on 12 July 2026. They are a historical directory snapshot, not current vacancies. The source site identifies its content as copyright of the Oral Health Programme, Ministry of Health Malaysia. Public accessibility does not by itself grant an open-data licence, so the dataset is **not** licensed under this repository's MIT licence. Obtain written reuse permission or replace it with an explicitly open-licensed official dataset before a broad public launch.

This project is a practice simulator, not the official ePlacement service. Do not add real candidate information, passwords, government credentials, the Malaysian coat of arms, or ministry logos.

See [LEGAL-REVIEW.md](LEGAL-REVIEW.md) before publishing or advertising the project.

## Licence

Original source code in this repository is available under the [MIT Licence](LICENSE). Government and third-party names, clinic data, text, and marks are excluded and remain subject to their respective rights. See [LEGAL-REVIEW.md](LEGAL-REVIEW.md) for the current publication risks.

## Security

This static website requires no API keys or server credentials. Never place database passwords, API keys, `.env` files, or Vercel credentials in browser JavaScript. If a server-backed leaderboard is added, keep all credentials server-side and validate every submitted record.

Security or correction questions can be sent to `keyc.ai.2026@gmail.com`.
