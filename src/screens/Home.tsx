import { Link } from 'react-router-dom'
import { Logo } from '../components/ui'
import { exercises, lessons, songs } from '../core/data'
import { GoalRing } from '../components/GoalRing'
import { currentStreak, formatPracticeTime, todaySeconds } from '../core/progress'
import { useProgress } from '../useProgress'

export default function Home() {
  const progress = useProgress()
  const streak = currentStreak(progress)
  const done = lessons.filter((l) => progress.completedLessons.includes(l.id)).length
  const nextLesson = lessons.find((l) => !progress.completedLessons.includes(l.id))
  const lessonPct = Math.round((done / lessons.length) * 100)
  const today = todaySeconds(progress)
  const goal = progress.settings.dailyGoalMinutes
  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Late-night practice?' : hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!'
  const nudge = today >= goal * 60
    ? 'Daily goal done. Nice work! 🎉'
    : streak > 0 ? `Keep your ${streak}-day streak going.` : 'A few minutes today is a great start.'

  return (
    <main className="page home">
      <header className="home-top">
        <div className="brand">
          <Logo />
          <span>Fretwise</span>
        </div>
        <div className="stats">
          <Link to="/progress" className="stat" title="Daily streak">
            <span className="stat-icon">🔥</span>
            <strong>{streak}</strong>
            <span className="muted">day{streak === 1 ? '' : 's'}</span>
          </Link>
          <Link to="/progress" className="stat" title="Total practice time">
            <span className="stat-icon">⏱️</span>
            <strong>{formatPracticeTime(progress.totalPracticeSeconds)}</strong>
          </Link>
          <Link to="/progress" className="stat goal-chip" title="Today's practice goal">
            <GoalRing fraction={today / (goal * 60)} size={30} stroke={5} />
            <strong>{Math.floor(today / 60)}/{goal}</strong>
            <span className="muted">min today</span>
          </Link>
          <Link to="/settings" className="icon-btn" aria-label="Settings">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4L10.7 6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" /></svg>
          </Link>
        </div>
      </header>

      <p className="greeting"><b>{greeting}</b> {nudge}</p>

      <section className="hero-card">
        <div>
          <p className="eyebrow">{nextLesson ? 'Up next' : 'Path complete!'}</p>
          <h2>{nextLesson ? nextLesson.title : 'You finished the beginner path 🎉'}</h2>
          <div className="progress-track" aria-label={`Lessons ${lessonPct}% complete`}>
            <div className="progress-fill" style={{ width: `${lessonPct}%` }} />
          </div>
          <p className="muted-on-color">{done} of {lessons.length} lessons done</p>
        </div>
        <Link className="btn btn-light" to={nextLesson ? `/lessons/${nextLesson.id}` : '/songs'}>
          {nextLesson ? 'Continue' : 'Play a song'}
        </Link>
      </section>

      <nav className="card-grid" aria-label="Sections">
        <Link to="/lessons" className="home-card c-lessons">
          <span className="card-emoji">🧭</span>
          <h3>Lessons</h3>
          <p>Step-by-step beginner path</p>
          <span className="card-meta">{done}/{lessons.length} complete</span>
        </Link>
        <Link to="/songs" className="home-card c-songs">
          <span className="card-emoji">🎵</span>
          <h3>Songs</h3>
          <p>Play along with easy melodies</p>
          <span className="card-meta">{songs.length + exercises.length} to play</span>
        </Link>
        <Link to="/theory" className="home-card c-theory">
          <span className="card-emoji">🧠</span>
          <h3>Music Theory</h3>
          <p>Short lessons and quizzes</p>
          <span className="card-meta">{Object.keys(progress.quizScores).length} quizzes taken</span>
        </Link>
        <Link to="/follow" className="home-card c-follow">
          <span className="card-emoji">🥁</span>
          <h3>Follow-alongs</h3>
          <p>Chord changes & rhythm drills</p>
          <span className="card-meta">With metronome</span>
        </Link>
        <Link to="/tuner" className="home-card c-tuner">
          <span className="card-emoji">🎯</span>
          <h3>Tuner</h3>
          <p>Tune up using your mic</p>
          <span className="card-meta">Standard E A D G B E</span>
        </Link>
      </nav>
    </main>
  )
}
