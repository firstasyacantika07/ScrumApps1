// routes/githubRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 1. GET: Mengambil status integrasi berdasarkan ID Proyek (Dibutuhkan di GitHubStatusCard)
router.get('/project/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, project_id, github_owner, github_repo, status FROM github_integrations WHERE project_id = ? ORDER BY created_at DESC LIMIT 1',
            [req.params.id]
        );
        
        if (rows.length === 0) return res.json(null);
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal mengambil status integrasi' });
    }
});

// 2. GET: Mendapatkan URL OAuth GitHub untuk proses approval & instalasi
router.get('/oauth-url', async (req, res) => {
    try {
        const { request_id } = req.query;
        if (!request_id) return res.status(400).json({ error: 'Parameter request_id dibutuhkan' });

        // Generate URL GitHub OAuth App / GitHub App Installation milikmu
        const client_id = process.env.GITHUB_CLIENT_ID;
        const redirect_uri = encodeURIComponent(process.env.GITHUB_REDIRECT_URI);
        
        // Membawa state berisi ID pengajuan agar bisa dikenali saat callback balik dari GitHub
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&state=${request_id}&scope=repo,admin:repo_hook`;

        res.json({ url: githubAuthUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal men-generate URL OAuth' });
    }
});

// 3. GET: Mengambil semua daftar pengajuan integrasi (Dibutuhkan di GitHubIntegrations - Superadmin)
router.get('/requests', async (req, res) => {
    try {
        const query = `
            SELECT 
                gi.id, 
                p.name AS project_name, 
                gi.requester_name, 
                gi.github_owner AS repository_owner, 
                gi.github_repo AS repository_name, 
                gi.repository_url, 
                gi.status 
            FROM github_integrations gi
            JOIN projects p ON gi.project_id = p.id
            ORDER BY gi.created_at DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memuat semua pengajuan' });
    }
});

// 4. PUT: Menolak pengajuan integrasi oleh Superadmin
router.put('/requests/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query(
            'UPDATE github_integrations SET status = "REJECTED" WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
        res.json({ message: 'Pengajuan berhasil ditolak' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal menolak pengajuan' });
    }
});

// 5. DELETE: Memutuskan koneksi repositori GitHub (Disconnect)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Ambil info project_id untuk kebutuhan log aktivitas sebelum dihapus
        const [integration] = await db.query('SELECT project_id FROM github_integrations WHERE id = ?', [id]);
        
        if (integration.length > 0) {
            const projectId = integration[0].project_id;
            // Hapus data integrasi
            await db.query('DELETE FROM github_integrations WHERE id = ?', [id]);
            // Catat log aktivitas proyek
            await db.query(
                'INSERT INTO project_logs (project_id, activity, user_name) VALUES (?, ?, ?)',
                [projectId, 'Memutuskan koneksi integrasi repositori GitHub dari proyek.', 'Super Admin']
            );
        }

        res.json({ message: 'Koneksi repositori berhasil diputuskan' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memutuskan koneksi' });
    }
});

// 6. POST: Mengajukan integrasi baru dari sisi modal Business Analyst
router.post('/request', async (req, res) => {
    try {
        const { project_id, github_owner, github_repo, requester_name } = req.body;
        const repository_url = `https://github.com/${github_owner}/${github_repo}`;

        await db.query(
            'INSERT INTO github_integrations (project_id, requester_name, github_owner, github_repo, repository_url, status) VALUES (?, ?, ?, ?, ?, "PENDING")',
            [project_id, requester_name || 'Business Analyst', github_owner, github_repo, repository_url]
        );

        res.status(201).json({ message: 'Pengajuan integrasi berhasil dikirim ke Super Admin' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal mengirim pengajuan integrasi' });
    }
});

module.exports = router;