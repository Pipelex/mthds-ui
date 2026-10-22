import React from "react";
import { describeGraphFailure } from "./graphFailure";

/** The title the error state carries, whatever the failure. */
export const GRAPH_ERROR_STATE_TITLE = "This method graph could not be drawn";

/**
 * What `GraphViewer` draws in place of the graph when it cannot draw the spec
 * it was given: a title, and the failure in its own words, which for a refused
 * spec name the location refused (`nodes[2].error.type`) and what was found
 * there. An alert, so a screen reader announces it, styled from the graph's
 * tokens (`graph-core.css`), so it follows the theme and the host's palette.
 */
export function GraphErrorState({ failure }: { failure: string }) {
  return (
    <div className="graph-error-state" role="alert">
      <p className="graph-error-state-title">{GRAPH_ERROR_STATE_TITLE}</p>
      <p className="graph-error-state-detail">{failure}</p>
    </div>
  );
}

interface GraphFailureBoundaryProps {
  /**
   * The spec the children draw. A new one clears a failure, so the next spec
   * is drawn afresh; the same one keeps the error state.
   */
  resetKey: unknown;
  /** What to draw in place of the children once they failed. */
  fallback: (failure: string) => React.ReactNode;
  /**
   * The children, handed `fail`: the way code no boundary sees, such as an
   * asynchronous layout, reports a failure. Call it only while the result is
   * still wanted, never for a spec that has since been replaced.
   */
  children: (fail: (error: unknown) => void) => React.ReactNode;
}

interface GraphFailureBoundaryState {
  failure: string | null;
  resetKey: unknown;
}

/**
 * The viewer's backstop: whatever its children throw while rendering or from
 * an effect, or report through `fail`, is drawn as the fallback instead of
 * unmounting the host's tree. A spec `validateGraphSpec` refuses never gets
 * here, since the viewer reads it as a value (`readGraphSpec`); this catches
 * what a validated spec can still trip, the build's own guards among them.
 */
export class GraphFailureBoundary extends React.Component<
  GraphFailureBoundaryProps,
  GraphFailureBoundaryState
> {
  override state: GraphFailureBoundaryState = { failure: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<GraphFailureBoundaryState> {
    return { failure: describeGraphFailure(error) };
  }

  static getDerivedStateFromProps(
    props: GraphFailureBoundaryProps,
    state: GraphFailureBoundaryState,
  ): Partial<GraphFailureBoundaryState> | null {
    return props.resetKey === state.resetKey ? null : { failure: null, resetKey: props.resetKey };
  }

  private readonly fail = (error: unknown): void => {
    this.setState({ failure: describeGraphFailure(error) });
  };

  override render(): React.ReactNode {
    const { failure } = this.state;
    return failure === null ? this.props.children(this.fail) : this.props.fallback(failure);
  }
}
