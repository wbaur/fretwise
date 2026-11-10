import { useEffect } from 'react'
import { addPractice } from './core/progress'

const MAX_SECONDS_PER_VISIT = 20 * 60

/** Counts time spent on a screen as practice time (capped, so an idle tab doesn't count forever). */
export function usePracticeTimer(active = true) {
  useEffect(() => {
    if (!active) return
    const started = Date.now()
    return () => {
      const secs = Math.min(MAX_SECONDS_PER_VISIT, (Date.now() - started) / 1000)
      if (secs >= 10) addPractice(secs)
    }
  }, [active])
}
