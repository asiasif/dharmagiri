import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Calendar, Clock, LogOut, BookOpen, AlertTriangle, User, Compass, HelpCircle, Megaphone, X, Pin, Star } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, isValidConfig } from "../firebase";
import DharmagiriLogo from "./DharmagiriLogo";
import AnimatedText from "./AnimatedText";
import confetti from "canvas-confetti";

// Demo fallback data if Firebase is not configured or database is empty
const MOCK_STUDENTS = [
  {
    registerNumber: "230104889",
    name: "Aravind Sharma",
    course: "MCS-024 (Object Oriented Technologies)",
    examDate: "2026-06-15",
    examTime: "10:00 AM - 01:00 PM",
    block: "Main Academic Block (Block A)",
    floor: "First Floor",
    roomNumber: "Room 104",
    seatNumber: "A-24",
  },
  {
    registerNumber: "230104990",
    name: "Sneha Patel",
    course: "MCS-012 (Computer Organisation)",
    examDate: "2026-06-16",
    examTime: "02:00 PM - 05:00 PM",
    block: "CV Raman Block (Block B)",
    floor: "Second Floor",
    roomNumber: "Room 208",
    seatNumber: "B-12",
  },
  {
    registerNumber: "230104991",
    name: "Rajesh Kumar",
    course: "MCS-021 (Data Structures)",
    examDate: "2026-06-15",
    examTime: "10:00 AM - 01:00 PM",
    block: "Main Academic Block (Block A)",
    floor: "Ground Floor",
    roomNumber: "Room 003",
    seatNumber: "G-05",
  }
];

// All possible floors and rooms for the Visual Location Helper
const CAMPUS_LAYOUT = [
  { floor: "Third Floor", rooms: ["Room 301", "Room 302", "Room 303", "Room 304", "Room 305"] },
  { floor: "Second Floor", rooms: ["Room 201", "Room 202", "Room 205", "Room 206", "Room 208"] },
  { floor: "First Floor", rooms: ["Room 101", "Room 102", "Room 103", "Room 104", "Room 105"] },
  { floor: "Ground Floor", rooms: ["Room 001", "Room 002", "Room 003", "Room 004", "Room 005"] },
];

export default function StudentDashboard({ user, onLogout }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(!isValidConfig);

  // Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("dismissedAnnouncements") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!isValidConfig || !db) return;
      try {
        const snap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Pinned first
        list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        setAnnouncements(list);
      } catch (e) {
        console.error("Announcements load error:", e);
      }
    };
    fetchAnnouncements();
  }, []);

  const dismissAnnouncement = (id) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    sessionStorage.setItem("dismissedAnnouncements", JSON.stringify(updated));
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);
    setStudentData(null);

    const formattedQuery = searchQuery.trim().toLowerCase();

    // 1. Search in Firebase (if configured)
    if (isValidConfig && db) {
      try {
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("registerNumberLower", "==", formattedQuery));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          setStudentData(docData);
          setLoading(false);
          // 🎉 Fire confetti on successful find
          setTimeout(() => {
            confetti({ particleCount: 120, spread: 90, origin: { y: 0.55 }, colors: ["#6366f1", "#14b8a6", "#f59e0b", "#a78bfa", "#34d399"] });
          }, 400);
          return;
        }
      } catch (err) {
        console.error("Firestore search error:", err);
      }
    }

    // 2. Fallback to Demo Data
    const localMatch = MOCK_STUDENTS.find(
      (s) => s.registerNumber.toLowerCase() === formattedQuery
    );
    
    if (localMatch) {
      setStudentData(localMatch);
      setIsDemoMode(true);
      setTimeout(() => {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.55 }, colors: ["#6366f1", "#14b8a6", "#f59e0b", "#a78bfa", "#34d399"] });
      }, 400);
    } else {
      setStudentData(null);
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      {/* Header bar */}
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <DharmagiriLogo size={42} showText={true} />
          <div style={{ height: "30px", width: "1px", background: "rgba(255,255,255,0.08)", margin: "0 0.25rem" }}></div>
          <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>IGNOU Center</span>
        </div>

        <div className="header-user-info">
          <div style={avatarWrapperStyle}>
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} style={avatarStyle} />
            ) : (
              <div style={avatarPlaceholderStyle}>
                <User size={16} />
              </div>
            )}
            <span className="header-username">
              {user.displayName?.split(" ")[0]}
            </span>
          </div>

          <button onClick={onLogout} className="btn btn-secondary" style={logoutBtnStyle} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <main style={mainContentStyle}>
        {/* Banner */}
        <div className="glass-panel shimmer-card dashboard-banner">
          <span style={pillBadgeStyle}>June 2026 Term End Exam</span>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.5rem", display: "flex", flexWrap: "wrap", rowGap: "0.1rem" }}>
            <AnimatedText text="Find Your" type="words" delay={0.15} style={{ marginRight: "0.28em" }} />
            <span className="gradient-text" style={{ marginRight: "0.28em" }}>
              <AnimatedText text="Exam Seating Arrangement" type="words" delay={0.35} />
            </span>
            <AnimatedText text="Instantly" type="words" delay={0.65} />
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.5rem", maxWidth: "600px" }}>
            Enter your 9 or 10-digit IGNOU enrollment/register number below to locate your exam room, floor, block, and seating details.
          </p>

          {!isValidConfig && (
            <div style={alertConfigStyle}>
              <AlertTriangle size={16} style={{ color: "var(--warning)", flexShrink: 0 }} />
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Firebase is not configured yet. Using offline demo mode. Enter <b>230104889</b>, <b>230104990</b> or <b>230104991</b> to test!
              </p>
            </div>
          )}
        </div>

        {/* Live Announcements Banner */}
        <AnimatePresence>
          {visibleAnnouncements.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0, overflow: "hidden" }}
              transition={{ delay: i * 0.08 }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem",
                padding: "0.9rem 1.1rem",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${
                  a.type === "warning" ? "rgba(245,158,11,0.35)"
                  : a.type === "success" ? "rgba(16,185,129,0.35)"
                  : "rgba(99,102,241,0.35)"
                }`,
                background: `${
                  a.type === "warning" ? "rgba(245,158,11,0.07)"
                  : a.type === "success" ? "rgba(16,185,129,0.07)"
                  : "rgba(99,102,241,0.07)"
                }`,
                boxShadow: a.pinned ? `0 0 18px ${
                  a.type === "warning" ? "rgba(245,158,11,0.12)"
                  : a.type === "success" ? "rgba(16,185,129,0.12)"
                  : "rgba(99,102,241,0.12)"
                }` : "none",
              }}
            >
              <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "0.05rem" }}>
                {a.type === "warning" ? "⚠️" : a.type === "success" ? "✅" : "📢"}
              </span>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.15rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{a.title}</span>
                  {a.pinned && (
                    <span style={{ fontSize: "0.68rem", background: "rgba(99,102,241,0.15)", color: "#a5b4fc", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>📌 Pinned</span>
                  )}
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>{a.body}</p>
              </div>
              <button
                onClick={() => dismissAnnouncement(a.id)}
                title="Dismiss"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.2rem", flexShrink: 0, marginTop: "0.1rem", display: "flex", alignItems: "center" }}
              >
                <X size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Search Box */}
        <div className="glass-panel" style={searchPanelStyle}>
          <form onSubmit={handleSearch} className="search-form-container">
            <div className="search-input-wrapper">
              <Search style={searchIconStyle} size={20} />
              <input
                type="text"
                placeholder="Enter Register Number (e.g. 230104889)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={searchInputStyle}
              />
            </div>
            <button type="submit" className="btn btn-primary search-submit-btn" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </div>

        {/* Search Results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={loaderStyle}
            >
              <div style={spinnerStyle}></div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Fetching seating arrangement...</p>
            </motion.div>
          )}

          {!loading && searched && studentData && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "1.5rem" }}
            >
              {/* Detailed Card */}
              <div className="seating-card shimmer-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <span style={cardPillStyle}>{studentData.course.split(" ")[0]}</span>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem" }}>{studentData.name}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Reg No: {studentData.registerNumber}</p>
                </div>

                <div style={dividerStyle}></div>

                <div style={infoGridStyle}>
                  <div style={infoItemStyle}>
                    <BookOpen size={18} style={{ color: "var(--primary)" }} />
                    <div>
                      <span style={infoLabelStyle}>Subject / Course</span>
                      <span style={infoValStyle}>{studentData.course}</span>
                    </div>
                  </div>

                  <div className="seating-info-row">
                    <div style={infoItemStyle}>
                      <Calendar size={18} style={{ color: "var(--secondary)" }} />
                      <div>
                        <span style={infoLabelStyle}>Exam Date</span>
                        <span style={infoValStyle}>{studentData.examDate}</span>
                      </div>
                    </div>

                    <div style={infoItemStyle}>
                      <Clock size={18} style={{ color: "var(--accent)" }} />
                      <div>
                        <span style={infoLabelStyle}>Exam Time</span>
                        <span style={infoValStyle}>{studentData.examTime}</span>
                      </div>
                    </div>
                  </div>

                  <div style={dividerStyle}></div>

                  <div style={infoItemStyle}>
                    <MapPin size={18} style={{ color: "var(--danger)" }} />
                    <div>
                      <span style={infoLabelStyle}>Block / Location</span>
                      <span style={infoValStyle} className="gradient-text-teal">{studentData.block}</span>
                    </div>
                  </div>

                  <div className="seating-info-row">
                    <div style={infoItemStyle}>
                      <Compass size={18} style={{ color: "var(--primary)" }} />
                      <div>
                        <span style={infoLabelStyle}>Floor / Room</span>
                        <span style={{ ...infoValStyle, fontSize: "1.1rem", fontWeight: 700 }}>
                          {studentData.floor} - {studentData.roomNumber}
                        </span>
                      </div>
                    </div>

                    {studentData.seatNumber && (
                      <div style={infoItemStyle}>
                        <div style={seatIconStyle}>S</div>
                        <div>
                          <span style={infoLabelStyle}>Seat Number</span>
                          <span style={{ ...infoValStyle, fontSize: "1.1rem", fontWeight: 700, color: "var(--success)" }}>
                            {studentData.seatNumber}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isDemoMode && (
                  <div style={demoTagStyle}>
                    <span>Preview Dataset Result</span>
                  </div>
                )}
              </div>

              {/* Visual Floor Helper Map */}
              <div className="glass-panel shimmer-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Compass size={18} style={{ color: "var(--primary)" }} />
                    Indoor Floor Guide
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    Visual layout mapping out room location on the building grid.
                  </p>
                </div>

                <div className="map-visualizer" style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Building Layout</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600 }}>{studentData.block.split(" (")[0]}</span>
                  </div>
                  
                  <div className="floor-indicator">
                    {CAMPUS_LAYOUT.map((layout) => {
                      const isTargetFloor = studentData.floor.toLowerCase().trim() === layout.floor.toLowerCase().trim();
                      return (
                        <div key={layout.floor} className={`floor-row ${isTargetFloor ? "active" : ""}`}>
                          <span className="floor-label">{layout.floor.replace(" Floor", "")}</span>
                          <div className="floor-rooms">
                            {layout.rooms.map((room) => {
                              const isTargetRoom = isTargetFloor && studentData.roomNumber.toLowerCase().trim() === room.toLowerCase().trim();
                              return (
                                <span key={room} className={`room-badge ${isTargetRoom ? "active" : ""}`}>
                                  {room.replace("Room ", "")}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={directionsBoxStyle}>
                  <HelpCircle size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                    Directions: Take the stairs or elevator near the {studentData.block.includes("Main") ? "Main Reception" : "CV Raman Lawn"} to the {studentData.floor.toLowerCase()}. Locate Room {studentData.roomNumber.replace("Room ", "")} and look for seat {studentData.seatNumber || "number list"} on the room board.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* 🎉 All the Best Banner */}
          {!loading && searched && studentData && (
            <motion.div
              key="all-the-best"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.35 }}
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "var(--radius-lg)",
                padding: "2rem 1.5rem",
                textAlign: "center",
                background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(20,184,166,0.12) 50%, rgba(245,158,11,0.10) 100%)",
                border: "1px solid rgba(99,102,241,0.25)",
                boxShadow: "0 0 40px rgba(99,102,241,0.1), 0 0 80px rgba(20,184,166,0.06)",
              }}
            >
              {/* Shimmer sweep */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
                  pointerEvents: "none",
                }}
              />

              {/* Floating emoji row */}
              <div style={{ display: "flex", justifyContent: "center", gap: "0.6rem", marginBottom: "1rem", fontSize: "1.6rem" }}>
                {["🌟", "📚", "✨", "🎓", "✨", "📚", "🌟"].map((emoji, i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                    style={{ display: "inline-block" }}
                  >
                    {emoji}
                  </motion.span>
                ))}
              </div>

              {/* Main message */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                style={{
                  fontSize: "1.85rem",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(135deg, #a5b4fc 0%, #34d399 40%, #fbbf24 80%, #f472b6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  marginBottom: "0.5rem",
                  lineHeight: 1.2,
                }}
              >
                All The Best, {studentData.name.split(" ")[0]}! 🎉
              </motion.h3>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: "480px", margin: "0 auto" }}
              >
                You've got this! Stay calm, read each question carefully, and give it your best shot. 💪
                <br />
                <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>— Dharmagiri College IGNOU Center wishes you success!</span>
              </motion.p>

              {/* Pulse ring decoration */}
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "200px", height: "200px",
                  borderRadius: "50%",
                  border: "2px solid rgba(99,102,241,0.3)",
                  pointerEvents: "none",
                }}
              />
            </motion.div>
          )}

          {!loading && searched && !studentData && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-panel"
              style={notFoundStyle}
            >
              <AlertTriangle size={48} style={{ color: "var(--danger)", marginBottom: "1rem" }} />
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Register Number Not Found</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "400px", margin: "0 auto 1.5rem" }}>
                We couldn't find seating arrangements for register number <b style={{ color: "var(--text-primary)" }}>{searchQuery}</b>. Please ensure you typed it correctly.
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                <button onClick={() => setSearchQuery("")} className="btn btn-secondary">Clear</button>
                <a href="#helpdesk" className="btn btn-accent" style={{ fontSize: "0.85rem" }}>Go to Helpdesk</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer style={footerStyle}>
        <p>© 2026 Dharmagiri College Exam Seating Locator. All Rights Reserved.</p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
          For IGNOU Center assistance, contact the controller of exams office inside Block A.
        </p>
      </footer>
    </div>
  );
}

// Styling definitions for StudentDashboard
const containerStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "1rem 1.5rem 3rem",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  gap: "2rem",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: "1rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
};

const logoContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const logoIconStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "var(--radius-sm)",
  background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.2rem",
  fontWeight: 800,
  color: "white",
};

const userInfoStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const avatarWrapperStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid var(--border-light)",
  padding: "0.25rem 0.75rem 0.25rem 0.25rem",
  borderRadius: "30px",
};

const avatarStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
};

const avatarPlaceholderStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: "var(--primary-glow)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--primary)",
};

const logoutBtnStyle = {
  padding: "0.5rem",
  borderRadius: "50%",
  width: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const mainContentStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  flexGrow: 1,
};

const bannerStyle = {
  padding: "2rem",
  textAlign: "left",
  position: "relative",
  overflow: "hidden",
};

const pillBadgeStyle = {
  display: "inline-block",
  padding: "0.25rem 0.75rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  borderRadius: "30px",
  background: "rgba(99, 102, 241, 0.15)",
  border: "1px solid rgba(99, 102, 241, 0.3)",
  color: "#a5b4fc",
};

const alertConfigStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginTop: "1.25rem",
  padding: "0.75rem 1rem",
  background: "rgba(245, 158, 11, 0.06)",
  border: "1px solid rgba(245, 158, 11, 0.15)",
  borderRadius: "var(--radius-md)",
};

const configLinkStyle = {
  color: "var(--primary)",
  textDecoration: "underline",
  cursor: "pointer",
  fontWeight: 600,
};

const searchPanelStyle = {
  padding: "1rem",
};

const searchFormStyle = {
  display: "flex",
  gap: "1rem",
  flexWrap: "wrap",
};

const inputContainerStyle = {
  position: "relative",
  flexGrow: 1,
  minWidth: "260px",
};

const searchIconStyle = {
  position: "absolute",
  left: "1.2rem",
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--text-secondary)",
};

const searchInputStyle = {
  paddingLeft: "3.2rem",
};

const searchBtnStyle = {
  minWidth: "120px",
};

const loaderStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem",
  padding: "4rem 0",
};

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "4px solid rgba(99, 102, 241, 0.1)",
  borderTop: "4px solid var(--primary)",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

// Add standard inline CSS block animation trick or just use Framer Motion
const cardPillStyle = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid var(--border-light)",
  padding: "0.25rem 0.6rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  borderRadius: "4px",
  color: "var(--text-secondary)",
};

const dividerStyle = {
  height: "1px",
  background: "rgba(255, 255, 255, 0.05)",
  margin: "0.5rem 0",
};

const infoGridStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const infoItemStyle = {
  display: "flex",
  gap: "0.75rem",
  alignItems: "flex-start",
};

const infoGridRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "1rem",
};

const infoLabelStyle = {
  display: "block",
  fontSize: "0.75rem",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const infoValStyle = {
  display: "block",
  fontSize: "0.95rem",
  fontWeight: 500,
  color: "var(--text-primary)",
};

const seatIconStyle = {
  width: "18px",
  height: "18px",
  borderRadius: "4px",
  background: "rgba(16, 185, 129, 0.15)",
  color: "var(--success)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.75rem",
  fontWeight: 800,
};

const demoTagStyle = {
  alignSelf: "flex-start",
  padding: "0.25rem 0.5rem",
  background: "rgba(168, 85, 247, 0.12)",
  border: "1px solid rgba(168, 85, 247, 0.2)",
  color: "#d8b4fe",
  fontSize: "0.75rem",
  fontWeight: 600,
  borderRadius: "4px",
  marginTop: "0.5rem",
};

const directionsBoxStyle = {
  display: "flex",
  gap: "0.5rem",
  padding: "0.75rem",
  background: "rgba(255, 255, 255, 0.01)",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-md)",
};

const notFoundStyle = {
  textAlign: "center",
  padding: "4rem 2rem",
};

const footerStyle = {
  textAlign: "center",
  paddingTop: "2rem",
  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
};
