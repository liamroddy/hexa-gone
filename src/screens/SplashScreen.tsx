import type { DifficultyKey, DifficultyConfig } from '../types'

interface SplashScreenProps {
  onStart: (key: DifficultyKey) => void
  onHowTo: () => void
  difficulties: Record<DifficultyKey, DifficultyConfig>
}

export default function SplashScreen({ onStart, onHowTo, difficulties }: SplashScreenProps) {
  return (
    <div className="screen splash">
      <h1 className="game-title">Hexa<br></br>Gone</h1>
      <div className="button-group">
        {(Object.entries(difficulties) as [DifficultyKey, DifficultyConfig][]).map(([key, { label }]) => (
          <button key={key} className="btn btn-big" onClick={() => onStart(key)}>
            {label}
          </button>
        ))}
        <button className="btn" onClick={onHowTo}>How to Play</button>
      </div>
    </div>
  )
}
