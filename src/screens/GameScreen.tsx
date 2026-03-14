import { useState } from "react";
import HexBoard from "../components/HexBoard";
import { useGameState } from "../hooks/useGameState";

interface GameScreenProps {
  radius?: number;
  onBack: () => void;
}

/** Shrink hexes on bigger boards so they fit comfortably */
function hexSizeForRadius(radius: number): number {
  if (radius <= 2) {
    return 30;
  }
  if (radius === 3) {
    return 22;
  }
  return 18;
}

export default function GameScreen({
  radius = 2,
  onBack,
}: GameScreenProps): React.JSX.Element {
  const hexSize = hexSizeForRadius(radius);
  const [paused, setPaused] = useState(false);

  const {
    nodes,
    activeIds,
    animStates,
    isWon,
    isGameOver,
    piecesRemaining,
    movesRemaining,
    handleHexClick,
    newGame,
    retry,
    changerMap,
    bombMap,
  } = useGameState(radius, hexSize);

  function renderTopBar(): React.JSX.Element {
    return (
      <div
        style={{
          position: "absolute",
          top: "1rem",
          left: 0,
          right: 0,
          zIndex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 1rem",
        }}
      >
        <p className="pieces-left" style={{ margin: 0 }}>
          {piecesRemaining} pieces remaining · {movesRemaining} moves left
        </p>
        <button
          className="btn btn-pause"
          onClick={() => {
            setPaused(true);
          }}
          aria-label="Pause"
          style={{ position: "fixed", top: "1rem", right: "1rem" }}
        >
          ⏸
        </button>
      </div>
    );
  }

  function renderPauseModal(): React.JSX.Element | null {
    if (!paused || isWon) {
      return null;
    }
    return (
      <div
        className="modal-overlay"
        role="button"
        tabIndex={0}
        onClick={() => {
          setPaused(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setPaused(false);
          }
        }}
        style={{ zIndex: 2 }}
      >
        <div
          className="modal-content"
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        >
          <p className="win-message">Paused</p>
          <div className="modal-buttons">
            <button
              className="btn btn-medium"
              onClick={() => {
                setPaused(false);
              }}
            >
              Resume
            </button>
            <button
              className="btn"
              onClick={() => {
                setPaused(false);
                retry();
              }}
            >
              Retry
            </button>
            <button className="btn" onClick={onBack}>
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderWinModal(): React.JSX.Element | null {
    if (!isWon) {
      return null;
    }
    return (
      <div
        className="modal-overlay"
        role="button"
        tabIndex={0}
        onClick={newGame}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            newGame();
          }
        }}
        style={{ zIndex: 2 }}
      >
        <div
          className="modal-content"
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        >
          <p className="win-message">Congrats, board cleared!</p>
          <div className="modal-buttons">
            <button className="btn btn-medium" onClick={newGame}>
              New Game
            </button>
            <button className="btn" onClick={retry}>
              Retry
            </button>
            <button className="btn" onClick={onBack}>
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderGameOverModal(): React.JSX.Element | null {
    if (!isGameOver) {
      return null;
    }
    return (
      <div className="modal-overlay" style={{ zIndex: 2 }}>
        <div
          className="modal-content"
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        >
          <p className="win-message">Out of moves!</p>
          <div className="modal-buttons">
            <button className="btn btn-medium" onClick={retry}>
              Retry
            </button>
            <button className="btn" onClick={onBack}>
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="screen game-screen"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 600 }}>
          <HexBoard
            nodes={nodes}
            hexSize={hexSize}
            onHexClick={handleHexClick}
            animStates={animStates}
            activeIds={activeIds}
            changerMap={changerMap}
            bombMap={bombMap}
          />
        </div>
      </div>

      {renderTopBar()}
      {renderPauseModal()}
      {renderWinModal()}
      {renderGameOverModal()}
    </div>
  );
}
