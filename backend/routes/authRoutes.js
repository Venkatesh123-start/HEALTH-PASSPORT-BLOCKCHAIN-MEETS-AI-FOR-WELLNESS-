const express = require("express");
const router = express.Router();
const { login } = require("../controllers/authController");
router.post("/login", login);
// router.post("/register", register);
// router.get("/profile", getProfile);
// router.patch("/profile", updateProfile);
// router.patch("/change-password", changePassword);



module.exports = router;