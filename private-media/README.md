# Add your private photographs and audio here

Use simple filenames: childhood-1.jpg, childhood-2.jpg, teenage.jpg, recent.jpg,
our-day-1.jpg, our-day-2.jpg, our-day-3.jpg, my-voice.mp3, ambient.mp3, birthday.mp3.

Reference each through `/api/media/FILENAME` in `content/story.json`.
These assets are served by a server-gated route and remain unavailable before
October 1, 2026 at 00:00 Asia/Colombo. Do not put personal assets in `public/`.

Prefer portrait JPG/WebP photos around 1200 px on the long edge, each under 1 MB.
Use MP3 for cross-browser audio support. The real voice message should be around
25–45 seconds. Record it naturally; silence between sentences is welcome.
The birthday and ambient music must be yours or appropriately licensed.

The server reads these files at runtime. Run `npm run build` again after adding
or changing files before deployment. Large archives may exceed host bundle limits;
keep the total personal media comfortably below 30 MB for simple deployments.
