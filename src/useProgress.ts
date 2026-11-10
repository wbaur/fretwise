import { useSyncExternalStore } from 'react'
import { getProgress, subscribe } from './core/progress'

/** React hook that re-renders when saved progress changes. */
export function useProgress() {
  return useSyncExternalStore(subscribe, getProgress)
}
