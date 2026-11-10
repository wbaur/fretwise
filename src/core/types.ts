// Shared data types. This folder (src/core) has no React or DOM-UI code,
// so it can be reused unchanged inside a Capacitor/native wrapper later.

/** 0 = high E (thinnest, drawn at the top) … 5 = low E (thickest, drawn at the bottom). */
export type GuitarString = 0 | 1 | 2 | 3 | 4 | 5

export interface NoteEvent {
  string: GuitarString
  /** 0 = open string */
  fret: number
  /** Start time in beats from the beginning of the song. */
  start: number
  /** Length in beats (how long to hold the note). */
  duration: number
}

export interface Section {
  name: string
  /** Start time in beats. */
  start: number
}

export interface Song {
  id: string
  kind: 'song' | 'exercise'
  title: string
  artist?: string
  description: string
  /** 1 (easiest) to 5 */
  difficulty: number
  bpm: number
  beatsPerBar: number
  lengthBeats: number
  sections: Section[]
  notes: NoteEvent[]
}

export interface Lesson {
  id: string
  title: string
  summary: string
  emoji: string
  minutes: number
}

export interface TheoryTopic {
  id: string
  title: string
  summary: string
}

export interface FollowAlong {
  id: string
  title: string
  summary: string
  bpm: number
  kind: 'chord-changes' | 'rhythm'
  /** Chords to cycle through. */
  chords: string[]
  /** Beats to hold each chord before switching. */
  beatsPerChord: number
  /** Strum pattern: one down-strum per beat, or down-up eighths. */
  strum: 'down' | 'down-up'
  tip: string
}

export interface Settings {
  /** Playback speed as a fraction of the song's BPM (0.5 – 1.25). */
  speed: number
  metronome: boolean
  /** Play each note as it reaches the hit line, so you can hear the melody. */
  guideNotes: boolean
  leftHanded: boolean
  waitMode: boolean
  /** Listen to the guitar through the microphone during play-along. */
  micEnabled: boolean
  /** Chosen input device, or null for the system default. */
  micDeviceId: string | null
  /** Microphone latency compensation in milliseconds. */
  latencyMs: number
  /** Daily practice goal in minutes. */
  dailyGoalMinutes: number
}

export interface Progress {
  /** Local date (YYYY-MM-DD) of the last day with practice. */
  lastPracticeDay: string | null
  streakDays: number
  longestStreak: number
  totalPracticeSeconds: number
  /** Seconds practised per local day (YYYY-MM-DD). */
  practiceLog: Record<string, number>
  completedLessons: string[]
  bestScores: Record<string, number>
  /** Best star rating (0–3) per song/exercise. */
  songStars: Record<string, number>
  /** How many times each song/exercise was finished. */
  songPlays: Record<string, number>
  quizScores: Record<string, number>
  settings: Settings
}
