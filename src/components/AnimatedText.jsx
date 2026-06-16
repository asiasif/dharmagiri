import React from "react";
import { motion } from "framer-motion";

export default function AnimatedText({ text, type = "words", delay = 0, className = "", style = {} }) {
  // Split the text into characters or words
  const items = type === "chars" ? Array.from(text) : text.split(" ");

  // Container variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: type === "chars" ? 0.02 : 0.06,
        delayChildren: delay,
      },
    },
  };

  // Character/word variants
  const childVariants = {
    hidden: {
      opacity: 0,
      y: "30%",
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 120,
      },
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 120,
      },
    },
  };

  return (
    <motion.span
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        justifyContent: "inherit",
        alignItems: "inherit",
        ...style
      }}
    >
      {items.map((item, index) => (
        <motion.span
          key={index}
          variants={childVariants}
          style={{
            display: "inline-block",
            marginRight: type === "chars" ? "0" : "0.28em",
            // Keep spaces visible if splitting by characters
            whiteSpace: type === "chars" && item === " " ? "pre" : "normal"
          }}
        >
          {item}
        </motion.span>
      ))}
    </motion.span>
  );
}
