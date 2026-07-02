const nodemailer = require("nodemailer");

// Konfigurasi SMTP
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Mengirim email
 * @param {String} toEmail
 * @param {String} subject
 * @param {String} html
 */
const sendEmail = async (toEmail, subject, html) => {
    try {

        const mailOptions = {
            from: `"ScrumApps Notification" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("====================================");
        console.log("EMAIL BERHASIL DIKIRIM");
        console.log("Kepada :", toEmail);
        console.log("Subject :", subject);
        console.log("Message ID :", info.messageId);
        console.log("====================================");

        return true;

    } catch (err) {

        console.error("EMAIL GAGAL DIKIRIM");
        console.error(err);

        return false;

    }
};

module.exports = {
    sendEmail
};