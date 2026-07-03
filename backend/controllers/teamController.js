// controllers/teamController.js
const db = require('../config/db');

/**
 * 👥 1. ADD TEAM MEMBER (Sudah Terproteksi checkTeamLimit di Router)
 * =========================================================================
 */
exports.addTeamMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { user_id, role } = req.body; // 'role' dikirim dari dropdown frontend
    const tenantId = req.user?.tenant_id;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ success: false, message: "ID Proyek tidak valid." });
    }
    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id wajib diisi." });
    }
    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Akun Anda tidak terhubung ke workspace manapun." });
    }

    // Validasi Keamanan: Pastikan proyek milik tenant Admin yang login
    const [projectCheck] = await db.query(
      'SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?',
      [projectId, tenantId]
    );
    if (projectCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Akses Ditolak: Proyek tidak berada di bawah workspace Anda." });
    }

    // Cek duplikasi anggota di proyek ini
    const [existing] = await db.query(
      `SELECT id FROM tbr_project_members WHERE project_id = ? AND user_id = ?`,
      [projectId, user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "User ini sudah menjadi anggota tim aktif di proyek ini." });
    }

    // Standardisasi string role agar aman disimpan
    const cleanRole = role ? String(role).replace(/\s+/g, '').toLowerCase().trim() : 'teamdeveloper';

    // 🔧 FIX: Menyimpan nilai ke kolom role_in_project
    await db.query(
      `INSERT INTO tbr_project_members (project_id, user_id, role_in_project, created_at) 
       VALUES (?, ?, ?, NOW())`,
      [projectId, user_id, cleanRole]
    );

    return res.status(201).json({ success: true, message: "Anggota tim berhasil ditambahkan ke proyek." });

  } catch (err) {
    console.error("❌ ADD MEMBER ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 🔍 2. GET TEAM BY PROJECT (Membaca Kolom role_in_project)
 * =========================================================================
 */
exports.getTeamByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const tenantId = req.user?.tenant_id;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ success: false, message: "ID Proyek tidak valid." });
    }
    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Akun Anda tidak terhubung ke workspace manapun." });
    }

    const [projectCheck] = await db.query(
      'SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?',
      [projectId, tenantId]
    );
    if (projectCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Akses Ditolak." });
    }
    
    // 🔧 FIX: Tarik pm.role_in_project sebagai 'role' agar frontend tidak perlu mengubah nama properti
    const [rows] = await db.query(
      `SELECT 
        pm.id, 
        pm.project_id, 
        pm.user_id, 
        pm.role_in_project AS role, 
        pm.created_at, 
        u.name, 
        u.email 
       FROM tbr_project_members pm
       JOIN tbr_users u ON pm.user_id = u.id 
       WHERE pm.project_id = ?
       ORDER BY pm.created_at ASC`, 
      [projectId]
    );
    
    return res.status(200).json({
      success: true,
      message: "Data anggota tim proyek berhasil dimuat.",
      data: rows
    });
  } catch (err) {
    console.error("❌ GET TEAM ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 🔄 3. UPDATE TEAM MEMBER ROLE (Mengubah Peran Spesifik Proyek)
 * =========================================================================
 */
exports.updateTeamMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const { role } = req.body;
    const tenantId = req.user?.tenant_id;

    if (!projectId || isNaN(projectId) || !memberId || isNaN(memberId)) {
      return res.status(400).json({ success: false, message: "ID Proyek atau ID Anggota tidak valid." });
    }
    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Akun Anda tidak terhubung ke workspace manapun." });
    }

    const [validCheck] = await db.query(
      `SELECT pm.id FROM tbr_project_members pm
       JOIN tbr_projects p ON pm.project_id = p.id
       WHERE pm.id = ? AND p.id = ? AND p.tenant_id = ?`,
      [memberId, projectId, tenantId]
    );

    if (validCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Akses Ditolak: Data tidak valid." });
    }

    const cleanRole = role ? String(role).replace(/\s+/g, '').toLowerCase().trim() : 'teamdeveloper';

    // 🔧 FIX: Update langsung pada kolom role_in_project di tabel persimpangan
    await db.query(
      `UPDATE tbr_project_members SET role_in_project = ? WHERE id = ?`,
      [cleanRole, memberId]
    );

    return res.status(200).json({ success: true, message: "Peran anggota di proyek ini berhasil diperbarui." });
  } catch (err) {
    console.error("❌ UPDATE MEMBER ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 🗑️ 4. DELETE TEAM MEMBER (Aman Multi-Tenant)
 * =========================================================================
 */
exports.deleteTeamMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const tenantId = req.user?.tenant_id;

    if (!projectId || isNaN(projectId) || !memberId || isNaN(memberId)) {
      return res.status(400).json({ success: false, message: "ID Proyek atau ID Anggota tidak valid." });
    }
    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Akun Anda tidak terhubung ke workspace manapun." });
    }

    const [validCheck] = await db.query(
      `SELECT pm.id FROM tbr_project_members pm
       JOIN tbr_projects p ON pm.project_id = p.id
       WHERE pm.id = ? AND p.id = ? AND p.tenant_id = ?`,
      [memberId, projectId, tenantId]
    );

    if (validCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Akses Ditolak: Data tidak ditemukan." });
    }

    await db.query('DELETE FROM tbr_project_members WHERE id = ?', [memberId]);
    return res.status(200).json({ success: true, message: "Anggota tim berhasil dikeluarkan dari proyek." });
  } catch (err) {
    console.error("❌ DELETE MEMBER ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 🏢 5. GET ALL USERS IN WORKSPACE (Menampilkan Semua Anggota Perusahaan untuk Dropdown)
 * =========================================================================
 */
exports.getWorkspaceUsers = async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Akun Anda tidak terhubung ke workspace manapun." });
    }

    // Mengambil semua user yang berada di bawah naungan tenant_id yang sama
    const [users] = await db.query(
      `SELECT id, name, email, role FROM tbr_users WHERE tenant_id = ? ORDER BY name ASC`,
      [tenantId]
    );

    return res.status(200).json({
      success: true,
      message: "Daftar anggota workspace berhasil dimuat.",
      data: users
    });
  } catch (err) {
    console.error("❌ GET WORKSPACE USERS ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};