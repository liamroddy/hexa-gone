export default function SplashScreen({ onStart, onHowTo }) {
  return (
    <div className="screen splash">
      <h1 className="game-title">Hex-a-Gone</h1>
      <div className="button-group">
        <button className="btn btn-start" onClick={onStart}>Start Game</button>
        <button className="btn btn-howto" onClick={onHowTo}>How to Play</button>
      </div>
    </div>
  )
}
