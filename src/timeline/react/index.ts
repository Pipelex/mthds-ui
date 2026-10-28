"use client";

// The timeline's stylesheets are imported here and nowhere else: the entry's
// specifier is the one tsup's `external` pattern matches and the one that
// resolves from `dist/timeline/react/index.js` (see CLAUDE.md, "CSS Packaging").
import "./RunTimeline.css";
import "./styles/simple/SimpleProgress.css";
// The style menu's list is the graph viewer's, shared: this specifier resolves
// from `dist/timeline/react/` to the graph entry's copy of the stylesheet.
import "../../graph/react/viewer/StyleMenu.css";

export { RunTimeline } from "./RunTimeline";
export type { RunTimelineProps } from "./RunTimeline";
