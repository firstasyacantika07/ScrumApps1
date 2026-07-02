const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');
const sprintReminderService = require('../cron/cronService');

// =============================================
// 1. GET NOTIFIKASI USER
// =============================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [notifications] = await db.query(
      `SELECT id, title, message, type, is_read as isRead, 
              DATE_FORMAT(created_at, '%d %b %Y, %H:%i') as time,
              created_at as createdAt
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
// 2. TANDAI SEMUA NOTIFIKASI SUDAH DIBACA
// =============================================
router.patch('/read-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(
      `UPDATE tbr_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    res.status(200).json({ success: true, message: "Semua notifikasi ditandai sudah dibaca" });
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    res.status(500).json({ success: false, message: "Gagal memperbarui status notifikasi" });
  }
});

// =============================================
// 2.1 TANDAI SATU NOTIFIKASI DIBACA
// =============================================
router.patch('/read/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await db.query(
      `UPDATE tbr_notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notifikasi tidak ditemukan" });
    }

    res.status(200).json({ success: true, message: "Notifikasi ditandai sudah dibaca" });
  } catch (err) {
    console.error("Error marking single notification as read:", err);
    res.status(500).json({ success: false, message: "Gagal memperbarui status notifikasi" });
  }
});

// =============================================
// 3. TRIGGER SPRINT REMINDER MANUAL (RF-14.1)
//    Sekarang cocok dengan export sprintReminderService.js
// =============================================
router.post('/trigger-sprint-check', verifyToken, async (req, res) => {
  try {
    console.log('⏰ Menjalankan trigger sprint check manual...');
    const count = await sprintReminderService.checkAndSendReminders();

    res.status(200).json({
      success: true,
      message: `Pengecekan sprint selesai. ${count} notifikasi dikirim.`,
      count,
    });
  } catch (error) {
    console.error('❌ Error triggering sprint check:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menjalankan pengecekan sprint',
      error: error.message,
    });
  }
});

// =============================================
// 4. FITUR PENGUJIAN EMAIL (TESTING)
// =============================================
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email tujuan diperlukan" });

    await sendEmail(
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