const CryptoJS = require("crypto-js");
const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";

// Encrypt Data (JSON / text)
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

// Decrypt Data (JSON / text)
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

// File encryption for raw buffers (Node crypto)
const encryptFile = (buffer, key, iv) => {
  try {
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(key, "hex"),
      Buffer.from(iv, "hex")
    );

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    return encrypted;
  } catch (error) {
    throw new Error("File encryption failed: " + error.message);
  }
};

// File decryption for raw buffers (Node crypto)
const decryptFile = (buffer, key, iv) => {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(key, "hex"),
      Buffer.from(iv, "hex")
    );

    const decrypted = Buffer.concat([decipher.update(buffer), decipher.final()]);

    return decrypted;
  } catch (error) {
    throw new Error("File decryption failed: " + error.message);
  }
};

module.exports = {
  encryptData,
  decryptData,
  encryptFile,
  decryptFile,
};







// const CryptoJS = require("crypto-js");
// const crypto = require("crypto");

// const ALGORITHM = "aes-256-cbc";

// // ---------------------------
// // TEXT / JSON ENCRYPTION
// // ---------------------------

// const encryptData = (data) => {
//   try {
//     const ciphertext = CryptoJS.AES.encrypt(
//       JSON.stringify(data),
//       process.env.ENCRYPTION_SECRET
//     ).toString();

//     return ciphertext;
//   } catch (error) {
//     throw new Error("Encryption failed: " + error.message);
//   }
// };

// const decryptData = (ciphertext) => {
//   try {
//     const bytes = CryptoJS.AES.decrypt(
//       ciphertext,
//       process.env.ENCRYPTION_SECRET
//     );

//     const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
//     return decrypted;
//   } catch (error) {
//     throw new Error("Decryption failed: " + error.message);
//   }
// };

// // ---------------------------
// // FILE ENCRYPTION (BUFFER)
// // ---------------------------

// const encryptFile = (buffer, key, iv) => {
//   try {
//     const cipher = crypto.createCipheriv(
//       ALGORITHM,
//       Buffer.from(key, "hex"),
//       Buffer.from(iv, "hex")
//     );

//     const encrypted = Buffer.concat([
//       cipher.update(buffer),
//       cipher.final(),
//     ]);

//     return encrypted;
//   } catch (error) {
//     throw new Error("File encryption failed: " + error.message);
//   }
// };

// const decryptFile = (buffer, key, iv) => {
//   try {
//     const decipher = crypto.createDecipheriv(
//       ALGORITHM,
//       Buffer.from(key, "hex"),
//       Buffer.from(iv, "hex")
//     );

//     const decrypted = Buffer.concat([
//       decipher.update(buffer),
//       decipher.final(),
//     ]);

//     return decrypted;
//   } catch (error) {
//     throw new Error("File decryption failed: " + error.message);
//   }
// };

// module.exports = {
//   encryptData,
//   decryptData,
//   encryptFile,
//   decryptFile,
// };