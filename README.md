# PROJECT 19 — The Lost Archive

A full Next.js + TypeScript project for a cinematic 3D birthday story. The world
is rendered with Three.js/WebGL; GSAP animates camera entrances, scene transitions,
and the final gathering of memories. This is source code you own and can customize.
It is not a recording or a flat mockup.

## Start here

1. Install Node.js 22.18+ (LTS) or newer and unzip this project.
2. Open a terminal inside `lost-archive`.
3. Run `npm ci`.
4. Copy `.env.example` to `.env.local` (Windows: `copy .env.example .env.local`).
5. Set `ARCHIVE_DEV_PREVIEW=true` in `.env.local` to explore before her birthday.
6. Run `npm run dev` and visit http://localhost:3000.

Preview mode only works in the development server. **Production always uses the
server's release time, regardless of the preview variable.** No URL parameter,
local-storage value, or client clock bypasses the time gate.

The site opens **October 1, 2026 at 12:00 a.m. Sri Lanka time (Asia/Colombo)**,
which is **September 30, 2026 at 18:30 UTC**. The default is shared by Next.js and
Convex. If you change `ARCHIVE_UNLOCK_AT`, set the same ISO timestamp in both
services. Invalid timestamps fail closed. The locked tab checks the server every
15 seconds and on returning to the tab, so it opens automatically without
requiring a refresh.

## Personalize before sharing

All story text and asset paths live in `content/story.json`. The personal details
below were not supplied, so the project intentionally contains marked empty-photo
frames and editable example writing. It does not invent photographs of her.

- `name`: replace `Love` with her name. Age is already **19**.
- `childhood`: exactly four photographs, **earliest to latest** in the JSON array.
  The UI shuffles them. Set `src` to `/api/media/childhood-1.jpg` etc. `label` is
  descriptive alternative text, and `year` can be the actual year or her age.
- `relationshipDate`: ISO date, for your reference, e.g. `2024-07-12`.
- `relationshipDisplay`: the date displayed in the story, e.g. `12 / 07 / 2024`.
- `dateClues`: exactly three clues, each with a short title, personal clue text,
  and `piece` (`12`, `07`, `2024`). Set these to the real date; they are not
  automatically derived because you may prefer a written date.
- `sharedPhotos`: photographs you took on your special day. At least one.
- `dayObjects`: exactly four things she remembers from that day. The 3D room uses
  symbolic objects; the labels and clues give them personal meaning.
- `qualities`: exactly five specific things you notice about her.
- `feelings`: your short, honest statements, one per scene.
- `voiceMessage`: `/api/media/my-voice.mp3`. Add **your real recording**.
  If absent or unsupported, the written `voiceTranscript` keeps the story usable.
- `ambientTrack`, `birthdayTrack`: optional protected MP3 paths. Without tracks,
  the app plays a quiet, original synthesized ambient score that warms at the
  candle reveal. Music begins only after her first click.
- `finalLetter`: replace the example paragraphs with your own birthday letter.

Put actual files in `private-media/`, **not** `public/`. The media endpoint rejects
path traversal and unsupported extensions, checks the server release gate, and
uses `Cache-Control: private, no-store`. It never serves private story assets
before the release time. Source code access is a different trust boundary: anyone
you give the source ZIP or server credentials can read its contents.

Run `npm run check:content` to list remaining personalization tasks. Run
`npm run check:content -- --strict` as a release checklist. The template deliberately
reports missing personal assets until you add them.

## Connect the Convex backend

The project works locally without a Convex account so you can customize it first.
When configured, Convex persists only per-browser chapter progress and the candle
state. Personal responses are never sent to Convex.

1. Run `npx convex dev` and create/select your Convex project. This also creates
   the normal `_generated` files. Backend functions currently use Convex's generic
   query/mutation APIs so the source type-checks before account setup.
2. Copy the deployment URL to `CONVEX_URL` in `.env.local`.
3. Generate two separate random secrets:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. Put one in `ARCHIVE_SESSION_SECRET` and the other in `ARCHIVE_BACKEND_KEY`.
5. Set `ARCHIVE_BACKEND_KEY` in the Convex deployment environment to the **same**
   value used by Next.js. Use at least 32 characters. Never use a `NEXT_PUBLIC_`
   environment variable for either secret.
6. Set `ARCHIVE_UNLOCK_AT=2026-10-01T00:00:00+05:30` in the Convex environment too.
7. Run `npx convex deploy` when ready for production, and use the production
   deployment URL/secrets in your web host environment.

A signed, HttpOnly, SameSite cookie identifies the journey. The browser never
receives the Convex backend key. Public Convex functions reject unknown keys,
malformed sessions, early requests, and skipped chapter numbers. Writes are
monotonic and idempotent. Restoring a memory again cannot reduce progress.

Local preview deliberately uses browser-only progress even when Convex is
configured, so it doesn't bypass the backend's birthday lock. To test the cloud
integration before release, use a **separate test deployment** and set matching
past unlock timestamps in both test services. Restore production release values
before sharing. Do not disable authorization checks.

When a cloud request fails, the browser keeps progress. On the next load the app
reconciles stored progress one chapter at a time. This is a single-recipient gift,
not account authentication or cross-device identity. Changing browsers creates a
new journey. Anyone with the deployed URL may open it after the release date;
the requested protection is a timed lock, not a recipient password.

## Privacy, permissions, and controls

- Camera permission is requested only after **Restore reflection** is selected.
  The stream is mirrored locally. There is no canvas capture or automatic recording.
- Camera tracks stop on leaving the mirror chapter, on the camera-off control,
  and when the experience unmounts. If she enabled the mirror, the final world
  may reopen it; the camera-off control remains visible. Denial never blocks the story.
- The voice-response branch requests microphone permission separately. She holds
  the button (or Space/Enter) to record, then reviews, re-records, or keeps it.
  Recordings are capped at 90 seconds, with a visible timer and local audio meter.
- A written/recorded response is saved **only after she presses Seal/Keep**, in
  IndexedDB on that device. Nothing is emailed, uploaded, or sent to you.
- She can read/play/delete the keepsake in the final world. Clearing browser data
  deletes it. Private browsing may not retain it; storage failures are explained.
- **Keep it to myself** is a complete, equally valid path through the experience.
- Mobile: touch objects or labelled controls. Desktop: drag to look, WASD/arrows
  to move, click objects, or use keyboard-accessible buttons.
- The help panel includes a reduced-motion switch. OS reduced-motion preference
  is honored initially. Narrative playback has pause and continue controls.
- WebGL/hardware acceleration is required for the world. The site displays a clear
  retry message on unsupported browsers. No 2D substitute is advertised as 3D.
- Microphone and camera require HTTPS in production; localhost is allowed for dev.

## Deploy with Next.js hosting

This is native Next.js App Router code with Node.js route handlers, **not a static
export**. A Next.js-compatible Node host or Vercel can run it.

1. Add your personal files/text and run `npm run check:content`.
2. Configure/deploy Convex as above.
3. Set the environment variables on your web host. Keep the release timestamp.
4. Run `npm run typecheck`, `npm test`, and `npm run build`.
5. Deploy with the usual `npm run build` / `npm start` commands.
6. Visit the production URL before October 1: only the sealed screen should appear.
   Direct `/api/story`, `/api/media/your-file.jpg`, and `/api/progress` requests
   should return HTTP 423. The harmless `/api/gate` endpoint reveals only lock time.
7. Verify camera/audio on an actual phone over HTTPS before the surprise, using
   a separate test deployment with an earlier release date.

Media files are included through Next.js output tracing. Update/rebuild after
changing them. For self-hosting, deploy `private-media/` alongside the app as well.
Keep photos compressed; the sample loader crops them gently to frame proportions.
Music files are read in full by the route; use reasonably sized MP3s (no huge WAVs).

## Stack (latest stable tags verified 27 September 2026)

| Package | Version |
|---|---|
| Next.js | 16.3.6 |
| React / React DOM | 19.3.0 |
| Three.js | 0.186.1 |
| GSAP | 3.15.0 |
| Convex | 1.46.0 |
| TypeScript | 7.0.2 |

Exact versions and the npm lockfile are included for reproducible installs.
Official package registry latest tags were checked during creation. Recheck
security updates before deployment, particularly because the release is later
than the project's creation date. `npm outdated` shows newer available packages.

## Project map

- `app/page.tsx`, `components/Gate.tsx`: server gate and locked opening.
- `app/api/gate/route.ts`: server clock/automatic release.
- `app/api/story/route.ts`: gated story and session initialization.
- `app/api/media/[name]/route.ts`: gated local private media.
- `app/api/progress/route.ts`: authenticated server-to-Convex bridge.
- `components/World.tsx`: real 3D rooms, raycasting, bloom, dust, mirrors, orbit.
- `components/Experience.tsx`: narrative state machine and chapter interactions.
- `components/Sequence.tsx`: timed single-line/photo playback.
- `components/Recorder.tsx`: permission-driven local voice recording.
- `lib/local-vault.ts`: local-only keepsakes.
- `lib/sound.ts`: original synthesized ambient audio fallback.
- `convex/schema.ts`, `convex/archive.ts`: backend schema and guarded progress.
- `content/story.json`: the one place to personalize the story.
- `tests/release.test.ts`: release boundary and production-bypass checks.

The included example words are a starting point. Your photographs, real date,
voice, small inside jokes, and honest final letter are what make this hers.
