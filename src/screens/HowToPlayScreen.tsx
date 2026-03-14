interface HowToPlayScreenProps {
  onBack: () => void;
}

export default function HowToPlayScreen({
  onBack,
}: HowToPlayScreenProps): React.JSX.Element {
  return (
    <div className="screen">
      <h2>How to Play</h2>
      <p>Instructions coming soon...</p>
      <button className="btn" onClick={onBack}>
        Main Menu
      </button>
    </div>
  );
}
