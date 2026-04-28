// encryption.js
import CryptoJS from "crypto-js";

/**
 * Encrypt data using AES
 * @param {string|Object} data - String or JSON object to encrypt
 * @param {string} secretKey - Secret key for encryption
 * @returns {string} - Encrypted string
 */
export const encryptData = (data, secretKey) => {
  try {
    const stringData = typeof data === "string" ? data : JSON.stringify(data);
    const ciphertext = CryptoJS.AES.encrypt(stringData, secretKey).toString();
    return ciphertext;
  } catch (error) {
    console.error("Encryption Error:", error);
    throw error;
  }
};

/**
 * Decrypt AES-encrypted data
 * @param {string} ciphertext - Encrypted string
 * @param {string} secretKey - Secret key used for encryption
 * @returns {string|Object} - Decrypted string or parsed JSON object
 */
export const decryptData = (ciphertext, secretKey) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    // Try to parse JSON, if fails return string
    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  } catch (error) {
    console.error("Decryption Error:", error);
    throw error;
  }
};

/**
 * Generate a random secret key
 * @param {number} length - Key length in characters
 * @returns {string} - Randomly generated key
 */
export const generateSecretKey = (length = 32) => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < length; i++) {
    key += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return key;
};

/**
 * Generate a cryptographically secure random key using Web Crypto API
 * @param {number} bytes - Key length in bytes (default 32 for AES-256)
 * @returns {string} - Hex-encoded random key
 */
export const generateSecureKey = (bytes = 32) => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Generate a random initialization vector (IV)
 * @param {number} bytes - IV length in bytes (default 16 for AES)
 * @returns {string} - Hex-encoded IV
 */
export const generateIV = (bytes = 16) => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Convert a File to ArrayBuffer
 * @param {File} file - File object
 * @returns {Promise<ArrayBuffer>}
 */
export const fileToArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Convert ArrayBuffer to Base64 string
 * @param {ArrayBuffer} buffer - ArrayBuffer to convert
 * @returns {string} - Base64 encoded string
 */
export const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Convert Base64 string to ArrayBuffer
 * @param {string} base64 - Base64 encoded string
 * @returns {ArrayBuffer}
 */
export const base64ToArrayBuffer = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Encrypt a file using AES-256 with CryptoJS
 * Creates a symmetric key, encrypts the file, and returns both
 * @param {File} file - File to encrypt
 * @returns {Promise<{encryptedBlob: Blob, symmetricKey: string, iv: string, originalName: string, originalSize: number, mimeType: string}>}
 */
export const encryptFile = async (file) => {
  try {
    // Generate a random symmetric key and IV
    const symmetricKey = generateSecureKey(32);
    const iv = generateIV(16);

    // Read file as ArrayBuffer
    const arrayBuffer = await fileToArrayBuffer(file);
    
    // Convert to WordArray for CryptoJS
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    
    // Convert key and IV to WordArray
    const keyWordArray = CryptoJS.enc.Hex.parse(symmetricKey);
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);

    // Encrypt using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(wordArray, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Convert encrypted data to Blob
    const encryptedBase64 = encrypted.toString();
    const encryptedBlob = new Blob([encryptedBase64], {
      type: "application/octet-stream",
    });

    return {
      encryptedBlob,
      symmetricKey,
      iv,
      originalName: file.name,
      originalSize: file.size,
      mimeType: file.type,
    };
  } catch (error) {
    console.error("File Encryption Error:", error);
    throw new Error("Failed to encrypt file: " + error.message);
  }
};

/**
 * Decrypt an encrypted file using AES-256
 * @param {Blob|string} encryptedData - Encrypted blob or base64 string
 * @param {string} symmetricKey - Hex-encoded symmetric key
 * @param {string} iv - Hex-encoded initialization vector
 * @param {string} mimeType - Original MIME type of the file
 * @returns {Promise<Blob>} - Decrypted file blob
 */
export const decryptFile = async (encryptedData, symmetricKey, iv, mimeType = "application/octet-stream") => {
  try {
    // Get encrypted string
    let encryptedString;
    if (encryptedData instanceof Blob) {
      encryptedString = await encryptedData.text();
    } else {
      encryptedString = encryptedData;
    }

    // Convert key and IV to WordArray
    const keyWordArray = CryptoJS.enc.Hex.parse(symmetricKey);
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedString, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Convert WordArray to ArrayBuffer
    const decryptedWords = decrypted.words;
    const decryptedSigBytes = decrypted.sigBytes;
    const arrayBuffer = new ArrayBuffer(decryptedSigBytes);
    const dataView = new DataView(arrayBuffer);
    
    for (let i = 0; i < decryptedSigBytes; i++) {
      dataView.setUint8(i, (decryptedWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
    }

    return new Blob([arrayBuffer], { type: mimeType });
  } catch (error) {
    console.error("File Decryption Error:", error);
    throw new Error("Failed to decrypt file: " + error.message);
  }
};

/**
 * Create a downloadable link for a blob
 * @param {Blob} blob - File blob
 * @param {string} filename - Name for the downloaded file
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};