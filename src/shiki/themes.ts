export const MTHDS_THEMES = ["pipelex-dark", "pipelex-light"] as const;

export type MthdsThemeName = (typeof MTHDS_THEMES)[number];
