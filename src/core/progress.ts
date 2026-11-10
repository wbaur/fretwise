// Progress persistence in localStorage. Pure functions + a tiny subscribe API,
// with no React dependency.
import type { Progress, Settings } from './types'

const KEY = 'fretwise.progress.v1'

export const defaultSettings: Settings = {
  speed: 1,
  metronome: true,
  guideNotes: false,
  leftHanded: false,
  waitMode: false,
  micEnabled: true,
  micDeviceId: null,
  latencyMs: 80,
  dailyGoalMinutes: 10,
}

const defaultProgress: Progress = {
  lastPracticeDay: null,
  streakDays: 0,
  longestStreak: 0,
  totalPracticeSeconds: 0,
  practiceLog: {},
  completedLessons: [],
  bestScores: {},
  songStars: {},
  songPlays: {},
  quizScores: {},
  settings: defaultSettings,
}

/** Fill in any fields missing from older saves or imported backups. */
function normalize(parsed: Partial<Progress>): Progress {
  return { ...defaultProgress, ...parsed, settings: { ...defaultSettings, ...parsed.settings } }
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultProgress
    return normalize(JSON.parse(raw) as Partial<Progress>)
  } catch {
    return defaultProgress
  }
}

let state: Progress = load()
const listeners = new Set<() => void>()

function save(next: Progress) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage full or blocked: keep in memory */
  }
  listeners.forEach((l) => l())
}

export function getProgress(): Progress {
  return state
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function localDay(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()
  return Math.round(ms / 86_400_000)
}

/** Streak shown to the user: 0 if they missed yesterday and haven't played today. */
export function currentStreak(p: Progress = state): number {
  if (!p.lastPracticeDay) return 0
  return daysBetween(p.lastPracticeDay, localDay()) <= 1 ? p.streakDays : 0
}

/** Record practice time and bump the daily streak. */
export function addPractice(seconds: number) {
  const today = localDay()
  let streak = state.streakDays
  if (state.lastPracticeDay !== today) {
    const gap = state.lastPracticeDay ? daysBetween(state.lastPracticeDay, today) : Infinity
    streak = gap === 1 ? streak + 1 : 1
  }
  const secs = Math.max(0, Math.round(seconds))
  save({
    ...state,
    lastPracticeDay: today,
    streakDays: streak,
    longestStreak: Math.max(state.longestStreak, streak),
    totalPracticeSeconds: state.totalPracticeSeconds + secs,
    practiceLog: { ...state.practiceLog, [today]: (state.practiceLog[today] ?? 0) + secs },
  })
}

export function completeLesson(id: string) {
  if (state.completedLessons.includes(id)) return
  save({ ...state, completedLessons: [...state.completedLessons, id] })
}

/** Record a finished run of a song/exercise. */
export function recordScore(songId: string, score: number, stars: number) {
  save({
    ...state,
    bestScores: { ...state.bestScores, [songId]: Math.max(state.bestScores[songId] ?? 0, score) },
    songStars: { ...state.songStars, [songId]: Math.max(state.songStars[songId] ?? 0, stars) },
    songPlays: { ...state.songPlays, [songId]: (state.songPlays[songId] ?? 0) + 1 },
  })
}

export function recordQuiz(topicId: string, percent: number) {
  if ((state.quizScores[topicId] ?? -1) >= percent) return
  save({ ...state, quizScores: { ...state.quizScores, [topicId]: percent } })
}

export function updateSettings(patch: Partial<Settings>) {
  save({ ...state, settings: { ...state.settings, ...patch } })
}

export function formatPracticeTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  return `${h} h ${mins % 60} min`
}

/** Seconds practised today. */
export function todaySeconds(p: Progress = state): number {
  return p.practiceLog[localDay()] ?? 0
}

/** A JSON backup of all progress and settings. */
export function exportProgress(): string {
  return JSON.stringify({ app: 'fretwise', version: 1, exportedAt: new Date().toISOString(), progress: state }, null, 2)
}

/** Restore from a backup made by exportProgress(). Throws if the file isn't a Fretwise backup. */
export function importProgress(json: string) {
  const data = JSON.parse(json) as { app?: string; progress?: Partial<Progress> }
  if (data.app !== 'fretwise' || typeof data.progress !== 'object' || data.progress === null) {
    throw new Error('This file is not a Fretwise backup.')
  }
  save(normalize(data.progress))
}

export function resetProgress() {
  save({ ...defaultProgress, settings: state.settings })
}
