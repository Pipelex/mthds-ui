export const MTHDS_THEMES = [
  "pipelex-dark",
  "dark-plus",
  "monokai",
  "dracula",
  "one-dark-pro",
] as const;

export type MthdsThemeName = (typeof MTHDS_THEMES)[number];
