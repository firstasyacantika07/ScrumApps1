const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hanisetyautami@gmail.com",
    pass: "huxzuppnnouprwns", // Pastikan ini adalah App Password dari Google
  },
});

/**
 * Fungsi kirim email general
 * @param {string} to - Email penerima
 * @param {string} subject - Subjek email
 * @param {string} htmlContent - Template HTML email
 */
exports.sendEmail = async (to, subject, htmlContent) => {
  try {
    const info = await transporter.sendMail({
      from: '"ScrumApps Notification" <no-reply@scrumapps.com>',
      to: to,
      subject: subject,
      html: htmlContent, // Gunakan HTML agar bisa seperti contoh screenshot
    });
    console.log("Email berhasil dikirim ke:", to, info.messageId);
  } catch (error) {
    console.error("Gagal mengirim email:", error);
  }
};