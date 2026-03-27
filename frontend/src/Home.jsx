import React from "react"; 
function Home({ onStartApp }) {
  return (
    <div style={{ 
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
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
          overflow-x: hidden;
        }

        * {
          font-family: 'Literata', serif;
        }

        /* Aggressive hiding of any unwanted elements */
        #root > div:first-child::before,
        #root::before,
        body > *:not(#root) {
          display: none !important;
        }

        .hero-btn {
          transition: all 0.3s ease;
        }

        .hero-btn:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 24px 48px rgba(0,0,0,0.25);
        }

        .feature-card {
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          cursor: default;
        }

        .feature-card:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 24px 48px rgba(0,0,0,0.22);
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .floating {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .delay-1 { animation-delay: 0.1s; opacity: 0; }
        .delay-2 { animation-delay: 0.2s; opacity: 0; }
        .delay-3 { animation-delay: 0.3s; opacity: 0; }
        .delay-4 { animation-delay: 0.4s; opacity: 0; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          fontFamily: "'Literata', serif"
        }}
      >
        {/* Hero Section */}
        <div
          className="fade-in-up delay-1"
          style={{
            textAlign: "center",
            maxWidth: "800px",
            marginBottom: "60px"
          }}
        >
          {/* Floating Icon */}
          <div
            className="floating"
            style={{
              fontSize: "80px",
              marginBottom: "20px"
            }}
          >
            🎓
          </div>

          <h1
            style={{
              fontSize: "56px",
              fontWeight: 700,
              margin: "0 0 20px 0",
              background: "linear-gradient(135deg, #ff6b35, #f7931e)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            Flashcard Generator
          </h1>

          <p
            style={{
              fontSize: "22px",
              opacity: 0.8,
              marginBottom: "40px",
              lineHeight: 1.6
            }}
          >
            Transform your study materials into interactive flashcards.
            <br />
            Learn smarter, remember longer.
          </p>

          <button
            className="hero-btn"
            onClick={onStartApp}
            style={{
              padding: "20px 50px",
              fontSize: "20px",
              fontWeight: 600,
              borderRadius: "16px",
              border: "none",
              background: "linear-gradient(135deg, #ff6b35, #f7931e)",
              color: "white",
              cursor: "pointer",
              boxShadow: "0 12px 32px rgba(247, 147, 30, 0.4)"
            }}
          >
            Get Started →
          </button>
        </div>

        {/* Features Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "30px",
            maxWidth: "1000px",
            width: "100%",
            marginTop: "20px"
          }}
        >
          {/* Feature 1 */}
          <div
            className="feature-card fade-in-up delay-2"
            style={{
              padding: "30px",
              background: "rgba(255, 255, 255, 0.7)",
              borderRadius: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
              textAlign: "center",
              transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
              cursor: "default"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-12px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 24px 48px rgba(0,0,0,0.22)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "15px" }}>✨</div>
            <h3 style={{ fontSize: "22px", marginBottom: "12px" }}>
              AI-Powered Generation
            </h3>
            <p style={{ fontSize: "16px", opacity: 0.7, lineHeight: 1.5 }}>
              Paste your text and let AI create smart flashcards automatically
            </p>
          </div>

          {/* Feature 2 */}
          <div
            className="feature-card fade-in-up delay-3"
            style={{
              padding: "30px",
              background: "rgba(255, 255, 255, 0.7)",
              borderRadius: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
              textAlign: "center",
              transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
              cursor: "default"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-12px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 24px 48px rgba(0,0,0,0.22)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "15px" }}>🎯</div>
            <h3 style={{ fontSize: "22px", marginBottom: "12px" }}>
              Study Mode
            </h3>
            <p style={{ fontSize: "16px", opacity: 0.7, lineHeight: 1.5 }}>
              Focus on one card at a time with keyboard shortcuts and shuffle
            </p>
          </div>

          {/* Feature 3 */}
          <div
            className="feature-card fade-in-up delay-4"
            style={{
              padding: "30px",
              background: "rgba(255, 255, 255, 0.7)",
              borderRadius: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
              textAlign: "center",
              transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
              cursor: "default"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-12px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 24px 48px rgba(0,0,0,0.22)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "15px" }}>✏️</div>
            <h3 style={{ fontSize: "22px", marginBottom: "12px" }}>
              Full Control
            </h3>
            <p style={{ fontSize: "16px", opacity: 0.7, lineHeight: 1.5 }}>
              Edit, delete, and organize your flashcards exactly how you want
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          className="fade-in-up delay-4"
          style={{
            marginTop: "60px",
            display: "flex",
            gap: "50px",
            flexWrap: "wrap",
            justifyContent: "center"
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "#ff6b35"
              }}
            >
              🔀
            </div>
            <div style={{ fontSize: "14px", opacity: 0.6, marginTop: "5px" }}>
              Shuffle Mode
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "#ff6b35"
              }}
            >
              ⌨️
            </div>
            <div style={{ fontSize: "14px", opacity: 0.6, marginTop: "5px" }}>
              Keyboard Shortcuts
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "#ff6b35"
              }}
            >
              💾
            </div>
            <div style={{ fontSize: "14px", opacity: 0.6, marginTop: "5px" }}>
              Save & Load Decks
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "#ff6b35"
              }}
            >
              🎨
            </div>
            <div style={{ fontSize: "14px", opacity: 0.6, marginTop: "5px" }}>
              Beautiful UI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;