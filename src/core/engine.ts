// Play-along game engine: song clock, note judging, scoring and wait mode.
// Pure TypeScript with no DOM or audio, so it is easy to test and reuse.
import { noteMidi } from './music'
import type { NoteEvent, Song } from './types'

export type Rating = 'perfect' | 'good' | 'early' | 'late' | 'missed'

export const RATING_LABEL: Record<Rating, string> = {
  perfect: 'Perfect!',
  good: 'Good',
  early: 'Early',
  late: 'Late',
  missed: 'Missed',
}

const POINTS: Record<Rating, number> = { perfect: 100, good: 70, early: 40, late: 40, missed: 0 }

/** Timing windows in seconds (distance from the exact note start). */
export const WINDOW = { perfect: 0.07, good: 0.14, ok: 0.25 }

export const MAX_MULTIPLIER = 4
const HITS_PER_MULTIPLIER = 4

export interface PlayNote extends NoteEvent {
  index: number
  midi: number
  rating: Rating | null
  /** Notes before the practice start point are skipped (not scored). */
  skipped: boolean
}

export interface FeedbackEvent {
  id: number
  note: PlayNote
  rating: Rating
  /** Session time (seconds of active play) when it happened. */
  at: number
}

export interface SessionOptions {
  speed: number
  waitMode: boolean
  /** Start from this beat (e.g. a section) instead of the beginning. */
  startBeat?: number
}

export interface SessionResults {
  score: number
  counts: Record<Rating, number>
  total: number
  /** 0–100 */
  accuracy: number
  stars: 0 | 1 | 2 | 3
  bestStreak: number
}

/** Does a played pitch count for this note? (Mic input arrives in phase 3.) */
export type PitchMatcher = (note: PlayNote, midi: number) => boolean
export const exactPitch: PitchMatcher = (note, midi) => note.midi === midi
/** Accept the right note in a neighbouring octave too (pitch detectors often slip an octave). */
export const octaveTolerant: PitchMatcher = (note, midi) => note.midi === midi || Math.abs(note.midi - midi) === 12

export class PlaySession {
  readonly song: Song
  readonly notes: PlayNote[]
  readonly countIn: number
  readonly startBeat: number
  speed: number
  waitMode: boolean

  /** Current song position in beats (negative during the count-in). */
  beat: number
  /** Seconds of active (unpaused) play. */
  elapsed = 0
  score = 0
  streak = 0
  bestStreak = 0
  waiting = false
  waitedSec = 0
  finished = false
  feedback: FeedbackEvent[] = []

  private nextFeedbackId = 1
  private listeners = new Set<() => void>()

  constructor(song: Song, opts: SessionOptions) {
    this.song = song
    this.speed = opts.speed
    this.waitMode = opts.waitMode
    this.startBeat = opts.startBeat ?? 0
    this.countIn = song.beatsPerBar
    this.beat = this.startBeat - this.countIn
    this.notes = song.notes
      .map((n, index) => ({
        ...n,
        index,
        midi: noteMidi(n.string, n.fret),
        rating: null,
        skipped: n.start < this.startBeat,
      }))
      .sort((a, b) => a.start - b.start || a.string - b.string)
  }

  get secPerBeat(): number {
    return 60 / (this.song.bpm * this.speed)
  }

  get multiplier(): number {
    return Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.streak / HITS_PER_MULTIPLIER))
  }

  /** 0..HITS_PER_MULTIPLIER: progress toward the next multiplier. */
  get multiplierProgress(): number {
    return this.multiplier >= MAX_MULTIPLIER ? HITS_PER_MULTIPLIER : this.streak % HITS_PER_MULTIPLIER
  }

  get isPractice(): boolean {
    return this.startBeat > 0
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit() {
    this.listeners.forEach((l) => l())
  }

  /** First note that still needs to be played. */
  pendingNote(): PlayNote | undefined {
    return this.notes.find((n) => !n.skipped && n.rating === null)
  }

  /** In wait mode the clock may not pass this beat. */
  waitCap(): number {
    if (!this.waitMode) return Infinity
    return this.pendingNote()?.start ?? Infinity
  }

  /** Advance the clock by dt seconds of real time. */
  update(dt: number) {
    if (this.finished) return
    this.elapsed += dt
    const cap = this.waitCap()
    const wasWaiting = this.waiting
    let next = this.beat + dt / this.secPerBeat
    if (next >= cap) {
      if (this.waiting) this.waitedSec += dt
      else {
        this.waiting = true
        this.waitedSec = 0
      }
      next = cap
    } else {
      this.waiting = false
    }
    this.beat = next
    if (this.waiting !== wasWaiting) this.emit()

    if (!this.waitMode) {
      const spb = this.secPerBeat
      for (const n of this.notes) {
        if (n.start > this.beat) break
        if (n.skipped || n.rating !== null) continue
        if ((this.beat - n.start) * spb > WINDOW.ok) this.judge(n, 'missed')
      }
    }

    if (this.beat >= this.song.lengthBeats + 1 && !this.pendingNote()) {
      this.finished = true
      this.emit()
    }
  }

  /**
   * The player played something.
   * @param midi detected pitch, or undefined for keyboard/tap input (always the right note)
   * @param lagSec how long ago it happened (input/mic latency), in seconds
   */
  hit(midi?: number, lagSec = 0, matches: PitchMatcher = exactPitch): Rating | null {
    if (this.finished) return null
    const spb = this.secPerBeat
    const beatNow = this.waiting ? this.beat : this.beat - lagSec / spb

    const candidates = this.notes.filter(
      (n) =>
        !n.skipped &&
        n.rating === null &&
        Math.abs(beatNow - n.start) * spb <= WINDOW.ok &&
        (midi === undefined || matches(n, midi)),
    )
    if (!candidates.length) return null
    candidates.sort((a, b) => Math.abs(beatNow - a.start) - Math.abs(beatNow - b.start))
    const target = candidates[0]
    // Keyboard input plays the whole chord at once; a detected pitch plays one note.
    const group = midi === undefined ? candidates.filter((n) => n.start === target.start) : [target]

    let rating: Rating
    if (this.waiting && target.start === this.beat) {
      rating = this.waitedSec <= WINDOW.perfect ? 'perfect' : 'good'
    } else {
      const offset = (beatNow - target.start) * spb
      const a = Math.abs(offset)
      rating = a <= WINDOW.perfect ? 'perfect' : a <= WINDOW.good ? 'good' : offset < 0 ? 'early' : 'late'
    }
    group.forEach((n) => this.judge(n, rating))
    return rating
  }

  private judge(note: PlayNote, rating: Rating) {
    note.rating = rating
    if (rating === 'missed') {
      this.streak = 0
    } else {
      this.score += POINTS[rating] * this.multiplier
      this.streak += 1
      this.bestStreak = Math.max(this.bestStreak, this.streak)
    }
    this.feedback.push({ id: this.nextFeedbackId++, note, rating, at: this.elapsed })
    if (this.feedback.length > 30) this.feedback.shift()
    this.emit()
  }

  results(): SessionResults {
    const counts: Record<Rating, number> = { perfect: 0, good: 0, early: 0, late: 0, missed: 0 }
    let base = 0
    let total = 0
    for (const n of this.notes) {
      if (n.skipped) continue
      total += 1
      const r = n.rating ?? 'missed'
      counts[r] += 1
      base += POINTS[r]
    }
    const accuracy = total ? Math.round((base / (total * POINTS.perfect)) * 100) : 0
    const stars = accuracy >= 90 ? 3 : accuracy >= 75 ? 2 : accuracy >= 50 ? 1 : 0
    return { score: this.score, counts, total, accuracy, stars, bestStreak: this.bestStreak }
  }
}
