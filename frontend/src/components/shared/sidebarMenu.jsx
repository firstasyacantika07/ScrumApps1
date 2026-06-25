import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Info,
  Settings,
  CreditCard,
  Eye,
  Target,
  RefreshCw,
  ClipboardList,
  Code2,
  Calendar,
  Bell,
  Activity,
  Building2,
  Receipt,
  CodeSquare
} from "lucide-react";

/* =========================================================
   ROLE CONSTANT
========================================================= */
export const ROLES = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin", 
  PROJECT_OWNER: "ProjectOwner",
  TEAM_DEVELOPER: "teamDeveloper",
  BUSINESS_ANALYST: "BusinessAnalyst"
};

/* =========================================================
   GLOBAL SIDEBAR MENU
========================================================= */
export const globalSidebarMenu = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN, 
      ROLES.TEAM_DEVELOPER,
      ROLES.BUSINESS_ANALYST
    ]
  },

  /* 🏢 KHUSUS SUPERADMIN: Kelola Seluruh Tenant/Perusahaan SaaS */
  {
    label: "Perusahaan SaaS",
    path: "/companies",
    icon: Building2,
    roles: [ROLES.SUPERADMIN]
  },

  /* 💳 KHUSUS SUPERADMIN: Tracker Billing & Invoice Global Platform */
  {
    label: "Billing Platform",
    path: "/billing-tracker",
    icon: Receipt,
    roles: [ROLES.SUPERADMIN]
  },

  {
    label: "Proyek",
    path: "/projects",
    icon: FolderKanban,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN, 
      ROLES.TEAM_DEVELOPER,
      ROLES.BUSINESS_ANALYST
    ]
  },

  {
    label: "Kelola Karyawan",
    path: "/users",
    icon: Users,
    roles: [
      ROLES.SUPERADMIN, 
      ROLES.ADMIN 
    ]
  },

  /* 🧾 WORKSPACE BILLING: Pilihan Paket & Langganan milik Admin PT */
  {
    label: "Workspace Billing",
    path: "/billing",
    icon: CreditCard,
    roles: [
      ROLES.SUPERADMIN, 
      ROLES.ADMIN 
    ]
  },

  /* 🛠️ KHUSUS SUPERADMIN: Integrasi Inti GitHub Aplikasi */
  {
    label: "GitHub Integrations",
    path: "/github-integrations",
    icon: CodeSquare,
    roles: [ROLES.SUPERADMIN]
  },

  {
    label: "Informasi Sistem",
    path: "/info",
    icon: Info,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.TEAM_DEVELOPER,
      ROLES.BUSINESS_ANALYST
    ]
  },

  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.TEAM_DEVELOPER,
      ROLES.BUSINESS_ANALYST
    ]
  }
];

/* =========================================================
   PROJECT DETAIL SIDEBAR MENU
========================================================= */
export const projectSidebarMenu = (projectId) => [
  {
    label: "Overview",
    path: `/projects/${projectId}`,
    icon: LayoutDashboard,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN, 
      ROLES.PROJECT_OWNER,
      ROLES.TEAM_DEVELOPER,
      ROLES.BUSINESS_ANALYST
    ]
  },
  {
    label: "Vision Board",
    path: `/projects/${projectId}/vision-board`,
    icon: Eye,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.PROJECT_OWNER,
      ROLES.BUSINESS_ANALYST
    ]
  },
  {
    label: "Backlog",
    path: `/projects/${projectId}/backlog`,
    icon: Target,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.PROJECT_OWNER,
      ROLES.TEAM_DEVELOPER,
      ROLES.BUSINESS_ANALYST
    ]
  },
  {
    label: "Sprint",
    path: `/projects/${projectId}/sprint`,
    icon: RefreshCw,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.PROJECT_OWNER,
      ROLES.TEAM_DEVELOPER
    ]
  },
  {
    label: "Task Board",
    path: `/projects/${projectId}/task-board`,
    icon: ClipboardList,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.PROJECT_OWNER,
      ROLES.TEAM_DEVELOPER
    ]
  },
  {
    label: "Development",
    path: `/projects/${projectId}/development`,
    icon: Code2,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.PROJECT_OWNER,
      ROLES.TEAM_DEVELOPER
    ]
  },
  {
    label: "Calendar",
    path: `/projects/${projectId}/calendar`,
    icon: Calendar,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.PROJECT_OWNER,
      ROLES.TEAM_DEVELOPER,
      ROLES.BUSINESS_ANALYST
    ]
  },
  {
    label: "Members",
    path: `/projects/${projectId}/members`,
    icon: Users,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN, 
      ROLES.PROJECT_OWNER
    ]
  },
  {
    label: "Notifications",
    path: `/projects/${projectId}/notifications`,
    icon: Bell,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.PROJECT_OWNER,
      ROLES.TEAM_DEVELOPER,
      ROLES.BUSINESS_ANALYST
    ]
  },
  {
    label: "Activity Logs",
    path: `/projects/${projectId}/activity-logs`,
    icon: Activity,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN, 
      ROLES.PROJECT_OWNER
    ]
  }
];

/* =========================================================
   SIMPLE SIDEBAR MENU (Fallback / Minimalist View)
========================================================= */
export const sidebarMenu = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.TEAM_DEVELOPER,
      ROLES.BUSINESS_ANALYST
    ]
  },
  {
    label: "Perusahaan SaaS",
    path: "/companies",
    icon: Building2,
    roles: [ROLES.SUPERADMIN]
  },
  {
    label: "Proyek",
    path: "/projects",
    icon: FolderKanban,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.TEAM_DEVELOPER
    ]
  },
  {
    label: "Pengguna",
    path: "/users",
    icon: Users,
    roles: [ROLES.SUPERADMIN, ROLES.ADMIN]
  },
  {
    label: "Informasi Sistem",
    path: "/info",
    icon: Info,
    roles: [
      ROLES.SUPERADMIN,
      ROLES.ADMIN,
      ROLES.TEAM_DEVELOPER,
      ROLES.BUSINESS_ANALYST
    ]
  }
];