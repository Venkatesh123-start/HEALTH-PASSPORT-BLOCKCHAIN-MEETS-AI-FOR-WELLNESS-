// helpers.js

import { toast } from "react-toastify";

/**
 * Format timestamp to readable date string
 * @param {number|string} timestamp - UNIX timestamp or ISO string
 * @returns {string} - Formatted date e.g. "02 Mar 2026, 14:37"
 */
export const formatDate = (timestamp) => {
  const date = typeof timestamp === "number" ? new Date(timestamp * 1000) : new Date(timestamp);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Generate a random unique ID (for temporary keys, local state, etc.)
 * @param {number} length - Length of ID
 * @returns {string} - Random alphanumeric string
 */
export const generateId = (length = 10) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Display a toast notification
 * @param {string} message - Notification text
 * @param {"success"|"error"|"info"|"warn"} type - Type of notification
 */
export const notify = (message, type = "info") => {
  switch (type) {
    case "success":
      toast.success(message, { position: "top-right", autoClose: 3000 });
      break;
    case "error":
      toast.error(message, { position: "top-right", autoClose: 5000 });
      break;
    case "warn":
      toast.warn(message, { position: "top-right", autoClose: 4000 });
      break;
    default:
      toast.info(message, { position: "top-right", autoClose: 3000 });
  }
};

/**
 * Simple email validation
 * @param {string} email - Email string to validate
 * @returns {boolean} - true if valid
 */
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Capitalize first letter of a string
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert bytes to KB/MB
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  else return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};