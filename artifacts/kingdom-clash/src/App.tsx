import { useState } from "react";
import MainMenu from "@/pages/MainMenu";
import LevelSelect from "@/pages/LevelSelect";
import HowToPlay from "@/pages/HowToPlay";
import Game from "@/pages/Game";

type Screen = "menu" | "levelSelect" | "howToPlay" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [currentLevel, setCurrentLevel] = useState(1);

  function startLevel(level: number) {
    setCurrentLevel(level);
    setScreen("game");
  }

  function handleNextLevel(stars: number) {
    if (currentLevel < 10) {
      setCurrentLevel((l) => l + 1);
      setScreen("game");
    } else {
      setScreen("levelSelect");
    }
  }

  function handleRetry() {
    setScreen("game");
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      {screen === "menu" && (
        <MainMenu
          onPlay={() => setScreen("levelSelect")}
          onHowToPlay={() => setScreen("howToPlay")}
        />
      )}
      {screen === "levelSelect" && (
        <LevelSelect
          onSelectLevel={startLevel}
          onBack={() => setScreen("menu")}
        />
      )}
      {screen === "howToPlay" && (
        <HowToPlay onBack={() => setScreen("menu")} />
      )}
      {screen === "game" && (
        <Game
          key={currentLevel}
          level={currentLevel}
          onMenu={() => setScreen("menu")}
          onNextLevel={handleNextLevel}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
