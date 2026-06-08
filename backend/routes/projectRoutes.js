const express = require('express');
const router = express.Router();

const { verifyToken, authorize } = require('../middleware/auth');
const projectController = require('../controllers/projectController');
const teamController = require('../controllers/teamController');
const githubController = require('../controllers/githubController'); 

/* =====================================================
    🔓 PUBLIC / EXTERNAL ROUTES (TANPA TOKEN JWT)
    (Taruh sebelum router.use(verifyToken) agar tidak ter-block)
   ===================================================== */

// 🛠️ Dipanggil langsung oleh GitHub setelah proses OAuth berhasil
router.get('/github/callback', githubController.handleGitHubCallback);

// 📬 Webhook Receiver: Menerima payload Event Push/PR dari GitHub untuk Auto Update Kanban
// (Harus publik karena ditembak langsung oleh server GitHub global)
router.post('/:projectId/github-link-action', githubController.linkGitActionToKanban);


/* =====================================================
    🔒 PROTECTED ROUTES (Semua rute di bawah wajib login JWT)
   ===================================================== */
router.use(verifyToken);

/* =====================================================
    PROJECT CORE ROUTES (CRUD & Dashboard Stats)
   ===================================================== */
router.get('/stats', projectController.getProjectStats);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', authorize(['superadmin', 'project_owner']), projectController.createProject);
router.put('/:id', authorize(['superadmin', 'project_owner']), projectController.updateProject);
router.delete('/:id', authorize(['superadmin']), projectController.deleteProject);

/* =====================================================
    GITHUB INTEGRATION ROUTES 🌟 (MATRIKS HAK AKSES BARU)
   ===================================================== */

// 1. Mengambil status integrasi spesifik milik satu proyek
// Boleh diakses oleh: Superadmin, Business Analyst, Developer, Project Owner
router.get('/:projectId/github-status', 
    authorize(['superadmin', 'businessanalyst', 'developer', 'project_owner']), 
    githubController.getIntegrationByProject
);

// 2. Mengambil aktivitas commit terbaru dari repo yang aktif
// Boleh diakses oleh: Superadmin, Business Analyst, Developer, Project Owner
router.get('/:projectId/github-activity', 
    authorize(['superadmin', 'businessanalyst', 'developer', 'project_owner']), 
    githubController.getRepoActivity
);

// 3. Mengajukan integrasi repositori baru
// Boleh diakses oleh: Business Analyst (Superadmin otomatis bypass)
router.post('/:projectId/github-requests', 
    authorize(['superadmin', 'businessanalyst']), 
    githubController.createIntegrationRequest
);

// 4. Menyelaraskan (Sync) Backlog internal dengan GitHub Issues
// Boleh diakses oleh: Business Analyst (Superadmin otomatis bypass)
router.post('/:projectId/github-sync-backlog', 
    authorize(['superadmin', 'businessanalyst']), 
    githubController.syncBacklogWithGitHub
);

// 5. Mengambil URL OAuth GitHub untuk proses otentikasi
// Boleh diakses oleh: Hanya Superadmin secara mutlak
router.get('/github/oauth-url', 
    authorize(['superadmin']), 
    githubController.getGitHubOAuthUrl
);

// 6. Mengambil seluruh riwayat pengajuan integrasi dari semua proyek
// Boleh diakses oleh: Hanya Superadmin secara mutlak
router.get('/github/requests', 
    authorize(['superadmin']), 
    githubController.getAllIntegrationRequests
);

// 7. Menolak pengajuan integrasi repositori
// Boleh diakses oleh: Hanya Superadmin secara mutlak
router.put('/github/requests/:id/reject', 
    authorize(['superadmin']), 
    githubController.rejectIntegrationRequest
);

// 8. Memutuskan hubungan repositori dengan proyek (Disconnect)
// Boleh diakses oleh: Hanya Superadmin secara mutlak
router.delete('/github/integrations/:id', 
    authorize(['superadmin']), 
    githubController.disconnectGitHub
);

// 9. Konfigurasi Webhook Repositori Otomatis
// Boleh diakses oleh: Hanya Superadmin secara mutlak
router.post('/:projectId/github-webhooks', 
    authorize(['superadmin']), 
    githubController.configureWebhook
);

// 10. Mengelola / Memperbarui Personal Access Token (PAT) secara Manual
// Boleh diakses oleh: Hanya Superadmin secara mutlak
router.post('/:projectId/github-pat', 
    authorize(['superadmin']), 
    githubController.managePAT
);

// 11. Menghubungkan Akun Personal GitHub Developer ke Profil Akun Internal
// Boleh diakses oleh: Developer (Superadmin otomatis bypass)
router.post('/github/connect-personal', 
    authorize(['superadmin', 'developer']), 
    githubController.connectPersonalAccount
);

/* =====================================================
    TEAM ROUTES
   ===================================================== */
router.get('/:projectId/members', teamController.getTeamByProject);
router.post('/:projectId/members', authorize(['superadmin']), teamController.addTeamMember);
router.put('/:projectId/members/:memberId', authorize(['superadmin']), teamController.updateTeamMember);
router.delete('/:projectId/members/:memberId', authorize(['superadmin']), teamController.deleteTeamMember);

/* =====================================================
    BACKLOG ROUTES (ALL ROLES ACCESS)
   ===================================================== */
router.get('/:projectId/backlogs', projectController.getProjectBacklogs);
router.post('/:projectId/backlogs', projectController.createBacklog);
router.put('/backlogs/:id', projectController.updateBacklog);
router.delete('/backlogs/:id', projectController.deleteBacklog);

/* =====================================================
    SPRINT ROUTES (ALL ROLES ACCESS)
   ===================================================== */
router.get('/:projectId/sprints', projectController.getProjectSprints);
router.post('/:projectId/sprints', projectController.createSprint);
router.delete('/:projectId/sprints/:sprintId', projectController.deleteSprint);

/* =====================================================
    DEVELOPMENT / TASK ROUTES (ALL ROLES ACCESS)
   ===================================================== */
router.get('/:projectId/developments', projectController.getProjectDevelopments);
router.post('/:projectId/developments', projectController.createDevelopment);
router.patch('/developments/:devId/status', projectController.updateDevelopmentStatus);
router.delete('/developments/:devId', projectController.deleteDevelopment);

/* =====================================================
    VISION BOARD ROUTES (ALL ROLES ACCESS)
   ===================================================== */
router.get('/:projectId/vision-boards', projectController.getProjectVisions);
router.post('/:projectId/vision-boards', projectController.createVision);
router.put('/vision-boards/:id', projectController.updateVision);
router.delete('/vision-boards/:id', projectController.deleteVision);

/* =====================================================
    ACTIVITY LOG ROUTES
   ===================================================== */
router.get('/:projectId/logs', projectController.getProjectLogs);

module.exports = router;