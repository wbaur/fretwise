import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Confetti } from '../components/Confetti'
import { PageHeader } from '../components/ui'
import { StepCard, StepDots } from '../components/StepCard'
import { lessons } from '../core/data'
import { LESSON_STEPS } from '../core/data/lessonSteps'
import { completeLesson } from '../core/progress'
import { usePracticeTimer } from '../usePracticeTimer'
import { useProgress } from '../useProgress'
import './learn.css'

export default function Lesson() {
  const { id = '' } = useParams()
  const index = lessons.findIndex((l) => l.id === id)
  const lesson = lessons[index]
  const steps = LESSON_STEPS[id] ?? []
  const { completedLessons } = useProgress()
  const [step, setStep] = useState(0)
  const [finished, setFinished] = useState(false)
  usePracticeTimer()

  if (!lesson || !steps.length) {
    return <main className="page"><PageHeader title="Lesson not found" back="/lessons" /><Link to="/lessons">Back to lessons</Link></main>
  }

  const next = lessons[index + 1]
  const alreadyDone = completedLessons.includes(id)

  const finish = () => {
    completeLesson(id)
    setFinished(true)
  }

  return (
    <main className="page learn-page">
      <PageHeader title={`${lesson.emoji} ${lesson.title}`} subtitle={`Lesson ${index + 1} of ${lessons.length}${alreadyDone ? ' · completed ✓' : ''}`} back="/lessons" />

      {!finished ? (
        <>
          <StepDots total={steps.length} current={step} />
          <StepCard step={steps[step]} index={step} total={steps.length} />
          <div className="step-nav">
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>Back</button>
            {step < steps.length - 1
              ? <button className="btn" onClick={() => setStep(step + 1)}>Next</button>
              : <button className="btn" onClick={finish}>Finish lesson ✓</button>}
          </div>
        </>
      ) : (
        <section className="step-card results-card">
          <Confetti />
          <div className="results-emoji">🎉</div>
          <h2>Lesson complete!</h2>
          <p className="muted">
            {next ? <>Up next: <b>{next.title}</b>. {next.summary}</> : 'You finished the whole beginner path. Time to play some songs!'}
          </p>
          <div className="step-nav">
            <Link className="btn btn-ghost" to="/lessons">All lessons</Link>
            {next
              ? <Link className="btn" to={`/lessons/${next.id}`}>Next lesson</Link>
              : <Link className="btn" to="/songs">Play songs</Link>}
          </div>
        </section>
      )}
    </main>
  )
}
