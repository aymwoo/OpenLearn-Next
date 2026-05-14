export const THEME_LAYOUT_REGION_KEYS = [
  "primary-nav",
  "secondary-nav",
  "page-header",
  "main-content",
  "context-panel",
  "page-footer",
] as const;

export const THEME_LAYOUT_REQUIRED_REGIONS = ["primary-nav", "page-header", "main-content"] as const;

export const THEME_PAGE_MODULE_KEYS = [
  "workspace-nav",
  "workspace-status",
  "page-title",
  "page-actions",
  "dashboard-overview",
  "trend-overview",
  "class-list",
  "course-list",
  "course-detail",
  "lesson-list",
  "student-directory",
  "review-queue",
  "launch-panel",
  "editor-workspace",
  "settings-general",
  "settings-labs",
  "plugin-marketplace",
  "resource-library",
  "help-overview",
  "help-guide-detail",
  "help-faq",
  "status-footer",
] as const;

export const TEACHER_THEME_ROUTE_KEYS = [
  "/teacher",
  "/teacher/classes",
  "/teacher/courses",
  "/teacher/courses/[courseId]",
  "/teacher/courses/[courseId]/lessons",
  "/teacher/students",
  "/teacher/trends",
  "/teacher/review",
  "/teacher/launch",
  "/teacher/editor",
  "/settings",
  "/settings/labs",
  "/settings/plugins",
  "/resources",
  "/help",
  "/help/auth",
  "/help/actions",
  "/help/classroom",
  "/help/dal",
  "/help/faq",
  "/help/plugins",
  "/help/schedule",
  "/help/themes",
  "/help/actions-interfaces",
] as const;

export type ThemeLayoutRegionKey = (typeof THEME_LAYOUT_REGION_KEYS)[number];
export type ThemePageModuleKey = (typeof THEME_PAGE_MODULE_KEYS)[number];
export type TeacherThemeRouteKey = (typeof TEACHER_THEME_ROUTE_KEYS)[number];
export type ThemeShellMode = "left-nav" | "top-nav" | "top-nav-secondary-rail";
export type ThemeLayoutSplit = "30/70" | "40/60" | "50/50" | "60/40";
export type ShellRadius = "rounded" | "square";
export type ShellWidth = "default" | "full-width";
export type ShellChrome = "default" | "immersive" | "minimal" | "presentation" | "fullscreen" | "focus";

export type TeacherThemeRouteSurface = {
  label: string;
  defaultSplit: ThemeLayoutSplit;
  allowedModules: readonly ThemePageModuleKey[];
  shell: {
    mode: ThemeShellMode;
    radius: ShellRadius;
    width: ShellWidth;
    chrome: ShellChrome;
  };
};

export const TEACHER_THEME_ROUTE_SURFACES: Record<TeacherThemeRouteKey, TeacherThemeRouteSurface> = {
  "/teacher": {
    label: "教师工作台",
    defaultSplit: "60/40",
    allowedModules: ["dashboard-overview"],
    shell: {
      mode: "left-nav",
      radius: "square",
      width: "full-width",
      chrome: "immersive",
    },
  },
  "/teacher/classes": {
    label: "班级管理",
    defaultSplit: "60/40",
    allowedModules: ["class-list"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/teacher/courses": {
    label: "课程管理",
    defaultSplit: "60/40",
    allowedModules: ["course-list"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/teacher/courses/[courseId]": {
    label: "课程详情",
    defaultSplit: "60/40",
    allowedModules: ["course-detail"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/teacher/courses/[courseId]/lessons": {
    label: "课时管理",
    defaultSplit: "60/40",
    allowedModules: ["lesson-list"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/teacher/students": {
    label: "学生档案",
    defaultSplit: "60/40",
    allowedModules: ["student-directory"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/teacher/trends": {
    label: "班级趋势",
    defaultSplit: "60/40",
    allowedModules: ["trend-overview"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/teacher/review": {
    label: "批改中心",
    defaultSplit: "60/40",
    allowedModules: ["review-queue"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/teacher/launch": {
    label: "课堂准备",
    defaultSplit: "50/50",
    allowedModules: ["launch-panel"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/teacher/editor": {
    label: "课时编辑",
    defaultSplit: "60/40",
    allowedModules: ["editor-workspace"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/settings": {
    label: "系统设置",
    defaultSplit: "60/40",
    allowedModules: ["settings-general"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/settings/labs": {
    label: "实验室布局管理",
    defaultSplit: "60/40",
    allowedModules: ["settings-labs"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/settings/plugins": {
    label: "插件市场",
    defaultSplit: "60/40",
    allowedModules: ["plugin-marketplace"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/resources": {
    label: "资源中心",
    defaultSplit: "60/40",
    allowedModules: ["resource-library"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/help": {
    label: "帮助中心",
    defaultSplit: "60/40",
    allowedModules: ["help-overview"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/help/auth": {
    label: "认证系统指南",
    defaultSplit: "60/40",
    allowedModules: ["help-guide-detail"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/help/actions": {
    label: "Server Actions 指南",
    defaultSplit: "60/40",
    allowedModules: ["help-guide-detail"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/help/classroom": {
    label: "课堂系统指南",
    defaultSplit: "60/40",
    allowedModules: ["help-guide-detail"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/help/dal": {
    label: "DAL 层指南",
    defaultSplit: "60/40",
    allowedModules: ["help-guide-detail"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/help/faq": {
    label: "常见问题",
    defaultSplit: "60/40",
    allowedModules: ["help-faq"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/help/plugins": {
    label: "插件开发指南",
    defaultSplit: "60/40",
    allowedModules: ["help-guide-detail"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/help/schedule": {
    label: "课表与趋势指南",
    defaultSplit: "60/40",
    allowedModules: ["help-guide-detail"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/help/themes": {
    label: "主题开发指南",
    defaultSplit: "60/40",
    allowedModules: ["help-guide-detail"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
  "/help/actions-interfaces": {
    label: "Actions 与 Interfaces 指南",
    defaultSplit: "60/40",
    allowedModules: ["help-guide-detail"],
    shell: {
      mode: "left-nav",
      radius: "rounded",
      width: "default",
      chrome: "default",
    },
  },
};

export function resolveTeacherThemeRouteSurface(pathname: string | null | undefined): TeacherThemeRouteKey {
  if (!pathname) {
    return "/teacher";
  }

  if (/^\/teacher\/courses\/[^/]+\/lessons(?:\/.*)?$/.test(pathname)) {
    return "/teacher/courses/[courseId]/lessons";
  }

  if (/^\/teacher\/courses\/[^/]+$/.test(pathname)) {
    return "/teacher/courses/[courseId]";
  }

  if (pathname.startsWith("/teacher/editor")) {
    return "/teacher/editor";
  }

  if (pathname.startsWith("/teacher/launch")) {
    return "/teacher/launch";
  }

  if (pathname.startsWith("/teacher/review")) {
    return "/teacher/review";
  }

  if (pathname.startsWith("/teacher/trends")) {
    return "/teacher/trends";
  }

  if (pathname.startsWith("/teacher/students")) {
    return "/teacher/students";
  }

  if (pathname.startsWith("/teacher/classes")) {
    return "/teacher/classes";
  }

  if (pathname.startsWith("/teacher/courses")) {
    return "/teacher/courses";
  }

  if (pathname.startsWith("/settings/plugins")) {
    return "/settings/plugins";
  }

  if (pathname.startsWith("/settings/labs")) {
    return "/settings/labs";
  }

  if (pathname.startsWith("/settings")) {
    return "/settings";
  }

  if (pathname.startsWith("/resources")) {
    return "/resources";
  }

  if (pathname.startsWith("/help/auth")) {
    return "/help/auth";
  }

  if (pathname.startsWith("/help/actions")) {
    return "/help/actions";
  }

  if (pathname.startsWith("/help/classroom")) {
    return "/help/classroom";
  }

  if (pathname.startsWith("/help/dal")) {
    return "/help/dal";
  }

  if (pathname.startsWith("/help/faq")) {
    return "/help/faq";
  }

  if (pathname.startsWith("/help/plugins")) {
    return "/help/plugins";
  }

  if (pathname.startsWith("/help/schedule")) {
    return "/help/schedule";
  }

  if (pathname.startsWith("/help/themes")) {
    return "/help/themes";
  }

  if (pathname.startsWith("/help/actions-interfaces")) {
    return "/help/actions-interfaces";
  }

  if (pathname.startsWith("/help")) {
    return "/help";
  }

  if (pathname.startsWith("/teacher")) {
    return "/teacher";
  }

  return "/teacher";
}
