import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Check, Info, ShieldAlert, X, ClipboardPaste, ExternalLink, Trash2 } from "lucide-react";

/*
  FirebaseConfigModal — lets the admin paste the full Firebase SDK config snippet
  (the object from Firebase Console → Project Settings → Your Apps → SDK setup)
  or fill individual fields manually.
*/

function parseFirebaseSnippet(text) {
  // Try to parse a pasted JS/JSON firebase config object
  try {
    // Handle format: const firebaseConfig = { ... }; or just { ... }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    // Convert JS object notation to valid JSON (quoted keys)
    const jsonStr = jsonMatch[0]
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/'/g, '"');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export default function FirebaseConfigModal({ isOpen, onClose }) {
  const [mode, setMode] = useState("paste"); // "paste" | "manual"
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState("");

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("firebaseConfig");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" };
  });

  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePasteApply = () => {
    setPasteError("");
    const parsed = parseFirebaseSnippet(pasteText);
    if (!parsed || !parsed.apiKey || !parsed.projectId) {
      setPasteError("Could not read the config. Please paste the full firebaseConfig object from your Firebase Console.");
      return;
    }
    setConfig(parsed);
    saveConfig(parsed);
  };

  const saveConfig = (cfg) => {
    try {
      localStorage.setItem("firebaseConfig", JSON.stringify(cfg));
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
        window.location.reload();
      }, 1500);
    } catch {
      setErrorMessage("Failed to save configuration.");
    }
  };

  const handleManualSave = (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!config.apiKey || !config.projectId || !config.authDomain) {
      setErrorMessage("API Key, Project ID, and Auth Domain are required.");
      return;
    }
    saveConfig(config);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value.trim() }));
  };

  const handleClear = () => {
    localStorage.removeItem("firebaseConfig");
    window.location.reload();
  };

  if (!isOpen) return null;

  const hasExistingConfig = !!localStorage.getItem("firebaseConfig");

  return (
    <AnimatePresence>
      <div style={overlayStyle}>
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ type: "spring", duration: 0.45 }}
          className="glass-panel"
          style={modalStyle}
        >
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Database style={{ width: 26, height: 26, color: "var(--primary)" }} />
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)", margin: 0 }}>
                  Firebase Setup
                </h2>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                  Connect your Firestore database in seconds
                </p>
              </div>
            </div>
            <button onClick={onClose} style={closeBtnStyle} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Info tip */}
          <div style={alertBoxStyle}>
            <Info size={15} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
              Go to <strong>Firebase Console</strong> → Your Project → <strong>Project Settings</strong> → <em>Your Apps</em> → Copy the <strong>firebaseConfig</strong> object and paste it below.
              &nbsp;
              <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--primary)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                Open Console <ExternalLink size={11} />
              </a>
            </p>
          </div>

          {/* Mode Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <button
              type="button"
              onClick={() => setMode("paste")}
              className={`btn ${mode === "paste" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "0.4rem 1rem" }}
            >
              <ClipboardPaste size={14} />
              Paste Config
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`btn ${mode === "manual" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.82rem", padding: "0.4rem 1rem" }}
            >
              Manual Entry
            </button>
          </div>

          {/* PASTE MODE */}
          {mode === "paste" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Paste your firebaseConfig here
                </label>
                <textarea
                  value={pasteText}
                  onChange={e => { setPasteText(e.target.value); setPasteError(""); }}
                  placeholder={`const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "yourproject.firebaseapp.com",
  projectId: "yourproject",
  storageBucket: "yourproject.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};`}
                  rows={9}
                  style={{
                    width: "100%",
                    fontFamily: "monospace",
                    fontSize: "0.78rem",
                    padding: "0.85rem",
                    border: pasteError ? "1.5px solid #ef4444" : "1.5px solid rgba(10, 45, 84, 0.18)",
                    borderRadius: "var(--radius-md)",
                    background: "#f8fafc",
                    color: "#1e293b",
                    resize: "vertical",
                    outline: "none",
                    lineHeight: 1.6,
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {pasteError && (
                <div style={errorStyle}>
                  <ShieldAlert size={15} />
                  <span>{pasteError}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                {hasExistingConfig && (
                  <button type="button" onClick={handleClear} className="btn btn-danger" style={{ fontSize: "0.82rem" }}>
                    <Trash2 size={14} />
                    Remove Config
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePasteApply}
                  className="btn btn-primary"
                  style={{ minWidth: 160, marginLeft: "auto" }}
                >
                  {isSaved ? (
                    <><Check size={16} /> Connected!</>
                  ) : (
                    <><Database size={16} /> Apply & Connect</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MANUAL MODE */}
          {mode === "manual" && (
            <form onSubmit={handleManualSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={gridStyle}>
                {[
                  { name: "apiKey", label: "API Key *", placeholder: "AIzaSy..." },
                  { name: "projectId", label: "Project ID *", placeholder: "dharmagiri-ignou" },
                  { name: "authDomain", label: "Auth Domain *", placeholder: "yourproject.firebaseapp.com" },
                  { name: "storageBucket", label: "Storage Bucket", placeholder: "yourproject.appspot.com" },
                  { name: "messagingSenderId", label: "Messaging Sender ID", placeholder: "854930281249" },
                  { name: "appId", label: "App ID", placeholder: "1:854930281249:web:abc..." },
                ].map(f => (
                  <div key={f.name} className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>{f.label}</label>
                    <input
                      type={f.name === "apiKey" ? "password" : "text"}
                      name={f.name}
                      value={config[f.name] || ""}
                      onChange={handleChange}
                      placeholder={f.placeholder}
                      className="input-field"
                      required={f.label.includes("*")}
                    />
                  </div>
                ))}
              </div>

              {errorMessage && (
                <div style={errorStyle}>
                  <ShieldAlert size={15} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div style={footerStyle}>
                {hasExistingConfig && (
                  <button type="button" onClick={handleClear} className="btn btn-danger" style={{ fontSize: "0.82rem" }}>
                    <Trash2 size={14} />
                    Remove Config
                  </button>
                )}
                <button type="submit" className="btn btn-primary" style={{ minWidth: 160, marginLeft: "auto" }}>
                  {isSaved ? (
                    <><Check size={16} /> Connected!</>
                  ) : (
                    <><Database size={16} /> Save & Connect</>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(10, 33, 57, 0.45)",
  backdropFilter: "blur(8px)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1.5rem",
};

const modalStyle = {
  width: "100%",
  maxWidth: "560px",
  padding: "2rem",
  border: "1.5px solid rgba(10, 45, 84, 0.15)",
  background: "#ffffff",
  borderRadius: "var(--radius-xl)",
  boxShadow: "0 25px 60px rgba(10, 33, 57, 0.25)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1.25rem",
};

const closeBtnStyle = {
  background: "#f1f5f9",
  border: "none",
  borderRadius: "50%",
  color: "var(--text-secondary)",
  width: 32, height: 32,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

const alertBoxStyle = {
  display: "flex",
  gap: "0.65rem",
  padding: "0.85rem 1rem",
  background: "#f0f7ff",
  border: "1px solid rgba(10, 45, 84, 0.12)",
  borderRadius: "var(--radius-md)",
  marginBottom: "1.25rem",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "0.85rem",
};

const errorStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.7rem 1rem",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "var(--radius-md)",
  color: "#b91c1c",
  fontSize: "0.82rem",
};

const footerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "0.5rem",
  flexWrap: "wrap",
  gap: "1rem",
};
