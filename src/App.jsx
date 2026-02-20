import { useState } from 'react'
import SplashScreen from './SplashScreen'
import GameScreen from './GameScreen'
import HowToPlayScreen from './HowToPlayScreen'
import './App.css'

export default function App() {
  const [page, setPage] = useState('splash')

  if (page === 'game') return <GameScreen onBack={() => setPage('splash')} />
  if (page === 'howto') return <HowToPlayScreen onBack={() => setPage('splash')} />
  return <SplashScreen onStart={() => setPage('game')} onHowTo={() => setPage('howto')} />
}
