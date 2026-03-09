import React from "react";

function Footer() {
  const footerStyle = {
    background: "linear-gradient(135deg, #1a1c2c 0%, #2d3561 100%)",
    padding: "20px 32px",
    textAlign: "center",
    marginTop: "auto",
  };

  const textStyle = {
    color: "rgba(255, 255, 255, 0.8)",
    margin: 0,
    fontSize: "0.9rem",
    fontWeight: "500",
  };

  const highlightStyle = {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    fontWeight: "700",
  };

  return (
    <footer style={footerStyle}>
      <p style={textStyle}>
        © 2026 <span style={highlightStyle}>MediVault</span> - Secure Medical Storage
      </p>
    </footer>
  );
}

export default Footer;