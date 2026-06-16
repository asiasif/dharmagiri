import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Key, Check, Info, ShieldAlert, Sparkles, X } from "lucide-react";

export default function FirebaseConfigModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("firebaseConfig");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: "",
    };
  });

  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value.trim() }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!config.apiKey || !config.projectId || !config.authDomain) {
      setErrorMessage("API Key, Project ID, and Auth Domain are required.");
      return;
    }

    try {
      localStorage.setItem("firebaseConfig", JSON.stringify(config));
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
        // Reload to apply new Firebase config
        window.location.reload();
      }, 1500);
    } catch (err) {
      setErrorMessage("Failed to save configuration.");
    }
  };

  const handleLoadDemo = () => {
    // Fill with sample placeholders to show UI/UX
    const demoConfig = {
      apiKey: "AIzaSyDemoKey1234567890_PlaceholderOnly",
      authDomain: "dharmagiri-ignou-exam.firebaseapp.com",
      projectId: "dharmagiri-ignou-exam",
      storageBucket: "dharmagiri-ignou-exam.appspot.com",
      messagingSenderId: "123456789012",
      appId: "1:123456789012:web:abcdef1234567890",
    };
    setConfig(demoConfig);
  };

  const handleClear = () => {
    localStorage.removeItem("firebaseConfig");
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay" style={overlayStyle}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="glass-panel"
          style={modalStyle}
        >
          <div style={headerStyle}>
            <div style={titleContainerStyle}>
              <Database className="gradient-text" style={{ width: 28, height: 28 }} />
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Firebase Integration Setup</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Configure your Firestore and Auth Backend
                </p>
              </div>
            </div>
            <button onClick={onClose} style={closeBtnStyle} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div style={alertBoxStyle}>
            <Info size={16} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              This web application runs fully serverless. Your Firebase project credentials will be stored securely 
              in your browser's local storage. None of this information is sent to third parties.
            </p>
          </div>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={gridStyle}>
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="password"
                  name="apiKey"
                  value={config.apiKey}
                  onChange={handleChange}
                  placeholder="AIzaSy..."
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Project ID</label>
                <input
                  type="text"
                  name="projectId"
                  value={config.projectId}
                  onChange={handleChange}
                  placeholder="dharmagiri-ignou"
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Auth Domain</label>
                <input
                  type="text"
                  name="authDomain"
                  value={config.authDomain}
                  onChange={handleChange}
                  placeholder="dharmagiri-ignou.firebaseapp.com"
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Storage Bucket</label>
                <input
                  type="text"
                  name="storageBucket"
                  value={config.storageBucket}
                  onChange={handleChange}
                  placeholder="dharmagiri-ignou.appspot.com"
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Messaging Sender ID</label>
                <input
                  type="text"
                  name="messagingSenderId"
                  value={config.messagingSenderId}
                  onChange={handleChange}
                  placeholder="854930281249"
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label className="form-label">App ID</label>
                <input
                  type="text"
                  name="appId"
                  value={config.appId}
                  onChange={handleChange}
                  placeholder="1:854930281249:web:a62b5d4e..."
                  className="input-field"
                />
              </div>
            </div>

            {errorMessage && (
              <div style={errorStyle}>
                <ShieldAlert size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={footerStyle}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                >
                  <Sparkles size={14} style={{ color: "var(--secondary)" }} />
                  Demo Preset
                </button>
                {localStorage.getItem("firebaseConfig") && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="btn btn-danger"
                    style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                  >
                    Reset Connection
                  </button>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ minWidth: 140 }}>
                {isSaved ? (
                  <>
                    <Check size={16} />
                    Connected!
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    Save & Load
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Styling definitions (kept inline for modularity and absolute guarantee that they don't break if global stylesheets fail)
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(3, 7, 18, 0.8)",
  backdropFilter: "blur(8px)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1.5rem",
};

const modalStyle = {
  width: "100%",
  maxWidth: "680px",
  padding: "2rem",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(10, 15, 30, 0.85)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1.5rem",
};

const titleContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const closeBtnStyle = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "none",
  borderRadius: "50%",
  color: "var(--text-secondary)",
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.2s",
};

const alertBoxStyle = {
  display: "flex",
  gap: "0.75rem",
  padding: "1rem",
  background: "rgba(99, 102, 241, 0.06)",
  border: "1px solid rgba(99, 102, 241, 0.15)",
  borderRadius: "var(--radius-md)",
  marginBottom: "1.5rem",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "1rem",
};

const errorStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.75rem 1rem",
  background: "rgba(239, 68, 68, 0.1)",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  borderRadius: "var(--radius-md)",
  color: "#fca5a5",
  fontSize: "0.85rem",
};

const footerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "1.5rem",
  paddingTop: "1.5rem",
  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
  flexWrap: "wrap",
  gap: "1rem",
};
