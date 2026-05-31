export const teacherSurfaceRhythm = {
  stack: "space-y-6",
  shell: "rounded-[var(--radius-shell)] shadow-ambient",
  card: "rounded-[var(--radius-card)]",
  cardInset:
    "rounded-[var(--radius-card)] bg-surface-container-lowest shadow-ambient",
  hero: "rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8",
  section:
    "rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6",
  sectionCompact:
    "rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient",
  heroInset:
    "rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5 sm:p-6",
  gradientHeroContent: "px-6 py-6 sm:px-8 sm:py-8",
} as const;
