const express = require("express");
const router = express.Router();
const { login, updatePassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/login", login);
router.put("/update-password", protect, updatePassword);



module.exports = router;