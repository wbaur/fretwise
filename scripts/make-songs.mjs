// Generates the song/exercise JSON files in src/core/data/songs/.
// Melodies are written as compact sequences [string, fret, beats] played one after another.
// Strings: 0 = high E (thinnest, top of the screen) ... 5 = low E (thickest, bottom).
// Use string = null for a rest.
// Run with:  node scripts/make-songs.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core', 'data', 'songs')
mkdirSync(outDir, { recursive: true })

function build(meta, phrases) {
  const notes = []
  const sections = []
  let t = 0
  for (const [name, seq] of phrases) {
    sections.push({ name, start: t })
    for (const [string, fret, beats] of seq) {
      if (string !== null) notes.push({ string, fret, start: t, duration: beats })
      t += beats
    }
  }
  return { ...meta, lengthBeats: t, sections, notes }
}

// Note shortcuts (standard tuning)
const E4 = [0, 0], F4 = [0, 1], G4 = [0, 3], A4 = [0, 5]
const B3 = [1, 0], C4 = [1, 1], D4 = [1, 3]
const G3 = [2, 0], A3 = [2, 2]
const n = (note, beats) => [...note, beats]
const rest = (beats) => [null, 0, beats]

const songs = [
  build(
    { id: 'ex-low-strings', kind: 'exercise', title: 'Open Strings: Low E & A', difficulty: 1, bpm: 70, beatsPerBar: 4,
      description: 'Pluck the two thickest strings without pressing any frets.' },
    [
      ['Low E', [n([5, 0], 1), n([5, 0], 1), n([5, 0], 1), n([5, 0], 1), n([5, 0], 2), n([5, 0], 2)]],
      ['A string', [n([4, 0], 1), n([4, 0], 1), n([4, 0], 1), n([4, 0], 1), n([4, 0], 2), n([4, 0], 2)]],
      ['Mix', [n([5, 0], 1), n([4, 0], 1), n([5, 0], 1), n([4, 0], 1), n([5, 0], 2), n([4, 0], 2)]],
    ],
  ),
  build(
    { id: 'ex-all-open', kind: 'exercise', title: 'Open Strings: All Six', difficulty: 1, bpm: 70, beatsPerBar: 4,
      description: 'Walk across all six open strings, thick to thin and back.' },
    [
      ['Down', [5, 4, 3, 2, 1, 0].map((s) => n([s, 0], 1)).concat([rest(2)])],
      ['Up', [0, 1, 2, 3, 4, 5].map((s) => n([s, 0], 1)).concat([rest(2)])],
      ['Again', [5, 4, 3, 2, 1, 0].map((s) => n([s, 0], 1)).concat([n([0, 0], 2)])],
    ],
  ),
  build(
    { id: 'ex-first-frets', kind: 'exercise', title: 'First Frets on High E', difficulty: 1, bpm: 65, beatsPerBar: 4,
      description: 'Your first fretted notes: open, 1st and 3rd fret on the thinnest string.' },
    [
      ['Climb', [n(E4, 1), n(F4, 1), n(G4, 2), n(E4, 1), n(F4, 1), n(G4, 2)]],
      ['Descend', [n(G4, 1), n(F4, 1), n(E4, 2), n(G4, 1), n(F4, 1), n(E4, 2)]],
    ],
  ),
  build(
    { id: 'ex-spider', kind: 'exercise', title: 'Spider Walk (1-2-3)', difficulty: 2, bpm: 60, beatsPerBar: 4,
      description: 'One finger per fret: frets 1, 2, 3 on each string, low to high.' },
    [
      ['Low strings', [5, 4, 3].flatMap((s) => [n([s, 1], 1), n([s, 2], 1), n([s, 3], 1), rest(1)])],
      ['High strings', [2, 1, 0].flatMap((s) => [n([s, 1], 1), n([s, 2], 1), n([s, 3], 1), rest(1)])],
    ],
  ),
  build(
    { id: 'song-ode-to-joy', kind: 'song', title: 'Ode to Joy', artist: 'L. van Beethoven', difficulty: 2, bpm: 80, beatsPerBar: 4,
      description: 'A famous melody that stays on the top two strings.' },
    [
      ['Verse 1', [n(E4, 1), n(E4, 1), n(F4, 1), n(G4, 1), n(G4, 1), n(F4, 1), n(E4, 1), n(D4, 1),
        n(C4, 1), n(C4, 1), n(D4, 1), n(E4, 1), n(E4, 1.5), n(D4, 0.5), n(D4, 2)]],
      ['Verse 2', [n(E4, 1), n(E4, 1), n(F4, 1), n(G4, 1), n(G4, 1), n(F4, 1), n(E4, 1), n(D4, 1),
        n(C4, 1), n(C4, 1), n(D4, 1), n(E4, 1), n(D4, 1.5), n(C4, 0.5), n(C4, 2)]],
    ],
  ),
  build(
    { id: 'song-twinkle', kind: 'song', title: 'Twinkle Twinkle Little Star', artist: 'Traditional', difficulty: 1, bpm: 85, beatsPerBar: 4,
      description: 'Slow and steady, with plenty of repeated notes.' },
    [
      ['Twinkle', [n(C4, 1), n(C4, 1), n(G4, 1), n(G4, 1), n(A4, 1), n(A4, 1), n(G4, 2),
        n(F4, 1), n(F4, 1), n(E4, 1), n(E4, 1), n(D4, 1), n(D4, 1), n(C4, 2)]],
      ['Up above', [n(G4, 1), n(G4, 1), n(F4, 1), n(F4, 1), n(E4, 1), n(E4, 1), n(D4, 2),
        n(G4, 1), n(G4, 1), n(F4, 1), n(F4, 1), n(E4, 1), n(E4, 1), n(D4, 2)]],
      ['Twinkle again', [n(C4, 1), n(C4, 1), n(G4, 1), n(G4, 1), n(A4, 1), n(A4, 1), n(G4, 2),
        n(F4, 1), n(F4, 1), n(E4, 1), n(E4, 1), n(D4, 1), n(D4, 1), n(C4, 2)]],
    ],
  ),
  build(
    { id: 'song-mary-lamb', kind: 'song', title: 'Mary Had a Little Lamb', artist: 'Traditional', difficulty: 1, bpm: 90, beatsPerBar: 4,
      description: 'Only four notes, perfect first song.' },
    [
      ['Line 1', [n(E4, 1), n(D4, 1), n(C4, 1), n(D4, 1), n(E4, 1), n(E4, 1), n(E4, 2),
        n(D4, 1), n(D4, 1), n(D4, 2), n(E4, 1), n(G4, 1), n(G4, 2)]],
      ['Line 2', [n(E4, 1), n(D4, 1), n(C4, 1), n(D4, 1), n(E4, 1), n(E4, 1), n(E4, 1), n(E4, 1),
        n(D4, 1), n(D4, 1), n(E4, 1), n(D4, 1), n(C4, 4)]],
    ],
  ),
  build(
    { id: 'song-happy-birthday', kind: 'song', title: 'Happy Birthday', artist: 'Traditional', difficulty: 3, bpm: 90, beatsPerBar: 3,
      description: 'Uses three strings and a waltz rhythm in 3/4 time.' },
    [
      ['Line 1', [n(G3, 0.75), n(G3, 0.25), n(A3, 1), n(G3, 1), n(C4, 1), n(B3, 2)]],
      ['Line 2', [n(G3, 0.75), n(G3, 0.25), n(A3, 1), n(G3, 1), n(D4, 1), n(C4, 2)]],
      ['Line 3', [n(G3, 0.75), n(G3, 0.25), n(G4, 1), n(E4, 1), n(C4, 1), n(B3, 1), n(A3, 2)]],
      ['Line 4', [n(F4, 0.75), n(F4, 0.25), n(E4, 1), n(C4, 1), n(D4, 1), n(C4, 2)]],
    ],
  ),
]

for (const s of songs) {
  writeFileSync(join(outDir, `${s.id}.json`), JSON.stringify(s, null, 2) + '\n')
}
console.log(`Wrote ${songs.length} files to ${outDir}`)
