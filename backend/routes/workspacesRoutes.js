const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController'); // Sesuaikan huruf besar/kecil folder
const authMiddleware = require('../middleware/authMiddleware'); // Middleware cek login admin

// Route untuk mengirim email undangan
router.post('/invitations', authMiddleware, invitationController.inviteUser);

module.exports = router;