const express = require('express');

const router = express.Router();

const {
  getMembers,
  createMember,
  updateMember,
  deleteMember
} = require('../controllers/projectMemberController');

/* ======================================================
   ROUTES
====================================================== */

// GET ALL MEMBERS
router.get(
  '/projects/:projectId/members',
  getMembers
);

// CREATE MEMBER
router.post(
  '/projects/:projectId/members',
  createMember
);

// UPDATE MEMBER
router.put(
  '/projects/:projectId/members/:id',
  updateMember
);

// DELETE MEMBER
router.delete(
  '/projects/:projectId/members/:id',
  deleteMember
);

module.exports = router;