const db = require('../config/db'); 
const axios = require('axios'); 

/**
 * 🔒 INTERNAL HELPER: Memastikan Tenant Memiliki Paket PRO / ENTERPRISE
 */
const checkGitHubPackagePermission = (req, res) => {
    const currentPackage = req.user?.package_type || 'FREE';
    if (currentPackage === 'FREE') {
        res.status(403).json({ 
            success: false, 
            message: "Akses Ditolak: Fitur sinkronisasi integrasi GitHub hanya tersedia pada paket PRO dan ENTERPRISE. Silakan upgrade paket workspace Anda." 
        });
        return false;
    }
    return true;
};

/**
 * 1. Mengambil status integrasi spesifik milik satu proyek
 * GET /api/projects/:projectId/github-status
 */
const getIntegrationByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const tenantId = req.user.tenant_id;

        if (isNaN(projectId)) {
            return res.status(400).json({ success: false, message: 'ID Proyek tidak valid' });
        }

        // 🔥 REVISI MULTI-TENANT: Validasi kepemilikan proyek berdasarkan tenant_id agar data tidak bocor
        const [projectCheck] = await db.query('SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?', [projectId, tenantId]);
        if (projectCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses Ditolak: Proyek tidak berada di workspace Anda.' });
        }

        const [rows] = await db.query(
            'SELECT id, project_id, github_owner, github_repo, repository_url, status FROM tbr_github_integrations WHERE project_id = ? ORDER BY created_at DESC LIMIT 1',
            [projectId]
        );
        
        if (rows.length === 0) {
            return res.status(200).json(null);
        }
        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error('🔥 Error di getIntegrationByProject:', error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

/**
 * 2. Mengajukan integrasi repositori baru oleh BA atau Admin Workspace
 * POST /api/projects/:projectId/github-requests
 */
const createIntegrationRequest = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        let { github_owner, github_repo } = req.body;
        const tenantId = req.user.tenant_id;

        // 🔥 BINDING SAAS SECURITY: Tolak langsung jika paketnya masih FREE
        if (!checkGitHubPackagePermission(req, res)) return;

        // Validasi Tenant Proyek
        const [projectCheck] = await db.query('SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?', [projectId, tenantId]);
        if (projectCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Akses ilegal di luar workspace ditolak.' });
        }

        const requester_name = req.user?.name || req.user?.email || 'Workspace Admin';

        if (!github_owner || !github_repo) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nama pemilik (owner) dan nama repositori GitHub wajib diisi.' 
            });
        }

        github_owner = github_owner.trim();
        github_repo = github_repo.trim();

        if (github_repo.startsWith('http') || github_repo.includes('github.com')) {
            github_repo = github_repo.split('/').pop();
            github_repo = github_repo.replace(/\.git$/i, '');
        }

        const [existing] = await db.query(
            'SELECT id, status FROM tbr_github_integrations WHERE project_id = ? AND status IN ("Pending", "Active") LIMIT 1',
            [projectId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Proyek ini sudah memiliki integrasi dengan status ${existing[0].status}.`
            });
        }

        const repository_url = `https://github.com/${github_owner}/${github_repo}`;

        await db.query(
            'INSERT INTO tbr_github_integrations (project_id, requester_name, github_owner, github_repo, repository_url, status) VALUES (?, ?, ?, ?, ?, "Pending")',
            [projectId, requester_name, github_owner, github_repo, repository_url]
        );

        return res.status(201).json({ 
            success: true, 
            message: 'Pengajuan integrasi repositori berhasil dikirim ke Superadmin platform untuk aktivasi OAuth.' 
        });
    } catch (error) {
        console.error('🔥 Error saat insert tbr_github_integrations:', error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * 3. Mengambil URL OAuth GitHub untuk proses otentikasi (Superadmin Platform)
 * GET /api/projects/github/oauth-url
 */
const getGitHubOAuthUrl = async (req, res, next) => {
    try {
        const { request_id } = req.query;
        if (!request_id) {
            return res.status(400).json({ success: false, message: 'Parameter request_id dibutuhkan' });
        }

        const client_id = process.env.GITHUB_CLIENT_ID;
        const redirect_uri = encodeURIComponent(process.env.GITHUB_REDIRECT_URI);
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&state=${request_id}&scope=repo%20admin:repo_hook`;

        return res.status(200).json({ url: githubAuthUrl });
    } catch (error) {
        console.error('🔥 Error di getGitHubOAuthUrl:', error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * 4. Mengambil seluruh riwayat pengajuan integrasi dari semua proyek (Superadmin Dashboard Pusat)
 * GET /api/projects/github/requests
 */
const getAllIntegrationRequests = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                gi.id, 
                gi.project_id, 
                p.name AS project_name, 
                gi.requester_name, 
                gi.github_owner AS repository_owner, 
                gi.github_repo AS repository_name, 
                gi.repository_url, 
                gi.status 
            FROM tbr_github_integrations gi
            JOIN tbr_projects p ON gi.project_id = p.id
            ORDER BY gi.created_at DESC
        `;
        const [rows] = await db.query(query);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('🔥 Error di getAllIntegrationRequests:', error.message);
        return res.status(500).json({ success: false, message: 'Database Error' });
    }
};

/**
 * 5. Menolak pengajuan integrasi repositori (Superadmin Platform Pusat)
 * PUT /api/projects/github/requests/:id/reject
 */
const rejectIntegrationRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.query(
            'UPDATE tbr_github_integrations SET status = "Rejected" WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data pengajuan tidak ditemukan.' });
        }

        return res.status(200).json({ success: true, message: 'Pengajuan berhasil ditolak.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * 6. Memutuskan hubungan repositori dengan proyek / Disconnect (Superadmin Platform)
 * DELETE /api/projects/github/integrations/:id
 */
const disconnectGitHub = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const [integration] = await db.query(
            'SELECT project_id, github_owner, github_repo FROM tbr_github_integrations WHERE id = ?', 
            [id]
        );
        
        if (integration.length === 0) {
            return res.status(404).json({ success: false, message: 'Data integrasi tidak ditemukan.' });
        }

        const projectId = integration[0].project_id;
        const repoName = `${integration[0].github_owner}/${integration[0].github_repo}`;

        await db.query(
            'UPDATE tbr_github_integrations SET status = "Rejected", access_token = NULL WHERE id = ?', 
            [id]
        );

        try {
            // 🔥 REVISI: Mengubah ke tabel audit log global yang valid (tbr_activity_logs)
            await db.query(
                'INSERT INTO tbr_activity_logs (project_id, activity, user_id, created_at) VALUES (?, ?, ?, NOW())',
                [projectId, `Memutuskan koneksi repositori GitHub (${repoName}) dari proyek.`, req.user.id]
            );
        } catch (logError) {
            console.warn('⚠️ Gagal menulis audit log:', logError.message);
        }

        return res.status(200).json({ success: true, message: 'Koneksi repositori berhasil diputuskan.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * 7. Callback Handler dari GitHub OAuth 
 * GET /api/projects/github/callback
 */
const handleGitHubCallback = async (req, res, next) => {
    try {
        const { code, state } = req.query; 

        if (!code || !state) {
            return res.status(400).send('Parameter callback GitHub tidak lengkap (code/state missing).');
        }

        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri: process.env.GITHUB_REDIRECT_URI
            },
            { headers: { Accept: 'application/json' } }
        );

        const accessToken = tokenResponse.data.access_token;

        if (!accessToken) {
            return res.status(400).send('Gagal mendapatkan access token dari otoritas GitHub.');
        }

        const [result] = await db.query(
            'UPDATE tbr_github_integrations SET status = "Active", access_token = ? WHERE id = ?',
            [accessToken, state]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send('Data referensi pengajuan integrasi tidak ditemukan di database.');
        }

        return res.redirect('http://localhost:5173/superadmin/github-integrations?success=true');

    } catch (error) {
        return res.status(500).send(`Terjadi kegagalan sistem internal: ${error.message}`);
    }
};

/**
 * 8. Mengambil aktivitas commit terbaru dari repo yang aktif (Hanya PRO & ENTERPRISE)
 * GET /api/projects/:projectId/github-activity
 */
const getRepoActivity = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const tenantId = req.user.tenant_id;

        // 🔥 BINDING SAAS SECURITY
        if (!checkGitHubPermission(req, res)) return;

        // Validasi Tenant Proyek
        const [projectCheck] = await db.query('SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?', [projectId, tenantId]);
        if (projectCheck.length === 0) {
            return res.status(403).json({ success: false, message: 'Proyek di luar lingkup organisasi Anda.' });
        }

        const [integrations] = await db.query(
            'SELECT github_owner, github_repo, access_token FROM tbr_github_integrations WHERE project_id = ? AND status = "Active" LIMIT 1',
            [projectId]
        );

        if (integrations.length === 0) {
            return res.status(200).json({ success: true, commits: [] });
        }

        const { github_owner, github_repo, access_token } = integrations[0];

        const githubResponse = await axios.get(
            `https://api.github.com/repos/${github_owner}/${github_repo}/commits?per_page=5`,
            {
                headers: {
                    Authorization: `token ${access_token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'User-Agent': 'ScrumApps-Backend'
                }
            }
        );

        const commits = githubResponse.data.map(item => ({
            sha: item.sha.substring(0, 7),
            message: item.commit.message,
            author: item.commit.author.name,
            date: item.commit.author.date,
            url: item.html_url
        }));

        return res.status(200).json({ success: true, repository: `${github_owner}/${github_repo}`, commits });
    } catch (error) {
        console.error('🔥 Error di getRepoActivity:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal memuat aktivitas dari GitHub API.' });
    }
};

/**
 * 9. Menyelaraskan (Sync) Backlog dengan GitHub Issues (Hanya PRO & ENTERPRISE)
 * POST /api/projects/:projectId/github-sync-backlog
 */
const syncBacklogWithGitHub = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const tenantId = req.user.tenant_id;

        // 🔥 BINDING SAAS SECURITY
        if (!checkGitHubPackagePermission(req, res)) return;

        const [projectCheck] = await db.query('SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?', [projectId, tenantId]);
        if (projectCheck.length === 0) return res.status(403).json({ success: false, message: 'Akses Ditolak.' });

        const [integrations] = await db.query(
            'SELECT github_owner, github_repo, access_token FROM tbr_github_integrations WHERE project_id = ? AND status = "Active" LIMIT 1',
            [projectId]
        );

        if (integrations.length === 0) {
            return res.status(404).json({ success: false, message: 'Koneksi repositori tidak aktif.' });
        }

        const { github_owner, github_repo, access_token } = integrations[0];
        
        // 🔥 FIX SINKRONISASI: Mengubah 'title' menjadi kolom skema tabel asli Anda yaitu 'name'
        const [backlogs] = await db.query('SELECT id, name, description FROM tbr_backlogs WHERE project_id = ?', [projectId]);

        for (const backlog of backlogs) {
            await axios.post(
                `https://api.github.com/repos/${github_owner}/${github_repo}/issues`,
                { title: backlog.name, body: backlog.description || 'Synced from ScrumApps Backlog' },
                { 
                    headers: { 
                        Authorization: `token ${access_token}`, 
                        Accept: 'application/vnd.github.v3+json',
                        'User-Agent': 'ScrumApps-Backend'
                    } 
                }
            );
        }

        return res.status(200).json({ success: true, message: `Sukses melakukan sinkronisasi ${backlogs.length} item ke GitHub Issues.` });
    } catch (error) {
        console.error('🔥 Error di syncBacklogWithGitHub:', error.message);
        return res.status(500).json({ success: false, message: 'Gagal melakukan sinkronisasi backlog.' });
    }
};

/**
 * 10. Konfigurasi Webhook Repositori Otomatis (Akses: Admin Workspace / PO)
 * POST /api/projects/:projectId/github-webhooks
 */
const configureWebhook = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const tenantId = req.user.tenant_id;

        if (!checkGitHubPackagePermission(req, res)) return;

        const [projectCheck] = await db.query('SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?', [projectId, tenantId]);
        if (projectCheck.length === 0) return res.status(403).json({ success: false, message: 'Akses Ilegal.' });

        const [integrations] = await db.query(
            'SELECT id, github_owner, github_repo, access_token FROM tbr_github_integrations WHERE project_id = ? AND status = "Active" LIMIT 1',
            [projectId]
        );

        if (integrations.length === 0) {
            return res.status(404).json({ success: false, message: 'Integrasi repositori tidak aktif.' });
        }

        const { github_owner, github_repo, access_token } = integrations[0];
        
        const baseUrl = process.env.BACKEND_APP_URL || 'http://localhost:5000';
        const webhookUrl = `${baseUrl}/api/projects/${projectId}/github-link-action`;

        try {
            const githubResponse = await axios.post(
                `https://api.github.com/repos/${github_owner}/${github_repo}/hooks`,
                {
                    name: 'web',
                    active: true,
                    events: ['push', 'pull_request'],
                    config: { 
                        url: webhookUrl, 
                        content_type: 'json', 
                        inbound_auth: 'none' 
                    }
                },
                { 
                    headers: { 
                        Authorization: `token ${access_token}`, 
                        Accept: 'application/vnd.github.v3+json',
                        'User-Agent': 'ScrumApps-Backend'
                    } 
                }
            );

            return res.status(200).json({ success: true, message: 'GitHub Webhook berhasil dikonfigurasi otomatis!', data: githubResponse.data });
        } catch (githubError) {
            if (githubError.response?.data?.message?.includes('already exists')) {
                return res.status(409).json({ success: false, message: 'Webhook sudah terdaftar di repositori GitHub ini.' });
            }
            return res.status(400).json({ success: false, message: 'Gagal mendaftarkan webhook otomatis ke repositori GitHub.' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * 11. Mengelola / Memperbarui Personal Access Token (PAT) secara Manual
 * POST /api/projects/:projectId/github-pat
 */
const managePAT = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { personal_access_token } = req.body;
        const tenantId = req.user.tenant_id;

        if (!checkGitHubPackagePermission(req, res)) return;

        const [projectCheck] = await db.query('SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?', [projectId, tenantId]);
        if (projectCheck.length === 0) return res.status(403).json({ success: false, message: 'Akses Ditolak.' });

        if (!personal_access_token) {
            return res.status(400).json({ success: false, message: 'Token PAT baru wajib disertakan.' });
        }

        const [result] = await db.query(
            'UPDATE tbr_github_integrations SET access_token = ?, status = "Active" WHERE project_id = ?',
            [personal_access_token, projectId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Referensi integrasi proyek tidak ditemukan.' });
        }

        return res.status(200).json({ success: true, message: 'Personal Access Token (PAT) berhasil diperbarui.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal memperbarui data PAT.' });
    }
};

/**
 * 12. Menghubungkan Akun Personal GitHub Developer ke Profil Akun Internal
 * POST /api/projects/github/connect-personal
 */
const connectPersonalAccount = async (req, res, next) => {
    try {
        const { github_username } = req.body;
        const userId = req.user?.id;

        if (!github_username) {
            return res.status(400).json({ success: false, message: 'Username GitHub personal diperlukan.' });
        }

        await db.query('UPDATE tbr_users SET github_username = ? WHERE id = ?', [github_username.trim(), userId]);
        return res.status(200).json({ success: true, message: 'Akun personal GitHub berhasil ditautkan ke profil developer Anda.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Gagal menghubungkan akun GitHub personal.' });
    }
};

/**
 * 13. Webhook Receiver: Menghubungkan Commit/PR & Auto Update Kanban (Bypass Token check)
 * POST /api/projects/:projectId/github-link-action
 */
const linkGitActionToKanban = async (req, res, next) => {
    try {
        const { commits, pull_request, action } = req.body;
        let commitMessage = '';

        if (commits && commits.length > 0) {
            commitMessage = commits[0].message; 
        } 
        else if (pull_request && action === 'closed' && pull_request.merged === true) {
            commitMessage = pull_request.title;
        }

        if (!commitMessage) {
            return res.status(200).json({ success: true, message: 'Webhook received but no action required.' });
        }

        // Ekspresi Regex mendeteksi tag manual '[Task-ID]' di pesan git commit
        const match = commitMessage.match(/\[Task-(\d+)\]/i);

        if (match) {
            const taskId = match[1];
            
            // Otomatis menggeser kartu Kanban manual pengerjaan developer ke kolom DONE
            const [updateResult] = await db.query(
                "UPDATE tbr_developments SET status = 'DONE', updated_at = NOW() WHERE id = ?", 
                [taskId]
            );

            if (updateResult.affectedRows > 0) {
                console.log(`✅ Kanban Terupdate Otomatis via GitHub Webhook: Task #${taskId} -> DONE`);
            }
        }

        return res.status(200).json({ success: true, message: 'Webhook payload berhasil diproses.' });
    } catch (error) {
        console.error('🔥 Error di linkGitActionToKanban Webhook:', error.message);
        return res.status(500).json({ success: false, message: 'Sistem internal gagal mengolah payload webhook.' });
    }
};

module.exports = {
    getIntegrationByProject,
    createIntegrationRequest,
    getGitHubOAuthUrl,
    getAllIntegrationRequests,
    rejectIntegrationRequest,
    disconnectGitHub,
    handleGitHubCallback,
    getRepoActivity,
    syncBacklogWithGitHub,
    configureWebhook,
    managePAT,
    connectPersonalAccount,
    linkGitActionToKanban
};