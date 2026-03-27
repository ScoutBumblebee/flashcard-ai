import { useState, useEffect } from "react";

function SkeletonCard() {
  return (
    <div
      style={{
        marginTop: 20,
        padding: 20,
        borderRadius: 16,
        background: "rgba(255,255,255,0.65)",
        boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
        overflow: "hidden",
        position: "relative"
      }}
    >
      <div
        style={{
          height: 14,
          width: "60%",
          background: "linear-gradient(90deg, #e6ddd3 0%, #f0e7dd 50%, #e6ddd3 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          marginBottom: 10,
          borderRadius: 6
        }}
      />
      <div
        style={{
          height: 14,
          width: "80%",
          background: "linear-gradient(90deg, #e6ddd3 0%, #f0e7dd 50%, #e6ddd3 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          borderRadius: 6
        }}
      />
    </div>
  );
}

function FlashcardApp({ onBackHome }) {
  const [text, setText] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [flippedIndex, setFlippedIndex] = useState(null);
  const [uploadedDeckName, setUploadedDeckName] = useState("");
  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [shuffledCards, setShuffledCards] = useState([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [examMode, setExamMode] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [showEncouragement, setShowEncouragement] = useState(false);

  const uploadDeck = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.cards || !Array.isArray(parsed.cards)) {
          setError("Invalid deck file.");
          return;
        }
        setCards(parsed.cards);
        setUploadedDeckName(file.name);
        setFlippedIndex(null);
        setError("");
      } catch {
        setError("Failed to read deck file.");
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError("");
    setUploadedFileName(file.name);

    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => setText(e.target.result);
      reader.readAsText(file);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Using local FastAPI backend
      const res = await fetch("https://filed-beth-lit-clara.trycloudflare.com/extract-text", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setText(data.text || "");
      }
    } catch {
      setError("Could not extract text. Make sure backend is running.");
    }
  };

  const generateFlashcards = async () => {
    if (text.trim().length < 20) {
      setError("Please enter more text.");
      return;
    }

    setLoading(true);
    setError("");
    setCards([]);
    setStatusText("Extracting key concepts");
    setShowEncouragement(false);

    // Show encouragement message after 45 seconds
    const encouragementTimer = setTimeout(() => {
      setShowEncouragement(true);
    }, 45000);

    try {
      // Using local FastAPI backend
      const res = await fetch("https://filed-beth-lit-clara.trycloudflare.com/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          difficulty,
          exam_mode: examMode
        })
      });

      const data = await res.json();

      clearTimeout(encouragementTimer);

      if (data.error) {
        setError(data.error);
      } else {
        setCards(data.flashcards || []);
      }
    } catch {
      clearTimeout(encouragementTimer);
      setError("Could not connect to backend.");
    }

    setLoading(false);
    setStatusText("");
    setShowEncouragement(false);
  };

  const saveDeck = () => {
    const deck = {
      createdAt: new Date().toISOString(),
      cards: cards
    };
    const blob = new Blob([JSON.stringify(deck, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flashcard-deck.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrevious = () => {
    if (studyIndex > 0) {
      setIsTransitioning(true);
      setFlippedIndex(null);
      setTimeout(() => {
        setStudyIndex(studyIndex - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleNext = () => {
    const displayCards = isShuffled ? shuffledCards : cards;
    if (studyIndex < displayCards.length - 1) {
      setIsTransitioning(true);
      setFlippedIndex(null);
      setTimeout(() => {
        setStudyIndex(studyIndex + 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const deleteCard = (index) => {
    const newCards = cards.filter((_, i) => i !== index);
    setCards(newCards);
    setFlippedIndex(null);
  };

  const startEditCard = (index) => {
    setEditingIndex(index);
    setEditQuestion(cards[index].question);
    setEditAnswer(cards[index].answer);
  };

  const saveEditCard = () => {
    if (editingIndex !== null) {
      const newCards = [...cards];
      newCards[editingIndex] = {
        question: editQuestion,
        answer: editAnswer
      };
      setCards(newCards);
      setEditingIndex(null);
      setEditQuestion("");
      setEditAnswer("");
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditQuestion("");
    setEditAnswer("");
  };

  const shuffleDeck = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setIsShuffled(true);
    setStudyIndex(0);
    setFlippedIndex(null);
  };

  const unshuffleDeck = () => {
    setIsShuffled(false);
    setStudyIndex(0);
    setFlippedIndex(null);
  };

  const clearAllCards = () => {
    setCards([]);
    setUploadedDeckName("");
    setUploadedFileName("");
    setText("");
    setError("");
    setFlippedIndex(null);
    setEditingIndex(null);
  };

  const displayCards = isShuffled ? shuffledCards : cards;

  useEffect(() => {
    if (!studyMode) return;

    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (studyIndex > 0 && !isTransitioning) {
            setIsTransitioning(true);
            setFlippedIndex(null);
            setTimeout(() => {
              setStudyIndex(studyIndex - 1);
              setIsTransitioning(false);
            }, 300);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (studyIndex < displayCards.length - 1 && !isTransitioning) {
            setIsTransitioning(true);
            setFlippedIndex(null);
            setTimeout(() => {
              setStudyIndex(studyIndex + 1);
              setIsTransitioning(false);
            }, 300);
          }
          break;
        case ' ':
          e.preventDefault();
          if (!isTransitioning) {
            setFlippedIndex(flippedIndex === 0 ? null : 0);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [studyMode, studyIndex, displayCards.length, flippedIndex, isTransitioning]);

  return (
    <>
      <style>{`
        body {
          margin: 0;
          min-height: 100vh;
          background: linear-gradient(
            180deg,
            #fff3e6 0%,
            #ffd9b8 55%,
            #ffbf91 100%
          );
          background-attachment: fixed;
          font-family: 'Literata', serif;
        }

        * {
          font-family: 'Literata', serif;
        }

        .primary-btn {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .primary-btn:hover:not(:disabled) {
          transform: translateY(-6px);
          box-shadow: 0 18px 40px rgba(0,0,0,0.22);
        }

        .primary-btn:active:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
        }

        .flashcard-wrap {
          transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.45s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, box-shadow;
          border-radius: 20px;
        }

        .flashcard-wrap:hover {
          transform: translateY(-8px);
          box-shadow: 0 22px 46px rgba(0,0,0,0.22);
        }
        
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        
        @keyframes dotPulse {
          0%   { content: ".";}
          25%  { content: "..";}
          50%  { content: "...";}
          75%  { content: "..";}
          100% { content: ".";}
        }

        .loading-dots::after {
          content: "";
          animation: dotPulse 1.5s infinite;
        }

        @keyframes slideOutLeft {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(-100px) scale(0.9);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .card-transition-out {
          animation: slideOutLeft 0.3s ease-out forwards;
        }

        .card-transition-in {
          animation: slideInRight 0.3s ease-out forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 0.85;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        style={{
          padding: 40,
          fontFamily: "'Literata', serif",
          maxWidth: 860,
          margin: "0 auto",
          minHeight: "100vh",
          boxSizing: "border-box"
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 8, display: "flex", alignItems: "center", gap: "15px" }}>
          {!studyMode && onBackHome && (
            <button
              onClick={onBackHome}
              style={{
                padding: "10px 18px",
                fontSize: 16,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(180deg, #ffffff, #ffe6cc)",
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 20px rgba(0,0,0,0.16)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)";
              }}
            >
              ← Home
            </button>
          )}
          Flashcard Generator
        </h1>

        {/* AI Quality Controls */}
        {!studyMode && (
          <div
            style={{
              marginTop: 20,
              marginBottom: 20,
              padding: 20,
              background: "rgba(255, 255, 255, 0.6)",
              borderRadius: 14,
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
            }}
          >
            <h3 style={{ fontSize: 18, marginTop: 0, marginBottom: 16 }}>
              ⚙️ AI Quality Controls
            </h3>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 14, marginBottom: 8, opacity: 0.8 }}>
                Difficulty Level: <strong>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</strong>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, opacity: 0.6 }}>Easy</span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  value={difficulty === "easy" ? 0 : difficulty === "medium" ? 1 : 2}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setDifficulty(val === 0 ? "easy" : val === 1 ? "medium" : "hard");
                  }}
                  disabled={loading}
                  style={{
                    flex: 1,
                    cursor: loading ? "not-allowed" : "pointer",
                    accentColor: "#ff6b35"
                  }}
                />
                <span style={{ fontSize: 12, opacity: 0.6 }}>Hard</span>
              </div>
              <p style={{ fontSize: 12, opacity: 0.6, marginTop: 8, marginBottom: 0 }}>
                {difficulty === "easy" && "📘 Simple questions, straightforward answers"}
                {difficulty === "medium" && "📗 Balanced complexity, detailed answers"}
                {difficulty === "hard" && "📕 Complex concepts, in-depth explanations"}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                id="exam-mode"
                checked={examMode}
                onChange={(e) => setExamMode(e.target.checked)}
                disabled={loading}
                style={{
                  width: 18,
                  height: 18,
                  cursor: loading ? "not-allowed" : "pointer",
                  accentColor: "#ff6b35"
                }}
              />
              <label
                htmlFor="exam-mode"
                style={{
                  fontSize: 14,
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                <strong>🎓 Exam Mode</strong> - Generate test-style questions with multiple choice, true/false, and fill-in-the-blank
              </label>
            </div>
          </div>
        )}

        {!studyMode && (
          <>
            <textarea
              rows="6"
              disabled={loading}
              style={{
                width: "100%",
                padding: 18,
                fontSize: 17,
                lineHeight: 1.6,
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.15)",
                opacity: loading ? 0.6 : 1,
                boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
                outline: "none",
                boxSizing: "border-box"
              }}
              placeholder="Paste your chapter text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            
            <div style={{ 
              marginTop: 12, 
              display: "flex", 
              alignItems: "center", 
              gap: 10,
              fontSize: 14,
              opacity: 0.7
            }}>
              <span>Or upload a file:</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                id="text-file-input"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
              <button
                onClick={() => document.getElementById("text-file-input").click()}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(180deg, #e6f3ff, #b3d9ff)",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  opacity: loading ? 0.5 : 1
                }}
              >
                📄 Upload PDF/Word/TXT
              </button>
            </div>
          </>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            marginTop: 24
          }}
        >
          <input
            type="file"
            accept=".json"
            id="upload-deck-input"
            style={{ display: "none" }}
            onChange={uploadDeck}
          />

          {!studyMode && (
            <>
              <button
                className="primary-btn"
                disabled={loading}
                onClick={() => {
                  if (!loading) {
                    document.getElementById("upload-deck-input").click();
                  }
                }}
                style={{
                  padding: "14px 30px",
                  fontSize: 16,
                  borderRadius: 16,
                  border: "none",
                  background: "linear-gradient(180deg, #ffffff, #ffe6cc)",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 12px 26px rgba(0,0,0,0.20)",
                  opacity: loading ? 0.5 : 1
                }}
              >
                📂 Upload Deck
              </button>

              <button
                className="primary-btn"
                onClick={generateFlashcards}
                disabled={loading}
                style={{
                  padding: "14px 30px",
                  fontSize: 16,
                  borderRadius: 16,
                  border: "none",
                  background: "linear-gradient(180deg, #ffffff, #ffe6cc)",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 12px 26px rgba(0,0,0,0.20)",
                  opacity: loading ? 0.5 : 1
                }}
              >
                {loading ? "🤔 Analyzing…" : "✅ Generate Flashcards"}
              </button>
            </>
          )}

          {cards.length > 0 && !studyMode && (
            <button
              className="primary-btn"
              onClick={() => {
                setStudyIndex(0);
                setStudyMode(true);
                setFlippedIndex(null);
              }}
              style={{
                padding: "14px 30px",
                fontSize: 16,
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(180deg, #ffffff, #ffe6cc)",
                cursor: "pointer",
                boxShadow: "0 12px 26px rgba(0,0,0,0.16)"
              }}
            >
              🎓 Start Studying
            </button>
          )}

          {cards.length > 0 && !studyMode && (
            <button
              className="primary-btn"
              onClick={saveDeck}
              style={{
                padding: "14px 30px",
                fontSize: 16,
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(180deg, #ffffff, #ffe6cc)",
                cursor: "pointer",
                boxShadow: "0 12px 26px rgba(0,0,0,0.16)"
              }}
            >
              💾 Save Deck
            </button>
          )}

          {cards.length > 0 && !studyMode && (
            <button
              className="primary-btn"
              onClick={() => {
                if (window.confirm("Clear all flashcards? This cannot be undone.")) {
                  clearAllCards();
                }
              }}
              style={{
                padding: "14px 30px",
                fontSize: 16,
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(180deg, #ffe6e6, #ffcccc)",
                cursor: "pointer",
                boxShadow: "0 12px 26px rgba(0,0,0,0.16)"
              }}
            >
              🗑️ Clear All
            </button>
          )}

          {studyMode && (
            <button
              className="primary-btn"
              onClick={() => {
                setStudyMode(false);
                setFlippedIndex(null);
                setIsShuffled(false);
              }}
              style={{
                padding: "14px 30px",
                fontSize: 16,
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(180deg, #ffffff, #ffe6cc)",
                cursor: "pointer",
                boxShadow: "0 12px 26px rgba(0,0,0,0.16)"
              }}
            >
              ← Exit Study Mode
            </button>
          )}
        </div>

        {statusText && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 16, opacity: 0.75, margin: 0 }}>
              {statusText}
              <span className="loading-dots" />
            </p>
            <p
              style={{
                fontSize: 13,
                marginTop: 6,
                opacity: 0.6
              }}
            >
              ⚡ Flashcards are generated locally — this may take a bit. Save your deck to avoid regenerating!
            </p>
            {showEncouragement && (
              <p
                style={{
                  fontSize: 13,
                  marginTop: 8,
                  padding: "8px 14px",
                  background: "rgba(255, 255, 255, 0.3)",
                  border: "1px solid rgba(255, 200, 150, 0.4)",
                  borderRadius: 10,
                  opacity: 0.85,
                  display: "inline-block",
                  animation: "fadeIn 0.5s ease-in"
                }}
              >
                ✨ We're sorry it's taking a while. Trust us, it'll be worth it!
              </p>
            )}
          </div>
        )}

        {uploadedDeckName && !loading && !studyMode && (
          <p
            style={{
              marginTop: 10,
              fontSize: 14,
              opacity: 0.7
            }}
          >
            📂 Loaded deck: <strong>{uploadedDeckName}</strong>
          </p>
        )}

        {uploadedFileName && !loading && !studyMode && (
          <p
            style={{
              marginTop: 10,
              fontSize: 14,
              opacity: 0.7
            }}
          >
            📄 Loaded file: <strong>{uploadedFileName}</strong>
          </p>
        )}

        {cards.length > 0 && !loading && !studyMode && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: "rgba(255,255,255,0.5)",
              borderRadius: 12,
              fontSize: 14,
              opacity: 0.8
            }}
          >
            📚 <strong>{cards.length}</strong> {cards.length === 1 ? "card" : "cards"} in deck
          </div>
        )}

        {error && <p style={{ color: "#b00020", marginTop: 16 }}>{error}</p>}

        {loading &&
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

        {/* STUDY MODE */}
        {studyMode && cards.length > 0 && (
          <>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginTop: 32,
              marginBottom: 16
            }}>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 16,
                  opacity: 0.6,
                  margin: 0
                }}
              >
                Card {studyIndex + 1} of {displayCards.length}
              </p>

              <button
                className="primary-btn"
                onClick={isShuffled ? unshuffleDeck : shuffleDeck}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  borderRadius: 12,
                  border: "none",
                  background: isShuffled 
                    ? "linear-gradient(180deg, #e6f3ff, #b3d9ff)"
                    : "linear-gradient(180deg, #ffffff, #ffe6cc)",
                  cursor: "pointer",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.12)"
                }}
              >
                {isShuffled ? "🔄 Original Order" : "🔀 Shuffle"}
              </button>
            </div>

            <p style={{ 
              textAlign: "center", 
              fontSize: 13, 
              opacity: 0.5,
              marginBottom: 20
            }}>
              Use ← → to navigate • Space to flip
            </p>

            <div
              className={`flashcard-wrap ${isTransitioning ? 'card-transition-out' : 'card-transition-in'}`}
              style={{
                perspective: "900px",
                marginTop: 28,
                maxWidth: 600,
                margin: "28px auto"
              }}
            >
              <div
                onClick={() =>
                  setFlippedIndex(flippedIndex === 0 ? null : 0)
                }
                style={{
                  position: "relative",
                  minHeight: 200,
                  transformStyle: "preserve-3d",
                  transition: "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform:
                    flippedIndex === 0
                      ? "rotateX(180deg)"
                      : "rotateX(0deg)",
                  cursor: "pointer"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    padding: 40,
                    background: "#fff9f3",
                    borderRadius: 20,
                    backfaceVisibility: "hidden",
                    boxShadow: "0 10px 22px rgba(0,0,0,0.12)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}
                >
                  <div style={{ opacity: 0.5, fontSize: 12, marginBottom: 16 }}>
                    QUESTION
                  </div>
                  <div style={{ fontSize: 24, lineHeight: 1.4 }}>
                    {displayCards[studyIndex].question}
                  </div>
                </div>

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    padding: 40,
                    background: "#fff0e2",
                    borderRadius: 20,
                    transform: "rotateX(180deg)",
                    backfaceVisibility: "hidden",
                    boxShadow: "0 10px 22px rgba(0,0,0,0.12)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}
                >
                  <div style={{ opacity: 0.5, fontSize: 12, marginBottom: 16 }}>
                    ANSWER
                  </div>
                  <div style={{ fontSize: 22, lineHeight: 1.4 }}>
                    {displayCards[studyIndex].answer}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 20,
                marginTop: 40
              }}
            >
              <button
                className="primary-btn"
                onClick={handlePrevious}
                disabled={studyIndex === 0 || isTransitioning}
                style={{
                  padding: "14px 36px",
                  fontSize: 16,
                  borderRadius: 16,
                  border: "none",
                  background: "linear-gradient(180deg, #ffffff, #ffe6cc)",
                  cursor: studyIndex === 0 || isTransitioning ? "not-allowed" : "pointer",
                  boxShadow: "0 12px 26px rgba(0,0,0,0.16)",
                  opacity: studyIndex === 0 || isTransitioning ? 0.5 : 1
                }}
              >
                ← Previous
              </button>

              <button
                className="primary-btn"
                onClick={handleNext}
                disabled={studyIndex === displayCards.length - 1 || isTransitioning}
                style={{
                  padding: "14px 36px",
                  fontSize: 16,
                  borderRadius: 16,
                  border: "none",
                  background: "linear-gradient(180deg, #ffffff, #ffe6cc)",
                  cursor: studyIndex === displayCards.length - 1 || isTransitioning ? "not-allowed" : "pointer",
                  boxShadow: "0 12px 26px rgba(0,0,0,0.16)",
                  opacity: studyIndex === displayCards.length - 1 || isTransitioning ? 0.5 : 1
                }}
              >
                Next →
              </button>
            </div>
          </>
        )}

        {/* NORMAL MODE */}
        {!loading && !studyMode &&
          cards.map((card, index) => (
            <div
              key={index}
              style={{
                marginTop: 28
              }}
            >
              {editingIndex === index ? (
                <div
                  style={{
                    padding: 26,
                    background: "#fff9f3",
                    borderRadius: 20,
                    boxShadow: "0 10px 22px rgba(0,0,0,0.12)"
                  }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
                      QUESTION
                    </label>
                    <textarea
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      style={{
                        width: "100%",
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 8,
                        border: "1px solid rgba(0,0,0,0.15)",
                        boxSizing: "border-box",
                        minHeight: 80,
                        fontFamily: "'Literata', serif"
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
                      ANSWER
                    </label>
                    <textarea
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      style={{
                        width: "100%",
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 8,
                        border: "1px solid rgba(0,0,0,0.15)",
                        boxSizing: "border-box",
                        minHeight: 80,
                        fontFamily: "'Literata', serif"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={saveEditCard}
                      style={{
                        padding: "10px 20px",
                        fontSize: 14,
                        borderRadius: 12,
                        border: "none",
                        background: "linear-gradient(180deg, #d4f4dd, #a8e6cf)",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                      }}
                    >
                      ✅ Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: "10px 20px",
                        fontSize: 14,
                        borderRadius: 12,
                        border: "none",
                        background: "linear-gradient(180deg, #ffe6e6, #ffcccc)",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="flashcard-wrap"
                    style={{
                      perspective: "900px"
                    }}
                  >
                    <div
                      onClick={() =>
                        setFlippedIndex(flippedIndex === index ? null : index)
                      }
                      style={{
                        position: "relative",
                        minHeight: 150,
                        transformStyle: "preserve-3d",
                        transition: "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                        transform:
                          flippedIndex === index
                            ? "rotateX(180deg)"
                            : "rotateX(0deg)",
                        cursor: "pointer"
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          padding: 26,
                          background: "#fff9f3",
                          borderRadius: 20,
                          backfaceVisibility: "hidden",
                          boxShadow: "0 10px 22px rgba(0,0,0,0.12)"
                        }}
                      >
                        <div style={{ opacity: 0.5, fontSize: 12 }}>QUESTION</div>
                        <div style={{ fontSize: 22, marginTop: 12 }}>
                          {card.question}
                        </div>
                      </div>

                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          padding: 26,
                          background: "#fff0e2",
                          borderRadius: 20,
                          transform: "rotateX(180deg)",
                          backfaceVisibility: "hidden",
                          boxShadow: "0 10px 22px rgba(0,0,0,0.12)"
                        }}
                      >
                        <div style={{ opacity: 0.5, fontSize: 12 }}>ANSWER</div>
                        <div style={{ fontSize: 20, marginTop: 12 }}>
                          {card.answer}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 12,
                      justifyContent: "flex-end"
                    }}
                  >
                    <button
                      onClick={() => startEditCard(index)}
                      style={{
                        padding: "8px 16px",
                        fontSize: 13,
                        borderRadius: 10,
                        border: "none",
                        background: "linear-gradient(180deg, #fff9e6, #ffe6b3)",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this flashcard?")) {
                          deleteCard(index);
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        fontSize: 13,
                        borderRadius: 10,
                        border: "none",
                        background: "linear-gradient(180deg, #ffe6e6, #ffcccc)",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
      </div>
    </>
  );
}

export default FlashcardApp;
