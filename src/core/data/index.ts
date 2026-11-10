import type { FollowAlong, Lesson, Song, TheoryTopic } from '../types'

// All JSON files in ./songs are picked up automatically.
const songModules = import.meta.glob<Song>('./songs/*.json', { eager: true, import: 'default' })

const allSongs: Song[] = Object.values(songModules).sort(
  (a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title),
)

export const songs = allSongs.filter((s) => s.kind === 'song')
export const exercises = allSongs.filter((s) => s.kind === 'exercise')

export function getSong(id: string): Song | undefined {
  return allSongs.find((s) => s.id === id)
}

/** The beginner path, in order. */
export const lessons: Lesson[] = [
  { id: 'holding', title: 'Holding the Guitar', emoji: '🪑', minutes: 3,
    summary: 'Posture, where your hands go, and how to hold a pick.' },
  { id: 'tuning', title: 'Tuning Up', emoji: '🎯', minutes: 5,
    summary: 'Use the built-in tuner to get every string in tune.' },
  { id: 'open-strings', title: 'Open Strings', emoji: '〰️', minutes: 5,
    summary: 'Learn the names E A D G B E and pluck each one cleanly.' },
  { id: 'first-notes', title: 'First Notes', emoji: '👆', minutes: 8,
    summary: 'Press frets with your fingertips and play short melodies.' },
  { id: 'first-chords', title: 'First Chords', emoji: '✋', minutes: 10,
    summary: 'Em, Am, C, G and D — the shapes behind thousands of songs.' },
  { id: 'strumming', title: 'Strumming', emoji: '🎶', minutes: 8,
    summary: 'Keep a steady down-strum rhythm with the metronome.' },
]

export const theoryTopics: TheoryTopic[] = [
  { id: 'open-strings', title: 'Open String Names', summary: 'E A D G B E, from thickest to thinnest.' },
  { id: 'fretboard-notes', title: 'Notes on the Fretboard', summary: 'How frets raise the pitch, one half step at a time.' },
  { id: 'reading-tab', title: 'Reading Tab', summary: 'The six-line notation guitarists use everywhere.' },
  { id: 'chord-shapes', title: 'Basic Chord Shapes', summary: 'C, G, D, Em, Am, E and A.' },
  { id: 'rhythm', title: 'Rhythm & Note Lengths', summary: 'Whole, half, quarter and eighth notes.' },
]

export const followAlongs: FollowAlong[] = [
  { id: 'em-am', title: 'Em ↔ Am Changes', kind: 'chord-changes', bpm: 60, chords: ['Em', 'Am'], beatsPerChord: 4, strum: 'down',
    summary: 'Two easy shapes that share a finger pattern. Switch every 4 beats.',
    tip: 'Fingers 2 and 3 keep the same shape: just move them across one string.' },
  { id: 'g-c', title: 'G ↔ C Changes', kind: 'chord-changes', bpm: 60, chords: ['G', 'C'], beatsPerChord: 4, strum: 'down',
    summary: 'A classic pair used in countless songs. Switch every 4 beats.',
    tip: 'Start moving to the next chord on beat 4. Missing a strum is fine; being late is not.' },
  { id: 'd-a', title: 'D ↔ A Changes', kind: 'chord-changes', bpm: 60, chords: ['D', 'A'], beatsPerChord: 4, strum: 'down',
    summary: 'Practise moving between two compact shapes.',
    tip: 'Keep your fingers close to the strings when switching. Less movement = faster changes.' },
  { id: 'four-chords', title: 'G → D → Em → C', kind: 'chord-changes', bpm: 60, chords: ['G', 'D', 'Em', 'C'], beatsPerChord: 4, strum: 'down',
    summary: 'The famous four-chord loop. Once you can do this, you can play hundreds of songs.',
    tip: 'Try it slowly first. Raise the tempo by 5 BPM only when it feels easy.' },
  { id: 'down-strums', title: 'Steady Down-Strums', kind: 'rhythm', bpm: 70, chords: ['Em'], beatsPerChord: 4, strum: 'down',
    summary: 'One strum on every click. Stay relaxed and even.',
    tip: 'Strum from the elbow, and let the pick glide across the strings.' },
  { id: 'down-up', title: 'Down–Up Eighths', kind: 'rhythm', bpm: 65, chords: ['Em'], beatsPerChord: 4, strum: 'down-up',
    summary: 'Down on the beat, up in between: “1 & 2 & 3 & 4 &”.',
    tip: 'Your hand never stops moving: down, up, down, up, like a pendulum.' },
]
