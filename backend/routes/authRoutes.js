const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

// ======================
// LOGIN
// ======================
router.post("/login", (req, res, next) => {
  if (!authController?.login) {
    return res.status(500).json({
      success: false,
      message: "authController.login tidak ditemukan",
    });
  }

  return authController.login(req, res, next);
});

// ======================
// GET CURRENT USER
// ======================
router.get("/me", verifyToken, (req, res, next) => {
  if (!authController?.getMe) {
    return res.status(500).json({
      success: false,
      message: "authController.getMe tidak ditemukan",
    });
  }

  return authController.getMe(req, res, next);
});

module.exports = router;