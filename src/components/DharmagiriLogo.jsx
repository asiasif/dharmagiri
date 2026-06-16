import React from "react";

export default function DharmagiriLogo({ size = 40, showText = true, textColor = "var(--text-primary)", alignment = "row" }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: alignment === "column" ? "column" : "row",
      alignItems: "center",
      gap: "0.75rem",
      textAlign: alignment === "column" ? "center" : "left"
    }}>
      {/* Scalable SVG Vector Logo Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Outer Grey/Silver Border */}
        <circle cx="50" cy="50" r="44" stroke="#94a3b8" strokeWidth="4.5" fill="none" />
        
        {/* Styled letter "D" in Teal (#007a8c) */}
        <path
          d="M 32 23 L 53 23 C 68 23 78 33 78 50 C 78 67 68 77 53 77 L 32 77 Z"
          fill="#007a8c"
        />
        
        {/* White Mortarboard Cap Diamond */}
        <path
          d="M 54 39 L 75 48 L 54 57 L 33 48 Z"
          fill="#ffffff"
        />
        
        {/* Cap skull under-base */}
        <path
          d="M 44 51 L 44 59 C 44 59, 54 65, 64 59 L 64 51 Z"
          fill="#ffffff"
        />
        
        {/* Mortarboard Tassel in Yellow/Gold */}
        <path
          d="M 54 48 C 45 46, 38 48, 30 52 L 27 67"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Tassel Droplet */}
        <circle cx="27" cy="69" r="2.5" fill="#f59e0b" />
      </svg>

      {/* College Branding Text (Responsive & Modular) */}
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
          <span style={{
            fontSize: size > 50 ? "1.3rem" : "1.05rem",
            fontWeight: 800,
            color: "#007a8c",
            fontFamily: "var(--font-primary)",
            lineHeight: 1.1,
            letterSpacing: "-0.01em"
          }}>
            Dharmagiri College
          </span>
          <span className="logo-subtext" style={{
            fontSize: size > 50 ? "0.85rem" : "0.7rem",
            color: "var(--text-secondary)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            of Arts and Science
          </span>
          {size > 50 && (
            <span style={{
              fontSize: "0.6rem",
              color: "var(--text-muted)",
              marginTop: "0.15rem",
              fontWeight: 500
            }}>
              Affiliated to Calicut University • Approved by AICTE
            </span>
          )}
        </div>
      )}
    </div>
  );
}
