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
router.post('/:projectId/github-link-action', githubController.linkGitActionToKanban);


/* =====================================================
    🔒 PROTECTED ROUTES (Semua rute di bawah wajib login JWT)
   ===================================================== */
router.use(verifyToken);


/* =====================================================
    🌟 GITHUB INTEGRATION STATIS (Harus di atas Wildcard /:id)
   ===================================================== */

// 5. Mengambil URL OAuth GitHub untuk proses otentikasi
router.get('/github/oauth-url', 
    authorize(['superadmin']), 
    githubController.getGitHubOAuthUrl
);

// 6. Mengambil seluruh riwayat pengajuan integrasi dari semua proyek
router.get('/github/requests', 
    authorize(['superadmin']), 
    githubController.getAllIntegrationRequests
);

// 7. Menolak pengajuan integrasi repositori
router.put('/github/requests/:id/reject', 
    authorize(['superadmin']), 
    githubController.rejectIntegrationRequest
);

// 8. Memutuskan hubungan repositori dengan proyek (Disconnect)
router.delete('/github/integrations/:id', 
    authorize(['superadmin']), 
    githubController.disconnectGitHub
);

// 11. Menghubungkan Akun Personal GitHub Developer ke Profil Akun Internal
router.post('/github/connect-personal', 
    authorize(['superadmin', 'developer']), 
    githubController.connectPersonalAccount
);


/* =====================================================
    🛠️ SHORT FALLBACK ROUTES (WAJIB DI ATAS WILDCARD /:id)
    Menyelamatkan request rute pendek agar tidak tertangkap oleh /:id
   ===================================================== */

// ⚙️ Backlog Pendek (Mengatasi PUT & DELETE /api/projects/backlogs/:id)
router.put('/backlogs/:id', projectController.updateBacklog);
router.delete('/backlogs/:id', projectController.deleteBacklog);

// ⚙️ Vision Board Pendek (Mengatasi PUT & DELETE /api/projects/vision-boards/:id)
router.put('/vision-boards/:id', projectController.updateVision);
router.delete('/vision-boards/:id', projectController.deleteVision);


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
router.put('/:projectId/backlogs/:id', projectController.updateBacklog); 
router.delete('/:projectId/backlogs/:id', projectController.deleteBacklog); 


/* =====================================================
    SPRINT ROUTES (ALL ROLES ACCESS)
   ===================================================== */
router.get('/:projectId/sprints', projectController.getProjectSprints);
router.post('/:projectId/sprints', projectController.createSprint);

// ✨ FIX: Menambahkan method PUT untuk update data sprint (Mengatasi error 404 PUT /api/projects/32/sprints/8)
router.put('/:projectId/sprints/:id', projectController.updateSprint);

router.delete('/:projectId/sprints/:sprintId', projectController.deleteSprint);
router.delete('/:projectId/sprints/:id', projectController.deleteSprint); 


/* =====================================================
    DEVELOPMENT / TASK ROUTES (ALL ROLES ACCESS)
   ===================================================== */
router.get('/:projectId/developments', projectController.getProjectDevelopments);
router.post('/:projectId/developments', projectController.createDevelopment);
router.put('/:projectId/developments/:devId', projectController.updateDevelopmentStatus);
router.delete('/:projectId/developments/:devId', projectController.deleteDevelopment);


/* =====================================================
    VISION BOARD ROUTES (ALL ROLES ACCESS)
   ===================================================== */
router.get('/:projectId/vision-boards', projectController.getProjectVisions);
router.post('/:projectId/vision-boards', projectController.createVision);
router.put('/:projectId/vision-boards/:id', projectController.updateVision); 
router.delete('/:projectId/vision-boards/:id', projectController.deleteVision); 


/* =====================================================
    ACTIVITY LOG ROUTES
   ===================================================== */
router.get('/:projectId/logs', projectController.getProjectLogs);


/* =====================================================
    GITHUB INTEGRATION DINAMIS (BERBASIS PROJECT ID)
   ===================================================== */
router.get('/:projectId/github-status', authorize(['superadmin', 'businessanalyst', 'developer', 'project_owner']), githubController.getIntegrationByProject);
router.get('/:projectId/github-activity', authorize(['superadmin', 'businessanalyst', 'developer', 'project_owner']), githubController.getRepoActivity);
router.post('/:projectId/github-requests', authorize(['superadmin', 'businessanalyst']), githubController.createIntegrationRequest);
router.post('/:projectId/github-sync-backlog', authorize(['superadmin', 'businessanalyst']), githubController.syncBacklogWithGitHub);
router.post('/:projectId/github-webhooks', authorize(['superadmin']), githubController.configureWebhook);
router.post('/:projectId/github-pat', authorize(['superadmin']), githubController.managePAT);


/* =====================================================
    🌟 PROJECT CORE ROUTES (DI TARUH PALING BAWAH)
    Semua rute statis dan nested harus dideklarasikan SEBELUM rute ini.
   ===================================================== */
router.get('/stats', projectController.getProjectStats);
router.get('/', projectController.getProjects);

// 🛠️ SINKRONISASI SAAS: Pembuatan proyek dikunci hanya untuk SUPERADMIN Tenant pembeli paket langganan
router.post('/', authorize(['superadmin']), projectController.createProject);

// 💡 Wildcard utama ditaruh di akhir agar tidak mencegat sub-route / nested route di atas
router.get('/:id', projectController.getProjectById);

// 🛠️ SINKRONISASI TEAM: Diizinkan untuk semua role karena pengecekan relasi tim diatur di dalam projectController
router.put('/:id', projectController.updateProject);

router.delete('/:id', authorize(['superadmin']), projectController.deleteProject);

module.exports = router;