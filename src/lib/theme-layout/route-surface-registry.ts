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
  "status-footer",
] as const;

export const TEACHER_THEME_ROUTE_KEYS = [
  "/teacher",
  "/teacher/classes",
  "/teacher/courses",
  "/teacher/courses/[courseId]",
  "/teacher/courses/[courseId]/lessons",
  "/teacher/students",
  "/teacher/review",
  "/teacher/launch",
  "/teacher/editor",
  "/settings",
  "/settings/labs",
  "/settings/plugins",
  "/resources",
] as const;

export type ThemeLayoutRegionKey = (typeof THEME_LAYOUT_REGION_KEYS)[number];
export type ThemePageModuleKey = (typeof THEME_PAGE_MODULE_KEYS)[number];
export type TeacherThemeRouteKey = (typeof TEACHER_THEME_ROUTE_KEYS)[number];
export type ThemeShellMode = "left-nav" | "top-nav" | "top-nav-secondary-rail";
export type ThemeLayoutSplit = "30/70" | "40/60" | "50/50" | "60/40";

type TeacherThemeRouteSurface = {
  label: string;
  defaultSplit: ThemeLayoutSplit;
  allowedModules: readonly ThemePageModuleKey[];
};

export const TEACHER_THEME_ROUTE_SURFACES: Record<TeacherThemeRouteKey, TeacherThemeRouteSurface> = {
  "/teacher": {
    label: "教师工作台",
    defaultSplit: "60/40",
    allowedModules: ["dashboard-overview"],
  },
  "/teacher/classes": {
    label: "班级管理",
    defaultSplit: "60/40",
    allowedModules: ["class-list"],
  },
  "/teacher/courses": {
    label: "课程管理",
    defaultSplit: "60/40",
    allowedModules: ["course-list"],
  },
  "/teacher/courses/[courseId]": {
    label: "课程详情",
    defaultSplit: "60/40",
    allowedModules: ["course-detail"],
  },
  "/teacher/courses/[courseId]/lessons": {
    label: "课时管理",
    defaultSplit: "60/40",
    allowedModules: ["lesson-list"],
  },
  "/teacher/students": {
    label: "学生档案",
    defaultSplit: "60/40",
    allowedModules: ["student-directory"],
  },
  "/teacher/review": {
    label: "批改中心",
    defaultSplit: "60/40",
    allowedModules: ["review-queue"],
  },
  "/teacher/launch": {
    label: "课堂准备",
    defaultSplit: "50/50",
    allowedModules: ["launch-panel"],
  },
  "/teacher/editor": {
    label: "课时编辑",
    defaultSplit: "60/40",
    allowedModules: ["editor-workspace"],
  },
  "/settings": {
    label: "系统设置",
    defaultSplit: "60/40",
    allowedModules: ["settings-general"],
  },
  "/settings/labs": {
    label: "实验室布局管理",
    defaultSplit: "60/40",
    allowedModules: ["settings-labs"],
  },
  "/settings/plugins": {
    label: "插件市场",
    defaultSplit: "60/40",
    allowedModules: ["plugin-marketplace"],
  },
  "/resources": {
    label: "资源中心",
    defaultSplit: "60/40",
    allowedModules: ["resource-library"],
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

  if (pathname.startsWith("/teacher")) {
    return "/teacher";
  }

  return "/teacher";
}
