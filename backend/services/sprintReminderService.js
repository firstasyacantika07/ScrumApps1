const db = require('../config/db');
const emailService = require('./emailService');

/**
 * Service untuk mengecek deadline sprint dan mengirim notifikasi
 * RF-14: Product Owner menerima notifikasi pengingat sprint
 */
class SprintReminderService {
  /**
   * RF-14.1: Mengecek sprint yang deadline-nya kurang dari 3 hari
   * dan mengirim notifikasi ke Product Owner
   */
  async checkAndSendReminders() {
    try {
      console.log('🔍 Memeriksa deadline sprint (RF-14.1)...');
      
      // Query untuk mendapatkan sprint yang deadline dalam 3 hari
      const [sprints] = await db.query(
        `SELECT s.*, p.name as project_name, p.id as project_id,
                u.id as user_id, u.email, u.username,
                DATEDIFF(s.deadline, NOW()) as days_left
         FROM tbr_sprints s
         JOIN tbr_projects p ON s.project_id = p.id
         JOIN tbr_project_members pm ON p.id = pm.project_id
         JOIN tbr_users u ON pm.user_id = u.id
         WHERE s.deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
         AND s.status != 'completed'
         AND pm.role = 'product_owner'
         GROUP BY s.id, u.id`
      );

      if (sprints.length === 0) {
        console.log('✅ Tidak ada sprint yang mendekati deadline.');
        return 0;
      }

      console.log(`📧 Mengirim ${sprints.length} notifikasi sprint (RF-14.1)...`);

      // Kirim email untuk setiap sprint
      const sentCount = 0;
      for (const sprint of sprints) {
        await this.sendSprintReminder(sprint);
      }

      console.log(`✅ Berhasil mengirim notifikasi sprint.`);
      return sprints.length;

    } catch (error) {
      console.error('❌ Error dalam sprint reminder:', error);
      throw error;
    }
  }

  /**
   * RF-14.1: Mengirim email reminder untuk satu sprint ke Product Owner
   */
  async sendSprintReminder(sprint) {
    try {
      const daysLeft = Math.ceil(sprint.days_left);
      
      // Kirim email ke Product Owner
      await emailService.sendSprintReminder({
        to: sprint.email,
        userName: sprint.username || 'Product Owner',
        sprintName: sprint.name,
        deadline: sprint.deadline,
        projectName: sprint.project_name,
        daysLeft: daysLeft
      });
      
      console.log(`✅ Email sprint reminder terkirim ke ${sprint.email} (${daysLeft} hari tersisa)`);

      // Tambahkan notifikasi ke database
      await db.query(
        `INSERT INTO tbr_notifications (user_id, message, type, created_at)
         VALUES (?, ?, 'sprint_reminder', NOW())`,
        [
          sprint.user_id,
          `Pengingat Sprint: "${sprint.name}" akan berakhir dalam ${daysLeft} hari (${new Date(sprint.deadline).toLocaleDateString('id-ID')})`
        ]
      );

    } catch (error) {
      console.error(`❌ Gagal kirim reminder untuk sprint ${sprint.name}:`, error);
    }
  }

  /**
   * RF-14.1: Mengecek sprint tertentu dan mengirim reminder
   */
  async sendReminderForSprint(sprintId) {
    try {
      const [sprints] = await db.query(
        `SELECT s.*, p.name as project_name, p.id as project_id,
                u.id as user_id, u.email, u.username,
                DATEDIFF(s.deadline, NOW()) as days_left
         FROM tbr_sprints s
         JOIN tbr_projects p ON s.project_id = p.id
         JOIN tbr_project_members pm ON p.id = pm.project_id
         JOIN tbr_users u ON pm.user_id = u.id
         WHERE s.id = ?
         AND pm.role = 'product_owner'
         GROUP BY s.id, u.id`,
        [sprintId]
      );

      if (sprints.length === 0) {
        throw new Error('Sprint tidak ditemukan atau tidak ada Product Owner');
      }

      for (const sprint of sprints) {
        await this.sendSprintReminder(sprint);
      }
      return true;

    } catch (error) {
      console.error('❌ Gagal kirim reminder sprint:', error);
      throw error;
    }
  }

  /**
   * RF-14.1: Cek dan kirim reminder untuk semua sprint yang akan berakhir
   * (Dipanggil oleh cron job)
   */
  async checkSprintDeadlines() {
    return await this.checkAndSendReminders();
  }
}

module.exports = new SprintReminderService();