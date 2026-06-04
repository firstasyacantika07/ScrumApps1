// src/constants/plans.js
export const PLAN_LIMITS = {
  FREE: {
    maxProjects: 1,
    maxTeam: 5,
    watermark: true,
    integrations: []
  },
  PRO: {
    maxProjects: 15,
    maxTeam: 25,
    watermark: false,
    integrations: ['Trello']
  },
  ENTERPRISE: {
    maxProjects: Infinity,
    maxTeam: Infinity,
    watermark: false,
    integrations: ['Trello', 'Github'],
    customLogo: true
  }
};