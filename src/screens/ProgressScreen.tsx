import { Link } from 'react-router-dom'
import { GoalRing } from '../components/GoalRing'
import { Difficulty, PageHeader } from '../components/ui'
import { BADGES } from '../core/achievements'
import { exercises, lessons, songs, theoryTopics } from '../core/data'
import { currentStreak, formatPracticeTime, localDay, todaySeconds } from '../core/progress'
import { useProgress } from '../useProgress'
import './progress.css'

const WEEKS = 6
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function calendarDays(): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const mondayOffset = (today.getDay() + 6) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - mondayOffset - (WEEKS - 1) * 7)
  return Array.from({ length: WEEKS * 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export default function ProgressScreen() {
  const p = useProgress()
  const streak = currentStreak(p)
  const goalSec = p.settings.dailyGoalMinutes * 60
  const today = todaySeconds(p)
  const todayKey = localDay()
  const daysPractised = Object.values(p.practiceLog).filter((s) => s > 0).length
  const lessonsDone = lessons.filter((l) => p.completedLessons.includes(l.id)).length
  const earned = BADGES.filter((b) => b.earned(p))

  return (
    <main className="page progress-page">
      <PageHeader title="Your Progress" subtitle="Everything is saved on this device" />

      <section className="stat-grid">
        <div className="stat-tile"><span>🔥</span><b>{streak}</b><small>day streak · best {p.longestStreak}</small></div>
        <div className="stat-tile"><span>⏱️</span><b>{formatPracticeTime(p.totalPracticeSeconds)}</b><small>total practice</small></div>
        <div className="stat-tile"><span>📅</span><b>{daysPractised}</b><small>days practised</small></div>
        <div className="stat-tile"><span>🧭</span><b>{lessonsDone}/{lessons.length}</b><small>lessons done</small></div>
      </section>

      <section className="panel today-panel">
        <GoalRing fraction={today / goalSec} size={92} stroke={10}>
          <b>{Math.floor(today / 60)}</b><small>/ {p.settings.dailyGoalMinutes} min</small>
        </GoalRing>
        <div>
          <h2>{today >= goalSec ? 'Daily goal reached! 🎉' : 'Today’s goal'}</h2>
          <p className="muted">
            {today >= goalSec
              ? 'Great work. Anything extra is a bonus.'
              : `${Math.ceil((goalSec - today) / 60)} more minute${goalSec - today > 60 ? 's' : ''} to reach your ${p.settings.dailyGoalMinutes}-minute goal.`}
            {' '}<Link to="/settings">Change goal</Link>
          </p>
        </div>
      </section>

      <section className="panel">
        <h2>Practice calendar</h2>
        <div className="calendar" role="grid" aria-label={`Practice over the last ${WEEKS} weeks`}>
          {WEEKDAYS.map((d, i) => <span key={i} className="cal-head">{d}</span>)}
          {calendarDays().map((d) => {
            const key = localDay(d)
            const secs = p.practiceLog[key] ?? 0
            const future = key > todayKey
            const level = future || secs === 0 ? 0 : secs < goalSec / 2 ? 1 : secs < goalSec ? 2 : secs < goalSec * 2 ? 3 : 4
            return (
              <span key={key} className={`cal-day l${level} ${future ? 'future' : ''} ${key === todayKey ? 'today' : ''}`}
                title={`${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${Math.round(secs / 60)} min`}>
                {d.getDate()}
              </span>
            )
          })}
        </div>
        <div className="cal-legend muted"><span>Less</span>{[0, 1, 2, 3, 4].map((l) => <i key={l} className={`cal-day l${l}`} />)}<span>More</span></div>
      </section>

      <section className="panel">
        <h2>Badges <span className="muted">{earned.length}/{BADGES.length}</span></h2>
        <div className="badges">
          {BADGES.map((b) => {
            const has = b.earned(p)
            return (
              <div key={b.id} className={`badge ${has ? 'earned' : ''}`} title={b.description}>
                <span className="badge-emoji">{b.emoji}</span>
                <b>{b.title}</b>
                <small>{b.description}</small>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Songs & exercises</h2>
        <div className="score-list">
          {[...exercises, ...songs].map((s) => (
            <Link key={s.id} to={`/play/${s.id}`} className="score-row">
              <span className="score-title">{s.title}<Difficulty level={s.difficulty} /></span>
              <Stars n={p.songStars[s.id] ?? 0} />
              <span className="score-best">{p.bestScores[s.id] ? p.bestScores[s.id].toLocaleString() : '–'}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Theory quizzes</h2>
        <div className="score-list">
          {theoryTopics.map((t) => {
            const pct = p.quizScores[t.id]
            return (
              <Link key={t.id} to={`/theory/${t.id}`} className="score-row">
                <span className="score-title">{t.title}</span>
                <span className="quiz-bar"><span style={{ width: `${pct ?? 0}%` }} /></span>
                <span className="score-best">{pct !== undefined ? `${pct}%` : '–'}</span>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="mini-stars" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => <span key={i} className={i <= n ? 'on' : ''}>★</span>)}
    </span>
  )
}
