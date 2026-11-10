// Quiz and lesson content model (data only; the UI decides how to draw it).

export type NoteValue = 'whole' | 'half' | 'quarter' | 'eighth'

export const NOTE_BEATS: Record<NoteValue, number> = { whole: 4, half: 2, quarter: 1, eighth: 0.5 }

/** A position on the neck. string: 0 = high e … 5 = low E. */
export interface Spot {
  string: number
  fret: number
  label?: string
}

export type Visual =
  | { kind: 'chord'; name: string }
  | { kind: 'fretboard'; marks: Spot[]; maxFret?: number; labelStrings?: boolean }
  | { kind: 'tab'; columns: Spot[][] }
  | { kind: 'rhythm'; notes: NoteValue[] }
  | { kind: 'emoji'; text: string }

export interface Choice {
  label?: string
  visual?: Visual
}

export interface ChoiceQuestion {
  kind: 'choice'
  prompt: string
  visual?: Visual
  choices: Choice[]
  answer: number
  explain: string
}

/** Tap the right spot on an interactive fretboard. */
export interface FretTapQuestion {
  kind: 'fret-tap'
  prompt: string
  visual?: Visual
  /** Any of these spots is correct. */
  answers: Spot[]
  maxFret: number
  explain: string
}

export type Question = ChoiceQuestion | FretTapQuestion

export interface Card {
  title: string
  body: string[]
  visual?: Visual
}

// ---------- helpers ----------

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** Build a multiple-choice question with shuffled answers. */
export function choice(prompt: string, correct: Choice | string, wrong: (Choice | string)[], explain: string, visual?: Visual): ChoiceQuestion {
  const norm = (c: Choice | string): Choice => (typeof c === 'string' ? { label: c } : c)
  const all = shuffle([{ c: norm(correct), ok: true }, ...wrong.map((w) => ({ c: norm(w), ok: false }))])
  return { kind: 'choice', prompt, visual, choices: all.map((x) => x.c), answer: all.findIndex((x) => x.ok), explain }
}

/** Pick n distinct items from a pool, excluding some. */
export function distinct<T>(pool: readonly T[], n: number, exclude: T[] = []): T[] {
  return shuffle(pool.filter((p) => !exclude.includes(p))).slice(0, n)
}

export function isFretTapCorrect(q: FretTapQuestion, s: Spot): boolean {
  return q.answers.some((a) => a.string === s.string && a.fret === s.fret)
}
