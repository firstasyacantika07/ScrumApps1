// routes/githubRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /project/:id — Status integrasi berdasarkan project ID
// ─────────────────────────────────────────────────────────────────────────────
router.get('/project/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, project_id, github_owner, github_repo, status 
             FROM github_integrations 
             WHERE project_id = ? 
             ORDER BY created_at DESC LIMIT 1`,
            [req.params.id]
        );
        if (rows.length === 0) return res.json(null);
        res.json(rows[0]);
    } catch (error) {
        console.error('GET /project/:id error:', error);
        res.status(500).json({ error: 'Gagal mengambil status integrasi' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /oauth-url — Generate URL OAuth GitHub
// FIX: redirect_uri jangan di-encodeURIComponent di sini karena sudah
//      di-embed ke dalam query string yang dibangun manual.
//      encodeURIComponent hanya dipanggil SATU KALI saat memasukkan ke URL.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/oauth-url', async (req, res) => {
    try {
        const { request_id } = req.query;
        if (!request_id) {
            return res.status(400).json({ error: 'Parameter request_id dibutuhkan' });
        }

        const client_id    = process.env.GITHUB_CLIENT_ID;
        const redirect_uri = process.env.GITHUB_REDIRECT_URI; // ← ambil RAW, jangan encode dulu

        if (!client_id || !redirect_uri) {
            console.error('ENV MISSING: GITHUB_CLIENT_ID atau GITHUB_REDIRECT_URI belum diset');
            return res.status(500).json({ error: 'Konfigurasi OAuth GitHub belum lengkap di server' });
        }

        // encodeURIComponent dipanggil tepat SATU KALI saat memasukkan ke query string
        const githubAuthUrl =
            `https://github.com/login/oauth/authorize` +
            `?client_id=${client_id}` +
            `&redirect_uri=${encodeURIComponent(redirect_uri)}` +  // ← FIX utama
            `&state=${request_id}` +
            `&scope=repo,admin:repo_hook`;

        console.log('[oauth-url] Generated:', githubAuthUrl);
        res.json({ url: githubAuthUrl });
    } catch (error) {
        console.error('GET /oauth-url error:', error);
        res.status(500).json({ error: 'Gagal men-generate URL OAuth' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /callback — Callback dari GitHub setelah user approve OAuth
// FIX: Route ini WAJIB ada agar GitHub bisa redirect balik ke aplikasi.
//      Tukar `code` dari GitHub dengan access_token lalu simpan ke DB.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/callback', async (req, res) => {
    try {
        const { code, state: request_id, error: ghError } = req.query;

        // Jika user menolak / error dari GitHub
        if (ghError) {
            console.error('[callback] GitHub error:', ghError);
            return res.redirect(`${process.env.FRONTEND_URL}/github-integrations?error=oauth_denied`);
        }

        if (!code || !request_id) {
            return res.redirect(`${process.env.FRONTEND_URL}/github-integrations?error=missing_params`);
        }

        // Tukar code → access_token
        const tokenRes = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id:     process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri:  process.env.GITHUB_REDIRECT_URI,
            },
            { headers: { Accept: 'application/json' } }
        );

        const { access_token, error: tokenError } = tokenRes.data;

        if (tokenError || !access_token) {
            console.error('[callback] Token exchange failed:', tokenRes.data);
            return res.redirect(`${process.env.FRONTEND_URL}/github-integrations?error=token_failed`);
        }

        // Simpan access_token ke DB & update status → CONNECTED
        const [result] = await db.query(
            `UPDATE github_integrations 
             SET status = 'CONNECTED', github_access_token = ? 
             WHERE id = ?`,
            [access_token, request_id]
        );

        if (result.affectedRows === 0) {
            console.warn('[callback] request_id tidak ditemukan di DB:', request_id);
            return res.redirect(`${process.env.FRONTEND_URL}/github-integrations?error=request_not_found`);
        }

        console.log(`[callback] Integration ID ${request_id} berhasil CONNECTED`);
        // Redirect ke halaman GitHub Integrations dengan pesan sukses
        res.redirect(`${process.env.FRONTEND_URL}/github-integrations?success=connected`);

    } catch (error) {
        console.error('[callback] Error:', error.message);
        res.redirect(`${process.env.FRONTEND_URL}/github-integrations?error=server_error`);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /requests — Semua daftar pengajuan (Superadmin)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/requests', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                gi.id, 
                p.name        AS project_name, 
                gi.requester_name, 
                gi.github_owner  AS repository_owner, 
                gi.github_repo   AS repository_name, 
                gi.repository_url, 
                gi.status 
            FROM github_integrations gi
            JOIN projects p ON gi.project_id = p.id
            ORDER BY gi.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('GET /requests error:', error);
        res.status(500).json({ error: 'Gagal memuat semua pengajuan' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PUT /requests/:id/approve — Superadmin approve → kirim user ke OAuth GitHub
// ─────────────────────────────────────────────────────────────────────────────
router.put('/requests/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `UPDATE github_integrations SET status = 'APPROVED' WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        // Generate OAuth URL untuk dikirim balik ke frontend agar bisa diteruskan ke user
        const client_id    = process.env.GITHUB_CLIENT_ID;
        const redirect_uri = process.env.GITHUB_REDIRECT_URI;

        const oauthUrl =
            `https://github.com/login/oauth/authorize` +
            `?client_id=${client_id}` +
            `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
            `&state=${id}` +
            `&scope=repo,admin:repo_hook`;

        res.json({ message: 'Pengajuan disetujui', oauth_url: oauthUrl });
    } catch (error) {
        console.error('PUT /approve error:', error);
        res.status(500).json({ error: 'Gagal menyetujui pengajuan' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. PUT /requests/:id/reject — Superadmin tolak pengajuan
// ─────────────────────────────────────────────────────────────────────────────
router.put('/requests/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query(
            `UPDATE github_integrations SET status = 'REJECTED' WHERE id = ?`,
            [id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
        res.json({ message: 'Pengajuan berhasil ditolak' });
    } catch (error) {
        console.error('PUT /reject error:', error);
        res.status(500).json({ error: 'Gagal menolak pengajuan' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. DELETE /:id — Putuskan koneksi GitHub (Disconnect)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [integration] = await db.query(
            'SELECT project_id FROM github_integrations WHERE id = ?', [id]
        );

        if (integration.length > 0) {
            const projectId = integration[0].project_id;
            await db.query('DELETE FROM github_integrations WHERE id = ?', [id]);
            await db.query(
                'INSERT INTO project_logs (project_id, activity, user_name) VALUES (?, ?, ?)',
                [projectId, 'Memutuskan koneksi integrasi repositori GitHub dari proyek.', 'Super Admin']
            );
        }

        res.json({ message: 'Koneksi repositori berhasil diputuskan' });
    } catch (error) {
        console.error('DELETE /:id error:', error);
        res.status(500).json({ error: 'Gagal memutuskan koneksi' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. POST /request — Ajukan integrasi baru (Business Analyst)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/request', async (req, res) => {
    try {
        const { project_id, github_owner, github_repo, requester_name } = req.body;

        if (!project_id || !github_owner || !github_repo) {
            return res.status(400).json({ error: 'project_id, github_owner, dan github_repo wajib diisi' });
        }

        const repository_url = `https://github.com/${github_owner}/${github_repo}`;

        await db.query(
            `INSERT INTO github_integrations 
             (project_id, requester_name, github_owner, github_repo, repository_url, status) 
             VALUES (?, ?, ?, ?, ?, 'PENDING')`,
            [project_id, requester_name || 'Business Analyst', github_owner, github_repo, repository_url]
        );

        res.status(201).json({ message: 'Pengajuan integrasi berhasil dikirim ke Super Admin' });
    } catch (error) {
        console.error('POST /request error:', error);
        res.status(500).json({ error: 'Gagal mengirim pengajuan integrasi' });
    }
});

module.exports = router;