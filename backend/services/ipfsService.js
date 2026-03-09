const FormData = require("form-data");
const http = require("http");

const IPFS_API_HOST = process.env.IPFS_API_HOST || "127.0.0.1";
const IPFS_API_PORT = process.env.IPFS_API_PORT || 5001;

/**
 * Upload JSON data to IPFS
 * @param {Object} data - JSON data to upload
 * @returns {Promise<string>} IPFS hash
 */
const uploadToIPFS = (data) => {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", Buffer.from(JSON.stringify(data)), {
      filename: "data.json",
      contentType: "application/json",
    });

    const options = {
      hostname: IPFS_API_HOST,
      port: IPFS_API_PORT,
      path: "/api/v0/add",
      method: "POST",
      headers: form.getHeaders(),
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(body);
            resolve(result.Hash);
          } catch (e) {
            reject(new Error("IPFS response parse failed: " + body));
          }
        } else {
          reject(new Error(`IPFS returned ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", (e) => reject(new Error("IPFS upload failed: " + e.message)));
    form.pipe(req);
  });
};

/**
 * Upload a file buffer to IPFS
 * @param {Buffer} buffer - File buffer to upload
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<{hash: string, size: number}>} IPFS hash and file size
 */
const uploadFileToIPFS = (buffer, filename, mimeType) => {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", buffer, {
      filename: filename || "file",
      contentType: mimeType || "application/octet-stream",
    });

    const options = {
      hostname: IPFS_API_HOST,
      port: IPFS_API_PORT,
      path: "/api/v0/add",
      method: "POST",
      headers: form.getHeaders(),
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(body);
            resolve({
              hash: result.Hash,
              size: parseInt(result.Size, 10) || buffer.length,
              name: result.Name,
            });
          } catch (e) {
            reject(new Error("IPFS response parse failed: " + body));
          }
        } else {
          reject(new Error(`IPFS returned ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", (e) => reject(new Error("IPFS file upload failed: " + e.message)));
    form.pipe(req);
  });
};

/**
 * Get data from IPFS (for JSON files)
 * @param {string} hash - IPFS hash
 * @returns {Promise<Object>} Parsed JSON data
 */
const getFromIPFS = (hash) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: IPFS_API_HOST,
      port: IPFS_API_PORT,
      path: `/api/v0/cat?arg=${hash}`,
      method: "POST",
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error("IPFS data parse failed"));
          }
        } else {
          reject(new Error(`IPFS returned ${res.statusCode}`));
        }
      });
    });

    req.on("error", (e) => reject(new Error("IPFS fetch failed: " + e.message)));
    req.end();
  });
};

/**
 * Get raw file buffer from IPFS
 * @param {string} hash - IPFS hash
 * @returns {Promise<Buffer>} File buffer
 */
const getFileFromIPFS = (hash) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: IPFS_API_HOST,
      port: IPFS_API_PORT,
      path: `/api/v0/cat?arg=${hash}`,
      method: "POST",
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`IPFS returned ${res.statusCode}`));
        }
      });
    });

    req.on("error", (e) => reject(new Error("IPFS file fetch failed: " + e.message)));
    req.end();
  });
};

/**
 * Check if IPFS node is available
 * @returns {Promise<boolean>}
 */
const checkIPFSHealth = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: IPFS_API_HOST,
      port: IPFS_API_PORT,
      path: "/api/v0/version",
      method: "POST",
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve(res.statusCode === 200);
      });
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
};

module.exports = {
  uploadToIPFS,
  uploadFileToIPFS,
  getFromIPFS,
  getFileFromIPFS,
  checkIPFSHealth,
  IPFS_API_HOST,
  IPFS_API_PORT,
};