import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, ShieldCheck, Sparkles, Database, Settings, RefreshCw, Eye, EyeOff } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, isValidConfig, loginWithGoogle, logout, ensureAdminAuth } from "./firebase";

import StudentDashboard from "./components/StudentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import DharmagiriLogo from "./components/DharmagiriLogo";
import AnimatedText from "./components/AnimatedText";
import FirebaseConfigModal from "./components/FirebaseConfigModal";

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState("student"); // "student" | "admin"
  const [authLoading, setAuthLoading] = useState(true);
  
  // Offline Mock Auth States
  const [isDemoMode, setIsDemoMode] = useState(!isValidConfig);

  // Admin Credentials Authentication States
  const [adminLoginActive, setAdminLoginActive] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Firebase Config Modal
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  useEffect(() => {
    // Check if there is an active local admin session stored
    const savedAdmin = localStorage.getItem("adminSession");
    if (savedAdmin) {
      const u = JSON.parse(savedAdmin);
      setUser(u);
      setIsAdmin(true);
      setView("admin");
      setAuthLoading(false);
      ensureAdminAuth("dharmagiricollege@gmail.com", "sulfika@123").catch(() => {});
      return;
    }

    if (isValidConfig && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setAuthLoading(true);
        if (currentUser) {
          setUser(currentUser);
          setIsAdmin(false); // Google logins are strictly students
        } else {
          setUser(null);
          setIsAdmin(false);
          setView("student");
        }
        setAuthLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Offline mode - no firebase configured
      setAuthLoading(false);
      const savedDemoUser = localStorage.getItem("demoUser");
      if (savedDemoUser) {
        const u = JSON.parse(savedDemoUser);
        setUser(u);
        setIsAdmin(true); // Demo mode grants admin toggle access
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    if (isValidConfig && auth) {
      try {
        setAuthLoading(true);
        await loginWithGoogle();
      } catch (err) {
        console.error("Login Error:", err);
        alert("Authentication failed: " + err.message);
        setAuthLoading(false);
      }
    } else {
      // Simulate login for Demo Mode
      const mockUser = {
        uid: "demo-user-123",
        displayName: "Guest Student",
        email: "student@dharmagiri.edu",
        photoURL: "",
      };
      localStorage.setItem("demoUser", JSON.stringify(mockUser));
      setUser(mockUser);
      setIsAdmin(true); // Give full access to test uploader
      setIsDemoMode(true);
    }
  };

  const handleAdminGoogleLogin = async () => {
    if (isValidConfig && auth) {
      try {
        setAuthLoading(true);
        const result = await loginWithGoogle();
        const email = result.user.email.toLowerCase();
        const adminDoc = await getDoc(doc(db, "admins", email));
        if (adminDoc.exists()) {
          setIsAdmin(true);
          setView("admin");
        } else {
          await logout();
          alert(`Access Denied: ${email} is not registered as an administrator.`);
        }
      } catch (err) {
        console.error("Admin Auth Error:", err);
        alert("Auth failed: " + err.message);
      } finally {
        setAuthLoading(false);
      }
    } else {
      // Simulate Admin Login for Demo Mode
      const mockAdmin = {
        uid: "demo-admin-999",
        displayName: "Demo System Admin",
        email: "admin@dharmagiri.edu",
        photoURL: "",
      };
      localStorage.setItem("demoUser", JSON.stringify(mockAdmin));
      setUser(mockAdmin);
      setIsAdmin(true);
      setView("admin");
      setIsDemoMode(true);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("adminSession");
    if (isValidConfig && auth) {
      await logout();
    } else {
      localStorage.removeItem("demoUser");
      setUser(null);
      setIsAdmin(false);
      setView("student");
    }
  };

  const handleAdminCredentialsLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (
      adminEmail.trim().toLowerCase() === "dharmagiricollege@gmail.com" &&
      adminPassword === "sulfika@123"
    ) {
      const adminSessionUser = {
        uid: "dharmagiri-admin-primary",
        displayName: "Dharmagiri Administrator",
        email: "dharmagiricollege@gmail.com",
        photoURL: "",
      };
      
      localStorage.setItem("adminSession", JSON.stringify(adminSessionUser));
      setUser(adminSessionUser);
      setIsAdmin(true);
      setView("admin");
      setAdminLoginActive(false);
      setAdminEmail("");
      setAdminPassword("");

      // Ensure Firebase auth session so request.auth != null in Firestore
      try {
        await ensureAdminAuth("dharmagiricollege@gmail.com", "sulfika@123");
      } catch (authErr) {
        console.warn("Background Firebase Auth sync skipped:", authErr);
      }
    } else {
      setLoginError("Invalid administrator credentials. Please try again.");
    }
  };

  return (
    <div className="app-container">
      {/* Background Classical Animated Gradients & Orbs */}
      <div className="bg-glow-container">
        <div className="floating-orb-1"></div>
        <div className="floating-orb-2"></div>
      </div>

      <AnimatePresence mode="wait">
        {authLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={spinnerOverlayStyle}
          >
            <RefreshCw size={44} className="spin" style={{ color: "var(--primary)" }} />
            <p style={{ marginTop: "1rem", color: "var(--text-secondary)", fontWeight: 600 }}>Verifying credentials...</p>
          </motion.div>
        ) : !user ? (
          // LOGIN SCREEN
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.6 }}
            style={loginWrapperStyle}
          >
            <div className="glass-panel shimmer-card login-card-container">
              {adminLoginActive ? (
                // ADMIN CREDENTIALS LOGIN FORM
                <form onSubmit={handleAdminCredentialsLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", textAlign: "left" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", marginBottom: "0.5rem", width: "100%", textAlign: "center" }}>
                    <DharmagiriLogo size={60} alignment="column" />
                    <div className="classical-badge" style={{ marginTop: "0.25rem" }}>
                      <ShieldCheck size={14} />
                      <span>Administrator Portal</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Admin Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="dharmagiricollege@gmail.com"
                      className="input-field"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ position: "relative", marginBottom: "0.75rem" }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-field"
                        style={{ paddingRight: "3rem" }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "1rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.75rem 1rem",
                      background: "var(--danger-bg)",
                      border: "1px solid #fecaca",
                      borderRadius: "var(--radius-md)",
                      color: "var(--danger)",
                      fontSize: "0.85rem",
                      fontWeight: 600
                    }}>
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                      <ShieldCheck size={18} />
                      Sign In to Console
                    </button>

                    <button
                      type="button"
                      onClick={() => { setAdminLoginActive(false); setLoginError(""); }}
                      className="btn btn-secondary"
                      style={{ width: "100%" }}
                    >
                      Back to Student Portal
                    </button>
                  </div>
                </form>
              ) : (
                // STANDARD STUDENT SIGN-IN CARD
                <>
                  {/* Logo & Branding */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", marginBottom: "0.5rem" }}>
                    <DharmagiriLogo size={68} alignment="column" />
                    <div className="classical-badge-gold" style={{ marginTop: "0.25rem", padding: "0.3rem 0.8rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      IGNOU Examination Center
                    </div>
                  </div>

                  <div style={welcomeBoxStyle}>
                    <Sparkles size={22} style={{ color: "var(--accent-gold)", flexShrink: 0, marginTop: "0.15rem" }} />
                    <div>
                      <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--primary)", fontFamily: "var(--font-classical)", letterSpacing: "0.01em" }}>
                        <AnimatedText text="Exam Seating Locator" type="chars" delay={0.2} />
                      </h2>
                      <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: "0.35rem", lineHeight: 1.5 }}>
                        Scan the college gateway QR code, sign in with your student Google account, and look up your room arrangements instantly.
                      </p>
                    </div>
                  </div>

                  {/* Login actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", width: "100%" }}>
                    <button onClick={handleGoogleLogin} className="btn btn-primary" style={loginBtnStyle}>
                      <LogIn size={18} />
                      Sign In with Google
                    </button>

                    <button onClick={() => { setAdminLoginActive(true); setLoginError(""); }} className="btn btn-secondary" style={adminLoginBtnStyle}>
                      <ShieldCheck size={18} style={{ color: "var(--accent-gold)" }} />
                      Staff / Admin Portal
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowFirebaseModal(true)}
                      className="btn btn-secondary"
                      style={{ width: "100%", fontSize: "0.82rem", padding: "0.6rem 1rem", gap: "0.5rem", color: "var(--text-secondary)", borderStyle: "dashed" }}
                    >
                      <Settings size={15} style={{ color: "var(--primary)" }} />
                      {isValidConfig ? "Change Firebase Connection" : "Connect Firebase Database"}
                    </button>
                  </div>

                  {isDemoMode && (
                    <div style={demoWarningStyle}>
                      <Database size={13} />
                      <span>Preview Environment Active (Offline Mode) — connect Firebase above</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        ) : view === "student" ? (
          // STUDENT DASHBOARD VIEW
          <motion.div
            key="student-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StudentDashboard 
              user={user} 
              onLogout={handleLogout} 
            />
            {/* If user is Admin, show floating button to access Admin Console */}
            {isAdmin && (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setView("admin")}
                style={floatingAdminBtnStyle}
                className="btn btn-accent"
              >
                <ShieldCheck size={18} />
                Admin Dashboard
              </motion.button>
            )}
          </motion.div>
        ) : (
          // ADMIN DASHBOARD VIEW
          <motion.div
            key="admin-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AdminDashboard onBack={() => setView("student")} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Firebase Config Modal — always accessible */}
      <FirebaseConfigModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
      />

      {/* Embedded CSS class styling tricks for uploader */}
      <style dangerouslySetInnerHTML={{__html: `
        .spin {
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />


    </div>
  );
}

// Styling definitions for App.jsx
const spinnerOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  background: "rgba(244, 247, 251, 0.94)",
  backdropFilter: "blur(12px)",
};

const loginWrapperStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1.5rem",
};

const loginCardStyle = {
  width: "100%",
  maxWidth: "460px",
  padding: "2.75rem 2.25rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1.5rem",
  textAlign: "center",
};

const logoWrapperStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  marginBottom: "0.5rem",
};

const logoIconStyle = {
  width: "48px",
  height: "48px",
  borderRadius: "var(--radius-md)",
  background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.5rem",
  fontWeight: 800,
  color: "white",
  boxShadow: "0 6px 18px rgba(10, 45, 84, 0.25)",
};

const titleStyle = {
  fontSize: "1.4rem",
  fontWeight: 800,
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
  textAlign: "left",
  fontFamily: "var(--font-classical)",
  color: "var(--primary)",
};

const subtitleStyle = {
  display: "block",
  fontSize: "0.75rem",
  color: "var(--text-secondary)",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  textAlign: "left",
};

const welcomeBoxStyle = {
  display: "flex",
  gap: "0.85rem",
  padding: "1.1rem",
  background: "linear-gradient(135deg, rgba(10, 45, 84, 0.04) 0%, rgba(197, 155, 39, 0.08) 100%)",
  border: "1px solid rgba(197, 155, 39, 0.25)",
  borderRadius: "var(--radius-md)",
  textAlign: "left",
};

const loginBtnStyle = {
  width: "100%",
  padding: "0.9rem 1.5rem",
  fontSize: "1rem",
  fontWeight: 700,
};

const adminLoginBtnStyle = {
  width: "100%",
  padding: "0.85rem 1.5rem",
  fontSize: "0.95rem",
};

const dividerStyle = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  color: "var(--text-muted)",
  fontSize: "0.8rem",
  gap: "1rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  "&::before": {
    content: '""',
    flexGrow: 1,
    height: "1px",
    background: "rgba(10, 45, 84, 0.1)",
  },
  "&::after": {
    content: '""',
    flexGrow: 1,
    height: "1px",
    background: "rgba(10, 45, 84, 0.1)",
  },
};

const configBtnStyle = {
  width: "100%",
  padding: "0.6rem 1rem",
  fontSize: "0.8rem",
  gap: "0.4rem",
};

const demoWarningStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.45rem",
  fontSize: "0.72rem",
  color: "#92400e",
  background: "#fef3c7",
  border: "1px solid #fde68a",
  padding: "0.4rem 0.8rem",
  borderRadius: "6px",
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const floatingAdminBtnStyle = {
  position: "fixed",
  bottom: "2rem",
  right: "2rem",
  zIndex: 100,
  boxShadow: "0 12px 30px rgba(10, 45, 84, 0.25), 0 4px 12px rgba(197, 155, 39, 0.2)",
  borderRadius: "999px",
  padding: "0.85rem 1.5rem",
  fontSize: "0.88rem",
  fontWeight: 700,
};
