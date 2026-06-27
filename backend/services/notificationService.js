const Notification = require('../models/notificationModel');
const sendEmail = require('./emailService');

/**
 * SERVICE NOTIFIKASI
 * Fokus: Menyimpan ke database (untuk ikon lonceng) 
 * dan mengirim email (sesuai kebutuhan bisnis)
 */

// 1. Notifikasi Proyek Baru (RF-13)
exports.sendProjectAddedNotification = async (data) => {
    await Notification.create({
        user: data.userId,
        title: "Proyek baru!",
        message: `${data.createdBy} telah menambahkan kamu ke proyek "${data.projectName}" sebagai ${data.role}.`,
        isRead: false
    });

    await sendEmail(data.email, "Kamu ditambahkan ke proyek", `Halo ${data.userName}, ${data.createdBy} telah menambahkan kamu ke proyek "${data.projectName}".`);
};

// 2. Notifikasi Proyek Dihapus (RF-13.2)
exports.sendProjectDeletedNotification = async (data) => {
    await Notification.create({
        user: data.userId,
        title: "Proyek dihapus",
        message: `Proyek "${data.projectName}" telah dihapus oleh ${data.deletedBy}.`,
        isRead: false
    });

    await sendEmail(data.email, `Proyek "${data.projectName}" telah dihapus`, `Halo ${data.userName}, proyek tersebut telah dihapus oleh ${data.deletedBy}.`);
};

// 3. Notifikasi Status Proyek (RF-04 - Done/Late)
exports.sendProjectStatusNotification = async (data) => {
    // Simpan ke DB agar muncul di lonceng (image_6d34a2.png)
    await Notification.create({
        user: data.userId,
        title: "Update Status Proyek",
        message: `Status proyek "${data.projectName}" sekarang adalah: ${data.status.toUpperCase()}.`,
        isRead: false
    });

    // Kirim Email
    await sendEmail(
        data.email, 
        `Pemberitahuan Status Proyek: ${data.projectName}`, 
        `Halo ${data.userName}, status proyek "${data.projectName}" telah berubah menjadi ${data.status}. Mohon segera dicek.`
    );
};

// 4. Notifikasi Pengingat Sprint (RF-14)
exports.sendSprintReminderNotification = async (data) => {
    await Notification.create({
        user: data.userId,
        title: "Pengingat Sprint",
        message: `Sprint proyek "${data.projectName}" akan berakhir dalam kurang dari 3 hari.`,
        isRead: false
    });

    await sendEmail(
        data.email, 
        `Pengingat Sprint: ${data.projectName}`, 
        `Halo ${data.userName}, tenggat waktu sprint "${data.projectName}" akan berakhir dalam 3 hari. Mohon selesaikan tugas Anda.`
    );
};