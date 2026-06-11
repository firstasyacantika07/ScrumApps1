const db = require('../config/db');

/**
 * =========================================================================
 * GLOBAL HELPER: CREATING AUDIT LOGS AUTOMATICALLY
 * =========================================================================
 */
const createLog = async (userId, projectId, activityDescription) => {
  try {
    const sql = `
      INSERT INTO tbr_activity_logs (user_id, project_id, activity, created_at) 
      VALUES (?, ?, ?, NOW())
    `;
    await db.query(sql, [userId, projectId, activityDescription]);
  } catch (err) {
    console.error("[AUDIT LOG ERROR]:", err.message);
  }
};

/**
 * ==========================================
 * 1. PROJECT CORE (CRUD & STATS - MULTI TENANT)
 * ==========================================
 */

exports.createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || '';
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) return res.status(400).json({ message: "Bad Request: Header X-Tenant-ID diperlukan." });
    if (String(userRole).toUpperCase() !== 'SUPERADMIN') {
      return res.status(403).json({ message: "Akses Ditolak: Hanya SUPERADMIN yang bisa membuat proyek." });
    }

    const [tenantData] = await db.query(`SELECT plan_id FROM tbr_tenants WHERE id = ?`, [tenantId]);
    if (tenantData.length === 0) return res.status(404).json({ message: "Data Tenant tidak terdaftar." });

    const [projectCount] = await db.query(`SELECT COUNT(*) as total FROM tbr_projects WHERE tenant_id = ?`, [tenantId]);
    const packageType = tenantData[0].plan_id == 1 ? 'FREE' : 'PRO';
    const currentTotal = projectCount[0]?.total || 0;

    if (packageType === 'FREE' && currentTotal >= 1) return res.status(403).json({ message: "Limit paket FREE tercapai." });
    if (packageType === 'PRO' && currentTotal >= 15) return res.status(403).json({ message: "Limit paket PRO tercapai." });

    // Tambahkan repo_url di sini
    const sql = `
      INSERT INTO tbr_projects 
      (name, start_date, end_date, status, icon, label, user_id, tenant_id, repo_url, \`read\`, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const values = [
      req.body.name, req.body.start_date || null, req.body.end_date || null, 
      req.body.status || 'hold', req.body.icon || 'ki-duotone ki-star', 
      req.body.label || 'external', userId, tenantId, req.body.repo_url || null, 0
    ];

    const [result] = await db.query(sql, values);
    await createLog(userId, result.insertId, `Membuat proyek baru: "${req.body.name}"`);

    res.status(201).json({ message: "Project created sukses", id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];

    const sql = `
      SELECT p.*, tnt.plan_id as tenant_plan_id 
      FROM tbr_projects p 
      INNER JOIN tbr_tenants tnt ON p.tenant_id = tnt.id
      LEFT JOIN tbr_teams t ON p.id = t.project_id 
      WHERE p.tenant_id = ? AND (p.user_id = ? OR t.user_id = ?) 
      GROUP BY p.id ORDER BY p.created_at DESC
    `;
    const [rows] = await db.query(sql, [tenantId, userId, userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];

    const sql = `
      SELECT p.*, tnt.plan_id as tenant_plan_id 
      FROM tbr_projects p 
      INNER JOIN tbr_tenants tnt ON p.tenant_id = tnt.id
      LEFT JOIN tbr_teams t ON p.id = t.project_id 
      WHERE p.id = ? AND p.tenant_id = ? AND (p.user_id = ? OR t.user_id = ?) 
      GROUP BY p.id
    `;
    const [rows] = await db.query(sql, [projectId, tenantId, userId, userId]);
    if (rows.length === 0) return res.status(404).json({ message: "Project tidak ditemukan." });
    
    // Auto mark as read saat diakses developer (opsional)
    await db.query(`UPDATE tbr_projects SET \`read\` = 1 WHERE id = ?`, [projectId]);
    
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role || '';
    const tenantId = req.headers['x-tenant-id'];
    const { name, start_date, end_date, status, repo_url } = req.body;

    const [projectCheck] = await db.query(`SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?`, [projectId, tenantId]);
    if (projectCheck.length === 0) return res.status(403).json({ message: "Akses Ditolak." });

    // Update dengan menyertakan repo_url
    const sql = `
      UPDATE tbr_projects 
      SET name=?, start_date=?, end_date=?, status=?, repo_url=?, updated_at=NOW() 
      WHERE id=? AND tenant_id=?
    `;
    await db.query(sql, [name, start_date, end_date, status, repo_url || null, projectId, tenantId]);
    
    await createLog(userId, projectId, `Memperbarui detail proyek. Status: ${status}, Repo: ${repo_url ? 'Updated' : 'Not Set'}`);
    res.json({ message: "Project updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role || '';
    const tenantId = req.headers['x-tenant-id'];

    if (String(userRole).toUpperCase() !== 'SUPERADMIN') {
      return res.status(403).json({ message: "Hanya Superadmin yang dapat menghapus proyek." });
    }

    const [projectInfo] = await db.query(`SELECT name FROM tbr_projects WHERE id = ? AND tenant_id = ?`, [projectId, tenantId]);
    if (projectInfo.length === 0) return res.status(404).json({ message: "Proyek tidak ditemukan." });

    await db.query(`DELETE FROM tbr_projects WHERE id=? AND tenant_id=?`, [projectId, tenantId]);
    await createLog(userId, projectId, `Menghapus proyek "${projectInfo[0].name}"`);

    res.json({ message: "Project deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};


/**
 * ==========================================
 * 2. DEVELOPMENT / TASK MANAGEMENT
 * ==========================================
 */

exports.getProjectDevelopments = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const tenantId = req.headers['x-tenant-id'];

    // Validasi silang keamanan data tenant
    const [rows] = await db.query(
      `SELECT d.* FROM tbr_developments d 
       INNER JOIN tbr_projects p ON d.project_id = p.id 
       WHERE d.project_id = ? AND p.tenant_id = ? ORDER BY d.created_at DESC`, 
      [projectId, tenantId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createDevelopment = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];
    const { title, description, status, link } = req.body;
    
    // Pastikan proyek tujuan memang milik tenant yang sah
    const [projectCheck] = await db.query(`SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?`, [projectId, tenantId]);
    if (projectCheck.length === 0) return res.status(403).json({ message: "Modifikasi ilegal di luar tenant dilarang." });

    const sql = `INSERT INTO tbr_developments (name, \`desc\`, status, link, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`;
    await db.query(sql, [title, description, status || 'todo', link || null, projectId]);
    
    await createLog(userId, projectId, `Menambahkan tugas pembangunan (Development Task) baru: "${title}"`);
    res.status(201).json({ message: "Task created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateDevelopmentStatus = async (req, res) => {
  try {
    const devId = req.params.devId;
    const { status } = req.body;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];

    const [devInfo] = await db.query(
      `SELECT d.name, d.project_id FROM tbr_developments d
       INNER JOIN tbr_projects p ON d.project_id = p.id 
       WHERE d.id = ? AND p.tenant_id = ?`, 
      [devId, tenantId]
    );

    if (devInfo.length === 0) return res.status(403).json({ message: "Data tidak ditemukan atau berada di luar organisasi Anda." });

    await db.query(`UPDATE tbr_developments SET status = ?, updated_at = NOW() WHERE id = ?`, [status, devId]);
    // ✨ AMAN: Diproteksi String()
    await createLog(userId, devInfo[0].project_id, `Mengubah status tugas "${devInfo[0].name}" menjadi "${String(status).toUpperCase()}"`);

    res.json({ message: "Status updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteDevelopment = async (req, res) => {
  try {
    const devId = req.params.devId;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];

    const [devInfo] = await db.query(
      `SELECT d.name, d.project_id FROM tbr_developments d
       INNER JOIN tbr_projects p ON d.project_id = p.id 
       WHERE d.id = ? AND p.tenant_id = ?`, 
      [devId, tenantId]
    );

    if (devInfo.length === 0) return res.status(403).json({ message: "Data tidak ditemukan." });

    await db.query(`DELETE FROM tbr_developments WHERE id = ?`, [devId]);
    await createLog(userId, devInfo[0].project_id, `Menghapus tugas pembangunan: "${devInfo[0].name}"`);

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
    const projectId = req.params.projectId || req.params.id;
    const tenantId = req.headers['x-tenant-id'];

    const [rows] = await db.query(
      `SELECT s.* FROM tbr_sprints s 
       INNER JOIN tbr_projects p ON s.project_id = p.id 
       WHERE s.project_id = ? AND p.tenant_id = ? ORDER BY s.start_date DESC`, 
      [projectId, tenantId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createSprint = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];
    const { name, description, start_date, end_date, status } = req.body;
    
    const [projectCheck] = await db.query(`SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?`, [projectId, tenantId]);
    if (projectCheck.length === 0) return res.status(403).json({ message: "Akses Terlarang." });

    await db.query(`INSERT INTO tbr_sprints (project_id, name, description, start_date, end_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`, 
    [projectId, name, description, start_date, end_date, status || 'planned']);
    
    await createLog(userId, projectId, `Membuat Sprint baru: "${name}"`);
    res.status(201).json({ message: "Sprint created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateSprint = async (req, res) => {
  try {
    const sprintId = req.params.id;
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];
    const { name, description, start_date, end_date, status } = req.body;

    const [sprintCheck] = await db.query(
      `SELECT s.project_id FROM tbr_sprints s 
       INNER JOIN tbr_projects p ON s.project_id = p.id 
       WHERE s.id = ? AND p.tenant_id = ?`, 
      [sprintId, tenantId]
    );
    if (sprintCheck.length === 0) return res.status(403).json({ message: "Sprint tidak valid atau di luar organisasi Anda." });

    const sql = `
      UPDATE tbr_sprints 
      SET name = ?, description = ?, start_date = ?, end_date = ?, status = ?, updated_at = NOW() 
      WHERE id = ?
    `;
    await db.query(sql, [name, description || null, start_date, end_date, status || 'planned', sprintId]);

    const targetProject = projectId || sprintCheck[0].project_id; 
    await createLog(userId, targetProject, `Memperbarui detail siklus pengerjaan Sprint: "${name}"`);

    res.json({ message: "Sprint updated sukses" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteSprint = async (req, res) => {
  try {
    const sprintId = req.params.sprintId || req.params.id;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];

    const [sprintInfo] = await db.query(
      `SELECT s.name, s.project_id FROM tbr_sprints s
       INNER JOIN tbr_projects p ON s.project_id = p.id 
       WHERE s.id = ? AND p.tenant_id = ?`, 
      [sprintId, tenantId]
    );
    if (sprintInfo.length === 0) return res.status(404).json({ message: "Sprint tidak ditemukan." });

    await db.query(`DELETE FROM tbr_sprints WHERE id = ?`, [sprintId]);
    await createLog(userId, sprintInfo[0].project_id, `Menghapus dokumen "${sprintInfo[0].name}" secara permanen`);

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
    const projectId = req.params.projectId || req.params.id;
    const tenantId = req.headers['x-tenant-id'];

    const [rows] = await db.query(
      `SELECT b.* FROM tbr_backlogs b 
       INNER JOIN tbr_projects p ON b.project_id = p.id 
       WHERE b.project_id = ? AND p.tenant_id = ? ORDER BY b.created_at DESC`, 
      [projectId, tenantId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createBacklog = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.project_id;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];
    const { name, description, priority, applicant, status, sprint_id } = req.body;

    const [projectCheck] = await db.query(`SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?`, [projectId, tenantId]);
    if (projectCheck.length === 0) return res.status(403).json({ message: "Proyek tidak valid dalam lingkup organisasi Anda." });
    
    const sql = `INSERT INTO tbr_backlogs (name, description, priority, applicant, status, sprint_id, project_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    await db.query(sql, [name, description || null, priority || 'low', applicant || null, status || 'inactive', sprint_id || null, projectId, userId]);
    
    await createLog(userId, projectId, `Menambahkan item Product Backlog baru: "${name}"`);
    res.status(201).json({ message: "Backlog created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateBacklog = async (req, res) => {
  try {
    const backlogId = req.params.id;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];
    const { name, description, priority, applicant, status, sprint_id } = req.body;
    
    const [backlogInfo] = await db.query(
      `SELECT b.project_id FROM tbr_backlogs b 
       INNER JOIN tbr_projects p ON b.project_id = p.id 
       WHERE b.id = ? AND p.tenant_id = ?`, 
      [backlogId, tenantId]
    );
    if (backlogInfo.length === 0) return res.status(403).json({ message: "Akses Ilegal." });
    
    await db.query(`UPDATE tbr_backlogs SET name=?, description=?, priority=?, applicant=?, status=?, sprint_id=?, updated_at=NOW() WHERE id=?`, 
    [name, description || null, priority || 'low', applicant || null, status || 'inactive', sprint_id || null, backlogId]);
    
    await createLog(userId, backlogInfo[0].project_id, `Memperbarui item Product Backlog: "${name}"`);
    res.json({ message: "Backlog updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteBacklog = async (req, res) => {
  try {
    const backlogId = req.params.id;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];

    const [backlogInfo] = await db.query(
      `SELECT b.name, b.project_id FROM tbr_backlogs b 
       INNER JOIN tbr_projects p ON b.project_id = p.id 
       WHERE b.id = ? AND p.tenant_id = ?`, 
      [backlogId, tenantId]
    );
    if (backlogInfo.length === 0) return res.status(404).json({ message: "Backlog tidak ditemukan." });

    await db.query(`DELETE FROM tbr_backlogs WHERE id = ?`, [backlogId]);
    await createLog(userId, backlogInfo[0].project_id, `Menghapus item Product Backlog: "${backlogInfo[0].name}"`);

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
    const projectId = req.params.projectId || req.params.id;
    const tenantId = req.headers['x-tenant-id'];

    const [rows] = await db.query(
      `SELECT v.* FROM tbr_vision_boards v 
       INNER JOIN tbr_projects p ON v.project_id = p.id 
       WHERE v.project_id = ? AND p.tenant_id = ? ORDER BY v.created_at DESC`, 
      [projectId, tenantId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createVision = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];
    const { name, vision, target_group, needs, products, business_goals, competitors } = req.body;
    
    const [projectCheck] = await db.query(`SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?`, [projectId, tenantId]);
    if (projectCheck.length === 0) return res.status(403).json({ message: "Proyek tidak valid." });

    const sql = `INSERT INTO tbr_vision_boards (name, vision, target_group, needs, products, business_goals, competitors, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    await db.query(sql, [name, vision, target_group, needs, products, business_goals, competitors, projectId]);
    
    await createLog(userId, projectId, `Menyusun Vision Board baru: "${name}"`);
    res.status(201).json({ message: "Vision created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateVision = async (req, res) => {
  try {
    const visionId = req.params.id;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];
    const { name, vision, target_group, needs, products, business_goals, competitors } = req.body;
    
    const [visionInfo] = await db.query(
      `SELECT v.project_id FROM tbr_vision_boards v 
       INNER JOIN tbr_projects p ON v.project_id = p.id 
       WHERE v.id = ? AND p.tenant_id = ?`, 
      [visionId, tenantId]
    );
    if (visionInfo.length === 0) return res.status(403).json({ message: "Akses Ditolak." });
    
    const sql = `UPDATE tbr_vision_boards SET name=?, vision=?, target_group=?, needs=?, products=?, business_goals=?, competitors=?, updated_at=NOW() WHERE id=?`;
    await db.query(sql, [name, vision, target_group, needs, products, business_goals, competitors, visionId]);
    
    await createLog(userId, visionInfo[0].project_id, `Mengubah komponen isi data pada Vision Board: "${name}"`);
    res.json({ message: "Vision updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteVision = async (req, res) => {
  try {
    const visionId = req.params.id;
    const userId = req.user.id;
    const tenantId = req.headers['x-tenant-id'];

    const [visionInfo] = await db.query(
      `SELECT v.name, v.project_id FROM tbr_vision_boards v 
       INNER JOIN tbr_projects p ON v.project_id = p.id 
       WHERE v.id = ? AND p.tenant_id = ?`, 
      [visionId, tenantId]
    );
    if (visionInfo.length === 0) return res.status(404).json({ message: "Vision Board tidak ditemukan." });

    await db.query(`DELETE FROM tbr_vision_boards WHERE id = ?`, [visionId]);
    await createLog(userId, visionInfo[0].project_id, `Menghapus komponen Vision Board: "${visionInfo[0].name}"`);

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
    const tenantId = req.headers['x-tenant-id'];
    
    const sql = `
      SELECT 
        al.id, 
        al.activity, 
        al.created_at, 
        u.name as user_name 
      FROM tbr_activity_logs al
      LEFT JOIN tbr_users u ON al.user_id = u.id
      INNER JOIN tbr_projects p ON al.project_id = p.id
      WHERE al.project_id = ? AND p.tenant_id = ?
      ORDER BY al.created_at DESC
    `;

    const [rows] = await db.query(sql, [projectId, tenantId]);
    res.json(rows);
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};