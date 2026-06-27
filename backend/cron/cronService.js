import cron from 'node-cron';
import { ProjectModel } from '../models/projectModel.js';
// Import service yang baru kita buat
import * as notificationService from '../services/notificationService.js'; 

// Jalankan setiap hari jam 08:00 pagi
cron.schedule('0 8 * * *', async () => {
    console.log("Menjalankan pengecekan status proyek...");
    
    // Cari proyek yang sudah selesai atau telat
    const projects = await ProjectModel.find({ 
        status: { $in: ['done', 'late'] } 
    }).populate('owner'); // Pastikan Anda populate data user (pemilik)

    for (const project of projects) {
        // Panggil fungsi spesifik yang kita buat di notificationService
        await notificationService.sendProjectStatusNotification({
            userId: project.owner._id,
            email: project.owner.email,
            userName: project.owner.name,
            projectName: project.name,
            status: project.status
        });
        
        console.log(`Notifikasi terkirim untuk proyek: ${project.name}`);
    }
});