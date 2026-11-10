import { useEffect, type ComponentType } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import Home from './screens/Home'
import PlayScreen from './play/PlayScreen'
import MicSetup from './screens/MicSetup'
import Tuner from './screens/Tuner'
import FollowAlong from './screens/FollowAlong'
import Lesson from './screens/Lesson'
import { FollowAlongsScreen, LessonsScreen, SongsScreen, TheoryScreen } from './screens/Sections'
import TheoryTopic from './screens/TheoryTopic'
import ProgressScreen from './screens/ProgressScreen'
import SettingsScreen from './screens/SettingsScreen'

// HashRouter works from file:// and inside Capacitor without server rewrites.
export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lessons" element={<LessonsScreen />} />
        <Route path="/lessons/:id" element={<Keyed Screen={Lesson} />} />
        <Route path="/songs" element={<SongsScreen />} />
        <Route path="/play/:id" element={<PlayScreen />} />
        <Route path="/theory" element={<TheoryScreen />} />
        <Route path="/theory/:id" element={<Keyed Screen={TheoryTopic} />} />
        <Route path="/follow" element={<FollowAlongsScreen />} />
        <Route path="/follow/:id" element={<Keyed Screen={FollowAlong} />} />
        <Route path="/tuner" element={<Tuner />} />
        <Route path="/mic-setup" element={<MicSetup />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

/** Remount a screen when its :id changes, so state never leaks between items. */
function Keyed({ Screen }: { Screen: ComponentType }) {
  const { id } = useParams()
  return <Screen key={id} />
}

/** Start each new screen at the top. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
