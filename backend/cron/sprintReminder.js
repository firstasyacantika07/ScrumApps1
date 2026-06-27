const db = require("../config/db");
const sendEmail = require("../services/emailService");

// Fungsi dipanggil oleh scheduler (cron)
module.exports = async () => {
  console.log("⏰ Menjalankan Sprint Reminder...");

  try {

    const [sprints] = await db.query(`
      SELECT
        s.id,
        s.name,
        s.end_date,
        p.name AS project_name,
        u.id AS user_id,
        u.name AS user_name,
        u.email
      FROM tbr_sprints s
      INNER JOIN tbr_projects p
        ON s.project_id = p.id
      INNER JOIN tbr_users u
        ON p.product_owner_id = u.id
      WHERE
        DATEDIFF(s.end_date, CURDATE()) BETWEEN 0 AND 3
        AND s.status != 'done'
    `);

    let totalSent = 0;

    for (const sprint of sprints) {

      const emailMessage = `
        <h2>Reminder Sprint</h2>

        <p>Halo ${sprint.user_name},</p>

        <p>
          Sprint <b>${sprint.name}</b>
          pada project
          <b>${sprint.project_name}</b>
          akan berakhir pada
          <b>${new Date(sprint.end_date).toLocaleDateString("id-ID")}</b>.
        </p>

        <p>
          Mohon segera melakukan review dan
          menyelesaikan backlog yang masih tersisa.
        </p>

        <br>
        <p>ScrumApps Notification System</p>
      `;

      // Kirim Email
      await sendEmail(
        sprint.email,
        `Reminder Sprint: ${sprint.name}`,
        emailMessage
      );

      // Simpan Notifikasi Dashboard
      await db.query(
        `
        INSERT INTO tbr_notifications
        (
          user_id,
          title,
          message,
          is_read,
          created_at,
          type
        )
        VALUES
        (?, ?, ?, 0, NOW(), ?)
        `,
        [
          sprint.user_id,
          "Reminder Sprint",
          `Sprint "${sprint.name}" akan berakhir pada ${new Date(
            sprint.end_date
          ).toLocaleDateString("id-ID")}`,
          "warning"
        ]
      );

      totalSent++;
    }

    console.log(
      `✅ Sprint Reminder selesai. ${totalSent} notifikasi dikirim.`
    );

  } catch (err) {

    console.error(
      "❌ Gagal menjalankan Sprint Reminder:",
      err.message
    );

  }
};