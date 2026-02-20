import { useState } from 'react'
import SplashScreen from './screens/SplashScreen'
import GameScreen from './screens/GameScreen'
import HowToPlayScreen from './screens/HowToPlayScreen'
import './App.css'

export default function App() {
  const [page, setPage] = useState('splash')

  if (page === 'game') return <GameScreen onBack={() => setPage('splash')} />
  if (page === 'howto') return <HowToPlayScreen onBack={() => setPage('splash')} />
  return <SplashScreen onStart={() => setPage('game')} onHowTo={() => setPage('howto')} />
}
