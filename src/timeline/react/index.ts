"use client";

// The timeline's stylesheets are imported here and nowhere else: the entry's
// specifier is the one tsup's `external` pattern matches and the one that
// resolves from `dist/timeline/react/index.js` (see CLAUDE.md, "CSS Packaging").
import "./RunTimeline.css";
import "./styles/simple/SimpleProgress.css";

export { RunTimeline } from "./RunTimeline";
export type { RunTimelineProps } from "./RunTimeline";
