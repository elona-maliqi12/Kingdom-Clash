import { useState } from "react";
import MainMenu from "@/pages/MainMenu";
import Game from "@/pages/Game";

type Screen = "menu" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      {screen === "menu" && <MainMenu onPlay={() => setScreen("game")} />}
      {screen === "game" && <Game onMenu={() => setScreen("menu")} />}
    </div>
  );
}
