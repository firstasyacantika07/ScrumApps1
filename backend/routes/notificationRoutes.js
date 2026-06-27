const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const sprintReminderService = require('../services/sprintReminderService');

// =============================================
// 1. GET NOTIFIKASI USER
// =============================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [notifications] = await db.query(
      `SELECT id, message, type, is_read, 
              DATE_FORMAT(created_at, '%d %b %Y, %H:%i') as time,
              created_at
       FROM tbr_notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, message: "Gagal mengambil data notifikasi" });
  }
});

// =============================================
// 2. TRIGGER SPRINT REMINDER (RF-14.1)
// =============================================
router.post('/trigger-sprint-check', verifyToken, async (req, res) => {
  try {
    console.log('⏰ Menjalankan trigger sprint check...');
    const count = await sprintReminderService.checkAndSendReminders();
    
    res.status(200).json({
      success: true,
      message: `Pengecekan sprint selesai. ${count} notifikasi dikirim.`,
      count: count
    });
  } catch (error) {
    console.error('❌ Error triggering sprint check:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menjalankan pengecekan sprint',
      error: error.message
    });
  }
});

// =============================================
// 3. FITUR PENGUJIAN EMAIL (TESTING)
// =============================================
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email tujuan diperlukan" });

    await emailService.sendEmail(
        email, 
        "Tes Notifikasi ScrumApps", 
        "<h1>Berhasil!</h1><p>Sistem email Anda berfungsi dengan baik.</p>"
    );
    
    res.status(200).json({ success: true, message: "Email tes terkirim ke: " + email });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;