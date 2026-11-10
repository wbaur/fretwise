# Fretwise

A beginner-friendly "learn guitar" web app (React + TypeScript + Vite), installable as a PWA.

- **Play-along fretboard** with scrolling notes, bouncing ball, scoring, wait mode and mic pitch detection
- **Tuner** and **mic setup** with latency calibration
- **Lessons** (beginner path), **Music Theory** mini-lessons with quizzes, **Follow-along** chord/strum drills
- **Progress**: streaks, daily goal, practice calendar, badges, best scores. Stored in `localStorage`, with backup/restore in Settings

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 (mic works on localhost)
npm run build        # production build in dist/
npm run preview      # serve the production build (service worker active here)
```

### Hosted on GitHub Pages

Every push to `main` builds the app and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`). It's served over HTTPS, so the mic and
"Add to Home Screen" work on your phone from anywhere. One-time setup: in the
repo, **Settings → Pages → Source: GitHub Actions**.

### On your phone (same Wi-Fi)

Phones only allow the microphone on HTTPS pages, so use:

```bash
npm run dev:phone       # dev server over HTTPS on your network
npm run preview:phone   # production build over HTTPS (use this to install the PWA)
```

Open the `Network: https://…` address it prints on your phone. The certificate is self-signed, so
accept the browser warning once ("Advanced → Proceed"). Then:

- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** menu → *Install app* / *Add to Home screen*

## Project layout

```
src/
  core/                # No React here: reusable as-is inside Capacitor later
    types.ts           # Song, NoteEvent, Progress, Settings…
    engine.ts          # play-along clock, judging, scoring, wait mode
    music.ts           # note names, MIDI ↔ frequency
    quiz.ts            # quiz/lesson content model + helpers
    achievements.ts    # badges (computed from progress)
    progress.ts        # localStorage progress, streaks, backup/restore
    audio/             # Web Audio: synth sounds, scheduler, metronome, YIN pitch detection, mic input
    data/              # songs/*.json, lessons, theory content, chords, follow-alongs
  play/                # play-along screen + canvas renderer
  screens/             # all other screens
  components/          # shared UI (chord diagrams, mini fretboard, tab, confetti…)
public/
  manifest.webmanifest, sw.js, icons/   # PWA files
scripts/
  make-songs.mjs       # write melodies compactly, regenerate the song JSON
```

### Song format

Each note: `{ "string": 0-5, "fret": n, "start": beats, "duration": beats }`.
String `0` is high E (thin, top of screen), `5` is low E (thick, bottom).
Times are in beats so the speed slider can change tempo without touching the data.
To add a song, add it to `scripts/make-songs.mjs` and run `node scripts/make-songs.mjs`.

## Wrapping with Capacitor later

The build uses relative paths (`base: './'`) and a hash router, so `dist/` runs from a file URL.
Roughly: `npm i @capacitor/core @capacitor/cli`, `npx cap init`, set `webDir` to `dist`,
`npx cap add ios` / `android`, and add the microphone permission (`NSMicrophoneUsageDescription`
on iOS, `RECORD_AUDIO` on Android).
