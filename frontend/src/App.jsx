import { useState } from "react";
import Home from "./Home";
import FlashcardApp from "./FlashcardApp";

function App() {
  const [showHome, setShowHome] = useState(true);

  if (showHome) {
    return <Home onStartApp={() => setShowHome(false)} />;
  }

  return <FlashcardApp onBackHome={() => setShowHome(true)} />;
}

export default App;