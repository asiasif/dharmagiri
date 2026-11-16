import React from "react";

export default function DharmagiriLogo({ 
  size = 44, 
  showText = true, 
  textColor = "var(--text-primary)", 
  alignment = "row" 
}) {
  return (
    <div 
      style={{
        display: "flex",
        flexDirection: alignment === "column" ? "column" : "row",
        alignItems: "center",
        gap: alignment === "column" ? "0.6rem" : "0.85rem",
        textAlign: alignment === "column" ? "center" : "left",
      }}
    >
      {/* High-Fidelity Classical Collegiate Vector Crest */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ 
          flexShrink: 0,
          filter: "drop-shadow(0 4px 8px rgba(10, 45, 84, 0.18))"
        }}
      >
        <defs>
          <linearGradient id="crestBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d3b6e" />
            <stop offset="100%" stopColor="#061a33" />
          </linearGradient>
          <linearGradient id="goldRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f7d070" />
            <stop offset="50%" stopColor="#c59b27" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
        </defs>

        {/* Outer Classical Burnished Gold Border */}
        <circle cx="50" cy="50" r="47" stroke="url(#goldRingGrad)" strokeWidth="2.5" fill="none" />
        
        {/* Deep Oxford Navy Blue Emblem Disk */}
        <circle cx="50" cy="50" r="43.5" fill="url(#crestBlueGrad)" />
        
        {/* Inner Delicate Concentric Ring */}
        <circle cx="50" cy="50" r="39.5" stroke="rgba(247, 208, 112, 0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />
        
        {/* Classical Monogram "D" in Sculpted Golden Ivory */}
        <path
          d="M 33 24 L 54 24 C 69 24 79 34 79 50 C 79 66 69 76 54 76 L 33 76 Z"
          fill="none"
          stroke="url(#goldRingGrad)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        
        {/* White Mortarboard / Knowledge Cap Diamond */}
        <path
          d="M 54 38 L 74 47 L 54 56 L 34 47 Z"
          fill="#ffffff"
        />
        
        {/* Cap skull under-base in crisp white */}
        <path
          d="M 44 50 L 44 58 C 44 58, 54 64, 64 58 L 64 50 Z"
          fill="#ffffff"
        />
        
        {/* Mortarboard Golden Tassel */}
        <path
          d="M 54 47 C 46 45, 38 47, 29 52 L 26 66"
          stroke="#f7d070"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Golden Tassel Droplet */}
        <circle cx="26" cy="68" r="2.8" fill="#f7d070" />
        
        {/* Classical Central Star / Light of Knowledge */}
        <polygon 
          points="54,29 55.5,33 59.5,33 56,35.5 57.5,39.5 54,37 50.5,39.5 52,35.5 48.5,33 52.5,33" 
          fill="#f7d070" 
        />
      </svg>

      {/* College Classical Branding Text */}
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <span 
            style={{
              fontSize: size > 50 ? "1.35rem" : "1.08rem",
              fontWeight: 800,
              color: "var(--primary)",
              fontFamily: "var(--font-classical)",
              letterSpacing: "0.03em",
              lineHeight: 1.15,
              textTransform: "uppercase"
            }}
          >
            Dharmagiri College
          </span>
          <span 
            className="logo-subtext" 
            style={{
              fontSize: size > 50 ? "0.82rem" : "0.72rem",
              color: "var(--text-secondary)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "var(--font-primary)"
            }}
          >
            Of Arts and Science
          </span>
          {size > 50 && (
            <span 
              style={{
                fontSize: "0.68rem",
                color: "#78716c",
                marginTop: "0.2rem",
                fontWeight: 600,
                letterSpacing: "0.02em"
              }}
            >
              Lakkidipperur, Cherupulassery • Affiliated to Calicut University
            </span>
          )}
        </div>
      )}
    </div>
  );
}
