const express = require('express');
const router = express.Router();

const { verifyToken, authorize } = require('../middleware/auth');
// 🔥 IMPORT: Daftarkan satpam pemblokir kuota data paket langganan
const { checkProjectLimit, checkTeamLimit } = require('../middleware/SubscriptionsMiddleware');

const projectController = require('../controllers/projectController');
const backlogController = require('../controllers/backlogController'); // ✨ TAMBAHAN: Import Backlog Controller Baru
const teamController = require('../controllers/teamController');
const githubController = require('../controllers/githubController'); 

/* =====================================================
    🔓 PUBLIC / EXTERNAL ROUTES (TANPA TOKEN JWT)
   ===================================================== */

// Dipanggil langsung oleh GitHub setelah proses OAuth berhasil
router.get('/github/callback', githubController.handleGitHubCallback);

// Webhook Receiver: Menerima payload Event Push/PR dari GitHub untuk Auto Update Kanban
router.post('/:projectId/github-link-action', githubController.linkGitActionToKanban);


/* =====================================================
    🔒 PROTECTED ROUTES (Semua rute di bawah wajib login JWT)
   ===================================================== */
router.use(verifyToken);


/* =====================================================
    ⭐ STATIS / GLOBAL DASHBOARD ROUTES (WAJIB DI PALING ATAS)
    Pencegahan Route Collision agar string tidak terbaca sebagai :projectId
   ===================================================== */

// 📊 Rute Baru: Statistik Grafik Scrum Dashboard (Sesuai dengan axios frontend)
router.get('/workspace/scrum/stats', 
    authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst', 'teamdeveloper']), 
    projectController.getWorkspaceScrumStats
);

// 📈 Rute: Statistik Global Jumlah Project/Sprint/Task
router.get('/stats', projectController.getProjectStats);

// 📂 Rute: Mengambil list seluruh proyek milik tenant
router.get('/', projectController.getProjects);


/* =====================================================
    🌟 GITHUB INTEGRATION STATIS (Harus di atas Wildcard /:id)
   ===================================================== */

// Mengambil URL OAuth GitHub untuk proses otentikasi
router.get('/github/oauth-url', 
    authorize(['superadmin']), 
    githubController.getGitHubOAuthUrl
);

// Mengambil seluruh riwayat pengajuan integrasi dari semua proyek
router.get('/github/requests', 
    authorize(['superadmin']), 
    githubController.getAllIntegrationRequests
);

// Menolak pengajuan integrasi repositori
router.put('/github/requests/:id/reject', 
    authorize(['superadmin']), 
    githubController.rejectIntegrationRequest
);

// Memutuskan hubungan repositori dengan proyek (Disconnect)
router.delete('/github/integrations/:id', 
    authorize(['superadmin']), 
    githubController.disconnectGitHub
);

// Menghubungkan Akun Personal GitHub Developer ke Profil Akun Internal
router.post('/github/connect-personal', 
    authorize(['superadmin', 'teamdeveloper']), 
    githubController.connectPersonalAccount
);


/* =====================================================
    🛠️ SHORT FALLBACK ROUTES (WAJIB DI ATAS WILDCARD /:id)
   ===================================================== */
// ✨ REVISI: Mengalihkan target eksekusi pendek ke backlogController baru
router.put('/backlogs/:id', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst']), backlogController.updateBacklog);
router.delete('/backlogs/:id', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst']), backlogController.deleteBacklog);

router.put('/vision-boards/:id', projectController.updateVision);
router.delete('/vision-boards/:id', projectController.deleteVision);


/* =====================================================
    TEAM ROUTES & TEAM LIMITATION SECURITY
   ===================================================== */
router.get('/:projectId/members', teamController.getTeamByProject);

// 🔥 REVISI: Tambahkan checkTeamLimit untuk mengunci kuota anggota (FREE maks 5, PRO maks 25)
router.post('/:projectId/members', authorize(['superadmin', 'admin']), checkTeamLimit, teamController.addTeamMember);
router.put('/:projectId/members/:memberId', authorize(['superadmin', 'admin']), teamController.updateTeamMember);
router.delete('/:projectId/members/:memberId', authorize(['superadmin', 'admin']), teamController.deleteTeamMember);


/* =====================================================
    BACKLOG ROUTES (Hanya PO & BA yang bisa memanipulasi)
   ===================================================== */
// ✨ REVISI TOTAL: Dialihkan ke backlogController baru & penambahan rute cetak PDF laporan
router.get('/:projectId/backlogs', backlogController.getBacklogsByProject);
router.get('/:projectId/backlogs/export-pdf', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst', 'teamdeveloper']), backlogController.exportBacklogToPDF);
router.post('/:projectId/backlogs', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst']), backlogController.createBacklog);
router.put('/:projectId/backlogs/:id', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst']), backlogController.updateBacklog); 
router.delete('/:projectId/backlogs/:id', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst']), backlogController.deleteBacklog); 


/* =====================================================
    SPRINT ROUTES (PO & BA Access Manual)
   ===================================================== */
router.get('/:projectId/sprints', projectController.getProjectSprints);
router.post('/:projectId/sprints', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst']), projectController.createSprint);
router.put('/:projectId/sprints/:id', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst']), projectController.updateSprint);
router.delete('/:projectId/sprints/:id', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst']), projectController.deleteSprint); 


/* =====================================================
    DEVELOPMENT / TASK ROUTES (All Scrum Roles Access)
   ===================================================== */
router.get('/:projectId/developments', projectController.getProjectDevelopments);
router.post('/:projectId/developments', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst', 'teamdeveloper']), projectController.createDevelopment);
router.put('/:projectId/developments/:devId', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst', 'teamdeveloper']), projectController.updateDevelopmentStatus);
router.delete('/:projectId/developments/:devId', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst', 'teamdeveloper']), projectController.deleteDevelopment);


/* =====================================================
    VISION BOARD ROUTES (PO & Admin Manual Access)
   ===================================================== */
router.get('/:projectId/vision-boards', projectController.getProjectVisions);
router.post('/:projectId/vision-boards', authorize(['superadmin', 'admin', 'projectowner']), projectController.createVision);
router.put('/:projectId/vision-boards/:id', authorize(['superadmin', 'admin', 'projectowner']), projectController.updateVision); 
router.delete('/:projectId/vision-boards/:id', authorize(['superadmin', 'admin', 'projectowner']), projectController.deleteVision); 


/* =====================================================
    ACTIVITY LOG ROUTES
   ===================================================== */
router.get('/:projectId/logs', projectController.getProjectLogs);


/* =====================================================
    GITHUB INTEGRATION DINAMIS (BERBASIS PROJECT ID)
   ===================================================== */
router.get('/:projectId/github-status', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst', 'teamdeveloper']), githubController.getIntegrationByProject);
router.get('/:projectId/github-activity', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst', 'teamdeveloper']), githubController.getRepoActivity);
router.post('/:projectId/github-requests', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst']), githubController.createIntegrationRequest);
router.post('/:projectId/github-sync-backlog', authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst']), githubController.syncBacklogWithGitHub);
router.post('/:projectId/github-webhooks', authorize(['superadmin', 'admin']), githubController.configureWebhook);
router.post('/:projectId/github-pat', authorize(['superadmin', 'admin']), githubController.managePAT);


/* =====================================================
    🌟 PROJECT ID WILDCARD (TARUH PALING BAWAH)
   ===================================================== */
// 🔥 REVISI: Pintu pembuatan proyek disisipkan checkProjectLimit (FREE maks 1, PRO maks 15)
router.post('/', authorize(['superadmin', 'admin', 'projectowner']), checkProjectLimit, projectController.createProject);

router.get('/:id', projectController.getProjectById);
router.put('/:id', authorize(['superadmin', 'admin', 'projectowner']), projectController.updateProject);
router.delete('/:id', authorize(['superadmin', 'admin']), projectController.deleteProject);

module.exports = router;