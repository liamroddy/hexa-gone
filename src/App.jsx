import { useState } from 'react'
import SplashScreen from './screens/SplashScreen'
import GameScreen from './screens/GameScreen'
import HowToPlayScreen from './screens/HowToPlayScreen'
import './App.css'

/**
 * Difficulty presets: radius is the "rings" around the center hex.
 * radius 2 → 19 hexes (3 per side), radius 3 → 37, radius 4 → 61
 */
const DIFFICULTIES = {
  easy:   { radius: 2, label: 'Easy' },
  medium: { radius: 3, label: 'Medium' },
  hard:   { radius: 4, label: 'Hard' },
}

export default function App() {
  const [page, setPage] = useState('splash')
  const [difficulty, setDifficulty] = useState('easy')

  const startGame = (diff) => {
    setDifficulty(diff)
    setPage('game')
  }

  if (page === 'game') {
    const { radius } = DIFFICULTIES[difficulty]
    return <GameScreen radius={radius} onBack={() => setPage('splash')} />
  }
  if (page === 'howto') return <HowToPlayScreen onBack={() => setPage('splash')} />
  return <SplashScreen onStart={startGame} onHowTo={() => setPage('howto')} difficulties={DIFFICULTIES} />
}
