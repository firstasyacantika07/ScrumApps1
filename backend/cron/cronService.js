const cron = require('node-cron');
const db = require('../config/db');
const notificationService = require('../services/notificationService');

/**
 * PENTING: Ini SATU-SATUNYA file cron untuk pengingat sprint (RF-14.1 & 14.2).
 * File ini menggantikan cronService.js, sprintReminder.js, dan sprintReminderService.js.
 * Ketiga file lama mendaftarkan jadwal '0 8 * * *' yang sama persis, sehingga setiap
 * Project Owner menerima 3 email/notifikasi duplikat setiap pagi. Hapus ketiga file
 * lama tersebut (atau hentikan require-nya di app.js/server.js) setelah memakai file ini.
 */

const runSprintReminderJob = async () => {
  try {
    const [sprints] = await db.query(`
      SELECT
        s.name as sprint_name,
        s.end_date,
        p.name as project_name,
        p.id as project_id,
        u.id as user_id,
        u.name as user_name,
        u.email
      FROM tbr_sprints s
      JOIN tbr_projects p ON s.project_id = p.id
      JOIN tbr_project_members pm ON p.id = pm.project_id
      JOIN tbr_users u ON pm.user_id = u.id
      WHERE pm.role_in_project = 'ProjectOwner'
      AND DATEDIFF(s.end_date, NOW()) <= 3
      AND DATEDIFF(s.end_date, NOW()) >= 0
    `);

    for (const item of sprints) {
      const daysLeft = notificationService.getDaysLeft(item.end_date);

      await notificationService.sendSprintReminderNotification({
        userId: item.user_id,
        projectId: item.project_id,
        email: item.email,
        userName: item.user_name,
        projectName: item.project_name,
        sprintName: item.sprint_name,
        daysLeft
      });
    }
  } catch (err) {
    console.error('[Sprint Reminder Cron Error]:', err.message);
  }
};

const startCronJobs = () => {
  // Setiap hari jam 08:00
  cron.schedule('0 8 * * *', runSprintReminderJob);
};

module.exports = { startCronJobs, runSprintReminderJob };