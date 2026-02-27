export default function SplashScreen({ onStart, onHowTo, difficulties }) {
  return (
    <div className="screen splash">
      <h1 className="game-title">Hex-a-Gone</h1>
      <div className="button-group">
        {Object.entries(difficulties).map(([key, { label }]) => (
          <button key={key} className="btn btn-start" onClick={() => onStart(key)}>
            {label}
          </button>
        ))}
        <button className="btn btn-howto" onClick={onHowTo}>How to Play</button>
      </div>
    </div>
  )
}
