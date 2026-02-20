import { useState } from 'react'
import './App.css'

function SplashScreen({ onStart, onHowTo }) {
  return (
    <div className="screen splash">
      <h1 className="game-title">Hex-a-Gone</h1>
      <p className="game-subtitle">Can you survive the hexagon grid?</p>
      <div className="button-group">
        <button className="btn btn-start" onClick={onStart}>Start Game</button>
        <button className="btn btn-howto" onClick={onHowTo}>How to Play</button>
      </div>
    </div>
  )
}

function GameScreen({ onBack }) {
  return (
    <div className="screen">
      <h2>Game</h2>
      <p>Game coming soon...</p>
      <button className="btn btn-back" onClick={onBack}>Back</button>
    </div>
  )
}

function HowToPlayScreen({ onBack }) {
  return (
    <div className="screen">
      <h2>How to Play</h2>
      <p>Instructions coming soon...</p>
      <button className="btn btn-back" onClick={onBack}>Back</button>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('splash')

  if (page === 'game') return <GameScreen onBack={() => setPage('splash')} />
  if (page === 'howto') return <HowToPlayScreen onBack={() => setPage('splash')} />
  return <SplashScreen onStart={() => setPage('game')} onHowTo={() => setPage('howto')} />
}
