const db = require('../config/db');

/**
 * ADD TEAM MEMBER
 */
exports.addTeamMember = async (req, res) => {
  try {
    const { projectId } = req.params; // Mengambil dari URL parameter
    const { user_id, role } = req.body;

    // 1. Dapatkan info paket pemilik proyek (SaaS Limit Check)
    const [owner] = await db.query(
      `SELECT u.package_type FROM tbr_users u 
       JOIN tbr_projects p ON u.id = p.user_id 
       WHERE p.id = ?`, [projectId]
    );

    if (owner.length === 0) {
      return res.status(404).json({ message: "Proyek tidak ditemukan." });
    }

    // 2. Hitung jumlah member saat ini di proyek tersebut
    const [currentMembers] = await db.query(
      `SELECT COUNT(*) as total FROM tbr_teams WHERE project_id = ?`, [projectId]
    );

    const packageType = owner[0].package_type || 'FREE';
    const totalMembers = currentMembers[0].total;

    // 3. Validasi Limit Tim berdasarkan Paket
    if (packageType === 'FREE' && totalMembers >= 5) {
      return res.status(403).json({ message: "Limit member paket FREE maksimal 5 orang." });
    }
    if (packageType === 'PRO' && totalMembers >= 20) {
      return res.status(403).json({ message: "Limit member paket PRO maksimal 20 orang." });
    }

    // 4. Cek apakah user sudah terdaftar di proyek ini
    const [existing] = await db.query(
      `SELECT id FROM tbr_teams WHERE project_id = ? AND user_id = ?`,
      [projectId, user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "User ini sudah menjadi anggota tim." });
    }

    // 5. Insert member baru dengan timestamp
    await db.query(
      `INSERT INTO tbr_teams (project_id, user_id, role, created_at, updated_at) 
       VALUES (?, ?, ?, NOW(), NOW())`,
      [projectId, user_id, role]
    );

    res.status(201).json({ message: "Member berhasil ditambahkan ke tim." });

  } catch (err) {
    console.error("❌ ADD MEMBER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET TEAM BY PROJECT
 */
exports.getTeamByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const [rows] = await db.query(
      `SELECT t.*, u.name, u.email FROM tbr_teams t 
       JOIN tbr_users u ON t.user_id = u.id 
       WHERE t.project_id = ?
       ORDER BY t.created_at ASC`, 
      [projectId]
    );
    
    res.json(rows);
  } catch (err) {
    console.error("❌ GET TEAM ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * UPDATE TEAM MEMBER (Update Role)
 */
exports.updateTeamMember = async (req, res) => {
  try {
    const { memberId } = req.params; // ID dari tabel tbr_teams
    const { role } = req.body;

    const [result] = await db.query(
      `UPDATE tbr_teams SET role = ?, updated_at = NOW() WHERE id = ?`,
      [role, memberId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data member tidak ditemukan." });
    }

    res.json({ message: "Role member berhasil diperbarui." });
  } catch (err) {
    console.error("❌ UPDATE MEMBER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE TEAM MEMBER
 */
exports.deleteTeamMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const [result] = await db.query(
      `DELETE FROM tbr_teams WHERE id = ?`, 
      [memberId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Member tidak ditemukan." });
    }

    res.json({ message: "Member berhasil dihapus dari tim." });
  } catch (err) {
    console.error("❌ DELETE MEMBER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};