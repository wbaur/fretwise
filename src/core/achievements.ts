// Badges are computed from saved progress, so they never need separate storage.
import { lessons, songs } from './data'
import type { Progress } from './types'

export interface Badge {
  id: string
  emoji: string
  title: string
  description: string
  earned: (p: Progress) => boolean
}

const songIds = new Set(songs.map((s) => s.id))

export const BADGES: Badge[] = [
  { id: 'first-lesson', emoji: '🌱', title: 'First Steps', description: 'Finish your first lesson',
    earned: (p) => p.completedLessons.length > 0 },
  { id: 'tuned', emoji: '🎯', title: 'In Tune', description: 'Finish the tuning lesson',
    earned: (p) => p.completedLessons.includes('tuning') },
  { id: 'first-song', emoji: '🎵', title: 'First Song', description: 'Finish any song',
    earned: (p) => Object.keys(p.songPlays).some((id) => songIds.has(id)) },
  { id: 'three-stars', emoji: '⭐', title: 'Star Player', description: 'Get 3 stars on a song or exercise',
    earned: (p) => Object.values(p.songStars).some((s) => s >= 3) },
  { id: 'theory-ace', emoji: '🧠', title: 'Theory Ace', description: 'Score 100% on a theory quiz',
    earned: (p) => Object.values(p.quizScores).some((s) => s >= 100) },
  { id: 'streak-3', emoji: '🔥', title: 'On a Roll', description: 'Practise 3 days in a row',
    earned: (p) => p.longestStreak >= 3 },
  { id: 'streak-7', emoji: '🏅', title: 'Week Warrior', description: 'Practise 7 days in a row',
    earned: (p) => p.longestStreak >= 7 },
  { id: 'hour', emoji: '⏳', title: 'Hour of Power', description: 'Practise for 60 minutes in total',
    earned: (p) => p.totalPracticeSeconds >= 3600 },
  { id: 'path', emoji: '🎓', title: 'Graduate', description: 'Finish the whole beginner path',
    earned: (p) => lessons.every((l) => p.completedLessons.includes(l.id)) },
]
