# Validation record

Validated on September 27, 2026.

Passed:
- npm installation with current stable package versions and a generated lockfile.
- TypeScript strict type check.
- Next.js optimized production build.
- Release timestamp conversion: October 1, 00:00 Sri Lanka = September 30, 18:30 UTC.
- Millisecond boundary tests for early/at-release access.
- Invalid timestamp fails closed.
- Production ignores the development preview flag.
- A running production server returned `open:false, preview:false`, even with
  `ARCHIVE_DEV_PREVIEW=true`; story, media, and progress endpoints returned 423.

Limitations:
- The hosted browser preview could not connect in the build environment. The
  complete rendered desktop/mobile walkthrough was not verified here.
- No personal photos, relationship date, real voice recording, or recipient name
  were supplied. The source contains editable placeholders and example copy.
- No Convex deployment credentials were supplied. Backend schema/functions and the
  bridge were type-checked; real cloud deployment and synchronization remain to
  be checked in your account.
- Camera, microphone, sound, WebGL performance, and recording codecs require a
  real desktop/phone check over HTTPS before sharing.

Suggested final walkthrough:
1. Use development preview, activate each memory, and solve the photo ordering.
2. Check date clues, actual photos, every line of copy, and the final letter.
3. Grant and deny camera permission in separate runs. Verify the camera-off
   control and that leaving Memory 04 stops its tracks.
4. Try all three response branches. Record, replay, re-record, keep, reload, and
   delete a sample keepsake. Confirm the browser Network panel contains no
   letter/audio upload request.
5. Finish the candle reveal and revisit memories from the final world.
6. Repeat on a mobile phone; check portrait and landscape, headphones, muting,
   reduced motion, and the no-camera/no-microphone routes.
7. Connect a separate Convex test deployment with a past release date. Verify
   progress resume, then restore the production release time in both services.
8. Before the birthday, verify the deployed production URL remains sealed.
