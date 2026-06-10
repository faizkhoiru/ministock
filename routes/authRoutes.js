const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Jalur: /api/auth/login
router.post("/login", authController.login);
// Jalur: /api/auth/register
router.post("/register", authController.register);

module.exports = router;
