const CryptoJS = require("crypto-js");

// Encrypt Data
const encryptData = (data) => {
  try {
    const ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      process.env.ENCRYPTION_SECRET
    ).toString();

    return ciphertext;
  } catch (error) {
    throw new Error("Encryption failed: " + error.message);
  }
};

// Decrypt Data
const decryptData = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(
      ciphertext,
      process.env.ENCRYPTION_SECRET
    );

    const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decrypted;
  } catch (error) {
    throw new Error("Decryption failed: " + error.message);
  }
};

module.exports = {
  encryptData,
  decryptData,
};