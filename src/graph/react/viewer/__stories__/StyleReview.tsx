import type { GraphSpecMode, GraphStyleId, ToolbarPosition } from "@graph/types";
import { GraphViewer } from "../GraphViewer";
import { reviewSpec, reviewStatusMap, type ReviewFixtureId } from "./styleReviewFixtures";

export interface StyleReviewProps {
  fixture: ReviewFixtureId;
  graphStyle: GraphStyleId;
  mode: GraphSpecMode;
  direction: "LR" | "TB";
  theme: "light" | "dark";
  /** Offer the toolbar's style menu. */
  styleMenu?: boolean;
  toolbarPosition?: ToolbarPosition;
}

/**
 * One fixture of the review set, drawn in one combination of style, mode,
 * direction and theme. In live mode the run is caught midway (see
 * `reviewStatusMap`). Re-mounted per fixture, mode and direction, since the
 * direction is the viewer's initial value.
 */
export function StyleReview({
  fixture,
  graphStyle,
  mode,
  direction,
  theme,
  styleMenu = true,
  toolbarPosition,
}: StyleReviewProps) {
  const spec = reviewSpec(fixture, mode);
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <GraphViewer
        key={`${fixture}-${mode}-${direction}`}
        graph={{ graphSpec: spec }}
        graphStyle={graphStyle}
        initialDirection={direction}
        theme={theme}
        styleMenu={styleMenu}
        toolbarPosition={toolbarPosition}
        statusMap={mode === "live" ? reviewStatusMap(spec) : undefined}
      />
    </div>
  );
}
