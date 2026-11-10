import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Confetti } from '../components/Confetti'
import { PageHeader } from '../components/ui'
import { StepCard, StepDots } from '../components/StepCard'
import { MiniFretboard, VisualView } from '../components/visuals'
import { theoryTopics } from '../core/data'
import { THEORY } from '../core/data/theory'
import { recordQuiz } from '../core/progress'
import { isFretTapCorrect, type Question, type Spot } from '../core/quiz'
import { usePracticeTimer } from '../usePracticeTimer'
import { useProgress } from '../useProgress'
import './learn.css'

type Stage = 'learn' | 'quiz' | 'results'
type Answer = { kind: 'choice'; picked: number; correct: boolean } | { kind: 'tap'; spot: Spot; correct: boolean }

export default function TheoryTopic() {
  const { id = '' } = useParams()
  const topic = theoryTopics.find((t) => t.id === id)
  const content = THEORY[id]
  const { quizScores } = useProgress()
  usePracticeTimer()

  const [stage, setStage] = useState<Stage>('learn')
  const [card, setCard] = useState(0)
  const [questions, setQuestions] = useState<Question[]>(() => content?.makeQuiz() ?? [])
  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [score, setScore] = useState(0)

  if (!topic || !content) {
    return <main className="page"><PageHeader title="Not found" back="/theory" /><Link to="/theory">Back to Music Theory</Link></main>
  }

  const startQuiz = () => {
    setQuestions(content.makeQuiz())
    setQi(0)
    setScore(0)
    setAnswer(null)
    setStage('quiz')
  }

  const respond = (a: Answer) => {
    if (answer) return
    setAnswer(a)
    if (a.correct) setScore((s) => s + 1)
  }

  const next = () => {
    if (qi + 1 >= questions.length) {
      const pct = Math.round((score / questions.length) * 100)
      recordQuiz(id, pct)
      setStage('results')
    } else {
      setQi(qi + 1)
      setAnswer(null)
    }
  }

  const q = questions[qi]
  const best = quizScores[id]

  return (
    <main className="page learn-page">
      <PageHeader title={topic.title} subtitle={stage === 'learn' ? 'Mini-lesson' : stage === 'quiz' ? 'Quiz' : 'Results'} back="/theory" />

      {stage === 'learn' && (
        <>
          <StepDots total={content.cards.length} current={card} />
          <StepCard step={content.cards[card]} index={card} total={content.cards.length} />
          <div className="step-nav">
            <button className="btn btn-ghost" onClick={() => setCard(card - 1)} disabled={card === 0}>Back</button>
            {card < content.cards.length - 1
              ? <button className="btn" onClick={() => setCard(card + 1)}>Next</button>
              : <button className="btn" onClick={startQuiz}>Take the quiz</button>}
          </div>
          {card < content.cards.length - 1 && (
            <button className="link-btn" onClick={startQuiz}>Skip to quiz{best !== undefined ? ` (best: ${best}%)` : ''}</button>
          )}
        </>
      )}

      {stage === 'quiz' && q && (
        <section className="quiz">
          <div className="quiz-progress" aria-label={`Question ${qi + 1} of ${questions.length}`}>
            <div style={{ width: `${((qi + (answer ? 1 : 0)) / questions.length) * 100}%` }} />
          </div>
          <p className="step-count">Question {qi + 1} of {questions.length}</p>
          <h2 className="quiz-prompt">{q.prompt}</h2>

          {q.visual && <div className="step-visual"><VisualView visual={q.visual} /></div>}

          {q.kind === 'choice' && (
            <div className={`choices ${q.choices.some((c) => c.visual) ? 'visual-choices' : ''}`}>
              {q.choices.map((c, i) => {
                let cls = 'choice'
                if (answer?.kind === 'choice') {
                  if (i === q.answer) cls += ' correct'
                  else if (i === answer.picked) cls += ' wrong'
                  else cls += ' dim'
                }
                return (
                  <button key={i} className={cls} onClick={() => respond({ kind: 'choice', picked: i, correct: i === q.answer })}
                    disabled={!!answer} aria-label={c.label ?? `Option ${i + 1}`}>
                    {c.visual && <VisualView visual={c.visual} />}
                    {c.label && <span>{c.label}</span>}
                  </button>
                )
              })}
            </div>
          )}

          {q.kind === 'fret-tap' && (
            <div className="tap-board">
              <MiniFretboard maxFret={q.maxFret}
                onTap={answer ? undefined : (spot) => respond({ kind: 'tap', spot, correct: isFretTapCorrect(q, spot) })}
                result={answer?.kind === 'tap' ? answer : null}
                reveal={answer && !answer.correct ? q.answers : []} />
              {!answer && <p className="muted">Tap a spot on the fretboard.</p>}
            </div>
          )}

          {answer && (
            <div className={`feedback ${answer.correct ? 'ok' : 'bad'}`} role="status">
              <strong>{answer.correct ? pickPraise() : 'Not quite'}</strong>
              <p>{q.explain}</p>
              <button className="btn" onClick={next} autoFocus>{qi + 1 >= questions.length ? 'See results' : 'Next'}</button>
            </div>
          )}
        </section>
      )}

      {stage === 'results' && (
        <section className="step-card results-card">
          {score === questions.length && <Confetti />}
          <div className="results-emoji">{score === questions.length ? '🏆' : score >= questions.length * 0.75 ? '🎉' : score >= questions.length / 2 ? '👍' : '💪'}</div>
          <h2>{score} / {questions.length} correct</h2>
          <p className="muted">
            {score === questions.length ? 'Perfect score!' : score >= questions.length * 0.75 ? 'Great job!' : 'Keep going. Each try helps it stick.'}
            {best !== undefined && ` Best: ${best}%.`}
          </p>
          <div className="step-nav">
            <button className="btn btn-ghost" onClick={() => { setCard(0); setStage('learn') }}>Review lesson</button>
            <button className="btn" onClick={startQuiz}>Try again</button>
          </div>
          <Link className="link-btn" to="/theory">All theory topics</Link>
        </section>
      )}
    </main>
  )
}

const PRAISE = ['Correct!', 'Nice!', 'You got it!', 'Exactly right!', 'Spot on!']
function pickPraise() {
  return PRAISE[Math.floor(Math.random() * PRAISE.length)]
}
