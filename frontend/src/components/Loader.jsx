// Loader.jsx
import React from "react";

const Loader = () => {
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "200px",
    gap: "20px",
  };

  const spinnerStyle = {
    width: "50px",
    height: "50px",
    border: "4px solid rgba(59, 130, 246, 0.2)",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  const textStyle = {
    color: "#3b82f6",
    fontWeight: "600",
    fontSize: "1.1rem",
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={spinnerStyle}></div>
      <p style={textStyle}>Loading...</p>
    </div>
  );
};

export default Loader;
