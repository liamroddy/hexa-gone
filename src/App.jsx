import { useState } from 'react'
import SplashScreen from './screens/SplashScreen'
import GameScreen from './screens/GameScreen'
import HowToPlayScreen from './screens/HowToPlayScreen'
import './App.css'

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
    return <GameScreen radius={DIFFICULTIES[difficulty].radius} onBack={() => setPage('splash')} />
  }
  if (page === 'howto') {
    return <HowToPlayScreen onBack={() => setPage('splash')} />
  }
  return <SplashScreen onStart={startGame} onHowTo={() => setPage('howto')} difficulties={DIFFICULTIES} />
}
