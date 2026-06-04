const db = require('../config/db');

/**
 * =========================================================================
 * GLOBAL HELPER: CREATING AUDIT LOGS AUTOMATICALLY
 * =========================================================================
 * Fungsi ini bertugas menginjeksikan riwayat aktivitas user langsung ke MySQL
 */
const createLog = async (userId, projectId, activityDescription) => {
  try {
    const sql = `
      INSERT INTO tbr_activity_logs (user_id, project_id, activity, created_at) 
      VALUES (?, ?, ?, NOW())
    `;
    await db.query(sql, [userId, projectId, activityDescription]);
    console.log(`[AUDIT LOG SUCCESS]: ${activityDescription}`);
  } catch (err) {
    // Log error di console server saja agar tidak merusak response utama ke client
    console.error("[AUDIT LOG ERROR]: Gagal menyimpan log aktivitas:", err.message);
  }
};

/**
 * ==========================================
 * 1. PROJECT CORE (CRUD & STATS)
 * ==========================================
 */

exports.createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role; // Ambil informasi role user dari enkripsi JWT Middleware

    // 🔥 PEMBARUAN PROTEKSI ROLE: Hanya tingkatan SUPERADMIN yang diizinkan memproses data baru
    if (userRole !== 'SUPERADMIN') {
      return res.status(403).json({ 
        message: "Akses Ditolak: Hanya akun dengan tingkatan SUPERADMIN yang memiliki hak akses untuk membuat proyek baru." 
      });
    }

    // Pengecekan limit paket tetap dipertahankan untuk skenario jika Superadmin mengelola batas kuota proyek berbasis ID pemilik
    const [userPlan] = await db.query(`SELECT package_type FROM tbr_users WHERE id = ?`, [userId]);
    const [projectCount] = await db.query(`SELECT COUNT(*) as total FROM tbr_projects WHERE user_id = ?`, [userId]);

    const packageType = userPlan[0]?.package_type || 'FREE';
    const currentTotal = projectCount[0]?.total || 0;

    if (packageType === 'FREE' && currentTotal >= 1) return res.status(403).json({ message: "Limit paket FREE tercapai." });
    if (packageType === 'PRO' && currentTotal >= 15) return res.status(403).json({ message: "Limit paket PRO tercapai." });

    const sql = `INSERT INTO tbr_projects (name, start_date, end_date, status, icon, label, user_id, \`read\`, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    const values = [req.body.name, req.body.start_date || null, req.body.end_date || null, req.body.status || 'hold', req.body.icon || 'ki-duotone ki-star', req.body.label || 'external', userId, 0];

    const [result] = await db.query(sql, values);
    
    // Catat aktivitas pembuatan proyek oleh Superadmin
    await createLog(userId, result.insertId, `[SUPERADMIN] Membuat proyek baru dengan nama: "${req.body.name}"`);

    res.status(201).json({ message: "Project created sukses oleh Admin", id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT p.* FROM tbr_projects p LEFT JOIN tbr_teams t ON p.id = t.project_id WHERE p.user_id = ? OR t.user_id = ? GROUP BY p.id ORDER BY p.created_at DESC`,
      [userId, userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getProjectById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.* FROM tbr_projects p LEFT JOIN tbr_teams t ON p.id = t.project_id WHERE p.id = ? AND (p.user_id = ? OR t.user_id = ?) GROUP BY p.id`,
      [req.params.id, req.user.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    
    await db.query(`UPDATE tbr_projects SET name=?, start_date=?, end_date=?, status=?, updated_at=NOW() WHERE id=? AND user_id=?`, [req.body.name, req.body.start_date, req.body.end_date, req.body.status, projectId, userId]);
    
    // Catat perubahan konfigurasi proyek
    await createLog(userId, projectId, `Memperbarui detail informasi atau konfigurasi proyek ke status: "${req.body.status}"`);

    res.json({ message: "Project updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    // Ambil info nama proyek sebelum dihapus untuk kepentingan deskripsi log audit
    const [projectInfo] = await db.query(`SELECT name FROM tbr_projects WHERE id = ?`, [projectId]);
    const projectName = projectInfo[0]?.name || "Unknown";

    await db.query(`DELETE FROM tbr_projects WHERE id=? AND user_id=?`, [projectId, userId]);
    
    // Catat log penghapusan proyek
    await createLog(userId, projectId, `Menghapus proyek "${projectName}" secara permanen dari sistem`);

    res.json({ message: "Project deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getProjectStats = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT status, COUNT(*) as total FROM tbr_projects WHERE user_id = ? GROUP BY status`, [req.user.id]);
    const result = {
      total: rows.reduce((a, b) => a + Number(b.total), 0),
      hold: rows.find(r => r.status === 'hold')?.total || 0,
      onProgress: rows.find(r => r.status === 'on_progress')?.total || 0,
      done: rows.find(r => r.status === 'done')?.total || 0,
    };
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/**
 * ==========================================
 * 2. DEVELOPMENT / TASK MANAGEMENT
 * ==========================================
 */

exports.getProjectDevelopments = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM tbr_developments WHERE project_id = ? ORDER BY created_at DESC`, [req.params.projectId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createDevelopment = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const { title, description, status, link } = req.body;
    
    const sql = `INSERT INTO tbr_developments (name, \`desc\`, status, link, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`;
    await db.query(sql, [title, description, status || 'todo', link || null, projectId]);
    
    // Catat log penambahan task baru
    await createLog(userId, projectId, `Menambahkan tugas pembangunan (Development Task) baru: "${title}"`);

    res.status(201).json({ message: "Task created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateDevelopmentStatus = async (req, res) => {
  try {
    const devId = req.params.devId;
    const { status } = req.body;
    const userId = req.user.id;

    // Ambil info task untuk log audit
    const [devInfo] = await db.query(`SELECT name, project_id FROM tbr_developments WHERE id = ?`, [devId]);
    if (devInfo.length > 0) {
      await db.query(`UPDATE tbr_developments SET status = ?, updated_at = NOW() WHERE id = ?`, [status, devId]);
      
      // Catat perpindahan kolom status pada Kanban board
      await createLog(userId, devInfo[0].project_id, `Mengubah status tugas "${devInfo[0].name}" menjadi "${status.toUpperCase()}"`);
    }

    res.json({ message: "Status updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteDevelopment = async (req, res) => {
  try {
    const devId = req.params.devId;
    const userId = req.user.id;

    const [devInfo] = await db.query(`SELECT name, project_id FROM tbr_developments WHERE id = ?`, [devId]);
    if (devInfo.length > 0) {
      await db.query(`DELETE FROM tbr_developments WHERE id = ?`, [devId]);
      
      // Catat penghapusan task pembangunan
      await createLog(userId, devInfo[0].project_id, `Menghapus tugas pembangunan: "${devInfo[0].name}"`);
    }

    res.json({ message: "Task deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/**
 * ==========================================
 * 3. SPRINT MANAGEMENT
 * ==========================================
 */

exports.getProjectSprints = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM tbr_sprints WHERE project_id = ? ORDER BY start_date DESC`, [req.params.projectId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createSprint = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const { name, description, start_date, end_date, status } = req.body;
    
    await db.query(`INSERT INTO tbr_sprints (project_id, name, description, start_date, end_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`, 
    [projectId, name, description, start_date, end_date, status || 'planned']);
    
    // Catat pembuatan sprint baru
    await createLog(userId, projectId, `Membuat Sprint baru: "${name}" dengan status "${status || 'planned'}"`);

    res.status(201).json({ message: "Sprint created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteSprint = async (req, res) => {
  try {
    const sprintId = req.params.sprintId;
    const userId = req.user.id;

    const [sprintInfo] = await db.query(`SELECT name, project_id FROM tbr_sprints WHERE id = ?`, [sprintId]);
    if (sprintInfo.length > 0) {
      await db.query(`DELETE FROM tbr_sprints WHERE id = ?`, [sprintId]);
      
      // Catat penghapusan sprint
      await createLog(userId, sprintInfo[0].project_id, `Menghapus dokumen "${sprintInfo[0].name}" secara permanen`);
    }

    res.json({ message: "Sprint deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/**
 * ==========================================
 * 4. BACKLOG MANAGEMENT
 * ==========================================
 */

exports.getProjectBacklogs = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM tbr_backlogs WHERE project_id = ? ORDER BY created_at DESC`, [req.params.projectId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createBacklog = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const { name, description, priority, applicant, status, sprint_id } = req.body;
    
    const sql = `INSERT INTO tbr_backlogs (name, description, priority, applicant, status, sprint_id, project_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    await db.query(sql, [name, description, priority, applicant, status, sprint_id, projectId, userId]);
    
    // Catat log entri backlog baru
    await createLog(userId, projectId, `Menambahkan item Product Backlog baru: "${name}"`);

    res.status(201).json({ message: "Backlog created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateBacklog = async (req, res) => {
  try {
    const backlogId = req.params.id;
    const userId = req.user.id;
    const { name, description, priority, applicant, status, sprint_id } = req.body;
    
    // Cari project_id untuk kebutuhan log
    const [backlogInfo] = await db.query(`SELECT project_id FROM tbr_backlogs WHERE id = ?`, [backlogId]);
    
    await db.query(`UPDATE tbr_backlogs SET name=?, description=?, priority=?, applicant=?, status=?, sprint_id=?, updated_at=NOW() WHERE id=?`, 
    [name, description, priority, applicant, status, sprint_id, backlogId]);
    
    if (backlogInfo.length > 0) {
      // Catat log pembaruan backlog
      await createLog(userId, backlogInfo[0].project_id, `Memperbarui item Product Backlog: "${name}"`);
    }

    res.json({ message: "Backlog updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteBacklog = async (req, res) => {
  try {
    const backlogId = req.params.id;
    const userId = req.user.id;

    const [backlogInfo] = await db.query(`SELECT name, project_id FROM tbr_backlogs WHERE id = ?`, [backlogId]);
    if (backlogInfo.length > 0) {
      await db.query(`DELETE FROM tbr_backlogs WHERE id = ?`, [backlogId]);
      
      // Catat log penghapusan backlog
      await createLog(userId, backlogInfo[0].project_id, `Menghapus item Product Backlog: "${backlogInfo[0].name}"`);
    }

    res.json({ message: "Backlog deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/**
 * ==========================================
 * 5. VISION BOARD MANAGEMENT
 * ==========================================
 */

exports.getProjectVisions = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM tbr_vision_boards WHERE project_id = ? ORDER BY created_at DESC`, [req.params.projectId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createVision = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const { name, vision, target_group, needs, products, business_goals, competitors } = req.body;
    
    const sql = `INSERT INTO tbr_vision_boards (name, vision, target_group, needs, products, business_goals, competitors, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    await db.query(sql, [name, vision, target_group, needs, products, business_goals, competitors, projectId]);
    
    // Catat penambahan Vision Board
    await createLog(userId, projectId, `Menyusun Vision Board baru: "${name}"`);

    res.status(201).json({ message: "Vision created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateVision = async (req, res) => {
  try {
    const visionId = req.params.id;
    const userId = req.user.id;
    const { name, vision, target_group, needs, products, business_goals, competitors } = req.body;
    
    const [visionInfo] = await db.query(`SELECT project_id FROM tbr_vision_boards WHERE id = ?`, [visionId]);
    
    const sql = `UPDATE tbr_vision_boards SET name=?, vision=?, target_group=?, needs=?, products=?, business_goals=?, competitors=?, updated_at=NOW() WHERE id=?`;
    await db.query(sql, [name, vision, target_group, needs, products, business_goals, competitors, visionId]);
    
    if (visionInfo.length > 0) {
      // Catat perubahan isi matriks Vision Board
      await createLog(userId, visionInfo[0].project_id, `Mengubah komponen isi data pada Vision Board: "${name}"`);
    }

    res.json({ message: "Vision updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteVision = async (req, res) => {
  try {
    const visionId = req.params.id;
    const userId = req.user.id;

    const [visionInfo] = await db.query(`SELECT name, project_id FROM tbr_vision_boards WHERE id = ?`, [visionId]);
    if (visionInfo.length > 0) {
      await db.query(`DELETE FROM tbr_vision_boards WHERE id = ?`, [visionId]);
      
      // Catat log pembersihan Vision Board
      await createLog(userId, visionInfo[0].project_id, `Menghapus komponen Vision Board: "${visionInfo[0].name}"`);
    }

    res.json({ message: "Vision deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/**
 * ==========================================
 * 6. ACTIVITY LOGS (Tabel: tbr_activity_logs)
 * ==========================================
 */
exports.getProjectLogs = async (req, res) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    
    const sql = `
      SELECT 
        al.id, 
        al.activity, 
        al.created_at, 
        u.name as user_name 
      FROM tbr_activity_logs al
      LEFT JOIN tbr_users u ON al.user_id = u.id
      WHERE al.project_id = ?
      ORDER BY al.created_at DESC
    `;

    const [rows] = await db.query(sql, [projectId]);
    res.json(rows);
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};