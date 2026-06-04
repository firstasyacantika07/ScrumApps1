const express = require('express');
const router = express.Router();

const { verifyToken, authorize } = require('../middleware/auth');
const projectController = require('../controllers/projectController');
const teamController = require('../controllers/teamController');

// Semua route di bawah ini membutuhkan login
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
// Menggunakan ':projectId' agar serasi dengan sub-routing managemen lainnya
router.get('/:projectId/logs', projectController.getProjectLogs);

module.exports = router;