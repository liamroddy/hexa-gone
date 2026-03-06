interface HowToPlayScreenProps {
  onBack: () => void
}

export default function HowToPlayScreen({ onBack }: HowToPlayScreenProps) {
  return (
    <div className="screen">
      <h2>How to Play</h2>
      <p>Instructions coming soon...</p>
      <button className="btn btn-main-menu" onClick={onBack}>Main Menu</button>
    </div>
  )
}
