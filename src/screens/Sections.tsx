// List screens for each home-screen section. Detailed screens arrive in later phases.
import { Difficulty, ListItem, PageHeader } from '../components/ui'
import { exercises, followAlongs, lessons, songs, theoryTopics } from '../core/data'
import { useProgress } from '../useProgress'
import { Stars } from './ProgressScreen'

export function LessonsScreen() {
  const { completedLessons } = useProgress()
  const nextId = lessons.find((l) => !completedLessons.includes(l.id))?.id
  return (
    <main className="page">
      <PageHeader title="Lessons" subtitle="Your beginner path, one step at a time" />
      <ol className="path">
        {lessons.map((l, i) => {
          const done = completedLessons.includes(l.id)
          const state = done ? 'done' : l.id === nextId ? 'current' : 'locked'
          return (
            <li key={l.id} className={`path-step ${state}`}>
              <span className="path-dot">{done ? '✓' : i + 1}</span>
              <ListItem to={`/lessons/${l.id}`} title={`${l.emoji}  ${l.title}`} meta={`${l.summary} · ${l.minutes} min`} />
            </li>
          )
        })}
      </ol>
    </main>
  )
}


export function SongsScreen() {
  const { bestScores, songStars } = useProgress()
  const row = (s: (typeof songs)[number]) => (
    <ListItem
      key={s.id}
      to={`/play/${s.id}`}
      title={s.title}
      meta={<>{s.artist ? `${s.artist} · ` : ''}{s.bpm} BPM{bestScores[s.id] ? ` · Best ${bestScores[s.id]}` : ''}</>}
      right={<span className="song-right"><Stars n={songStars[s.id] ?? 0} /><Difficulty level={s.difficulty} /></span>}
    />
  )
  return (
    <main className="page">
      <PageHeader title="Songs" subtitle="Pick something to play along with" />
      <h2 className="section-title">Warm-up exercises</h2>
      <div className="list">{exercises.map(row)}</div>
      <h2 className="section-title">Songs</h2>
      <div className="list">{songs.map(row)}</div>
    </main>
  )
}

export function TheoryScreen() {
  const { quizScores } = useProgress()
  return (
    <main className="page">
      <PageHeader title="Music Theory" subtitle="Short lessons, each with a quiz" />
      <div className="list">
        {theoryTopics.map((t) => (
          <ListItem key={t.id} to={`/theory/${t.id}`} title={t.title} meta={t.summary}
            right={quizScores[t.id] !== undefined ? <span className="pill">{quizScores[t.id]}%</span> : undefined} />
        ))}
      </div>
    </main>
  )
}


export function FollowAlongsScreen() {
  return (
    <main className="page">
      <PageHeader title="Follow-alongs" subtitle="Guided practice with a metronome" />
      <div className="list">
        {followAlongs.map((f) => (
          <ListItem key={f.id} to={`/follow/${f.id}`} title={f.title} meta={`${f.summary} · ${f.bpm} BPM`} />
        ))}
      </div>
    </main>
  )
}

