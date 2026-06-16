import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Key, ShieldCheck, Sparkles, Database, Settings, RefreshCw, Eye, EyeOff } from "lucide-react";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db, isValidConfig, loginWithGoogle, logout } from "./firebase";

import StudentDashboard from "./components/StudentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import DharmagiriLogo from "./components/DharmagiriLogo";
import AnimatedText from "./components/AnimatedText";

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

  useEffect(() => {
    // Check if there is an active local admin session stored
    const savedAdmin = localStorage.getItem("adminSession");
    if (savedAdmin) {
      const u = JSON.parse(savedAdmin);
      setUser(u);
      setIsAdmin(true);
      setView("admin");
      setAuthLoading(false);
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

  const handleAdminCredentialsLogin = (e) => {
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
    } else {
      setLoginError("Invalid administrator credentials. Please try again.");
    }
  };

  return (
    <div className="app-container">
      {/* Background Animated Gradients & Orbs */}
      <div className="bg-glow-container">
        <div className="floating-orb-1"></div>
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
            <RefreshCw size={40} className="spin" style={{ color: "var(--primary)" }} />
            <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Verifying credentials...</p>
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", marginBottom: "0.5rem", width: "100%", textAlign: "center" }}>
                    <DharmagiriLogo size={52} alignment="column" />
                    <span style={subtitleStyle}>Administrator Portal</span>
                  </div>

                  <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Admin Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@dharmagiri.com"
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
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "var(--radius-md)",
                      color: "#fca5a5",
                      fontSize: "0.85rem",
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", marginBottom: "0.5rem" }}>
                    <DharmagiriLogo size={64} alignment="column" />
                    <span style={subtitleStyle}>IGNOU Center Help Desk</span>
                  </div>

                  <div style={welcomeBoxStyle}>
                    <Sparkles size={20} className="gradient-text" style={{ flexShrink: 0 }} />
                    <div>
                      <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                        <AnimatedText text="IGNOU Seating Locator" type="chars" delay={0.2} />
                      </h2>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        Scan the college gateway QR code, sign in with your Google account, and lookup your room arrangements instantly.
                      </p>
                    </div>
                  </div>

                  {/* Login actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
                    <button onClick={handleGoogleLogin} className="btn btn-primary" style={loginBtnStyle}>
                      <LogIn size={18} />
                      Sign In with Google
                    </button>

                    <button onClick={() => { setAdminLoginActive(true); setLoginError(""); }} className="btn btn-secondary" style={adminLoginBtnStyle}>
                      <ShieldCheck size={18} style={{ color: "var(--accent)" }} />
                      Access Admin Portal
                    </button>
                  </div>

                  {isDemoMode && (
                    <div style={demoWarningStyle}>
                      <Database size={12} />
                      <span>Preview Environment Active (Offline Mode)</span>
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
  background: "var(--bg-dark)",
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
  maxWidth: "440px",
  padding: "2.5rem",
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
  width: "44px",
  height: "44px",
  borderRadius: "var(--radius-md)",
  background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.5rem",
  fontWeight: 800,
  color: "white",
  boxShadow: "0 8px 16px rgba(99, 102, 241, 0.3)",
};

const titleStyle = {
  fontSize: "1.4rem",
  fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: 1.2,
  textAlign: "left",
};

const subtitleStyle = {
  display: "block",
  fontSize: "0.75rem",
  color: "var(--text-secondary)",
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  textAlign: "left",
};

const welcomeBoxStyle = {
  display: "flex",
  gap: "0.75rem",
  padding: "1rem",
  background: "rgba(99, 102, 241, 0.05)",
  border: "1px solid rgba(99, 102, 241, 0.12)",
  borderRadius: "var(--radius-md)",
  textAlign: "left",
};

const loginBtnStyle = {
  width: "100%",
  padding: "0.85rem 1.5rem",
  fontSize: "1rem",
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
    background: "rgba(255, 255, 255, 0.05)",
  },
  "&::after": {
    content: '""',
    flexGrow: 1,
    height: "1px",
    background: "rgba(255, 255, 255, 0.05)",
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
  gap: "0.4rem",
  fontSize: "0.7rem",
  color: "var(--secondary)",
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const floatingAdminBtnStyle = {
  position: "fixed",
  bottom: "2rem",
  right: "2rem",
  zIndex: 100,
  boxShadow: "0 10px 25px rgba(20, 184, 166, 0.4)",
  borderRadius: "30px",
  padding: "0.8rem 1.4rem",
  fontSize: "0.85rem",
};
