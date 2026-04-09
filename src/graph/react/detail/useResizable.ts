import React from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UseResizableOptions {
  /** Initial panel width in pixels. */
  defaultWidth: number;
  /** Minimum allowed width in pixels. */
  minWidth: number;
  /** Maximum allowed width in pixels (also clamped to 60% of container). */
  maxWidth: number;
  /** Container element ref for percentage-based max-width calculation. */
  containerRef?: React.RefObject<HTMLElement | null>;
}

export interface UseResizableResult {
  /** Current panel width in pixels. */
  width: number;
  /** Whether a resize drag is in progress. */
  isDragging: boolean;
  /** Attach to the resize handle's onMouseDown. */
  handleMouseDown: (e: React.MouseEvent) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

const MAX_WIDTH_RATIO = 0.6;

export function useResizable({
  defaultWidth,
  minWidth,
  maxWidth,
  containerRef,
}: UseResizableOptions): UseResizableResult {
  const [width, setWidth] = React.useState(defaultWidth);
  const [isDragging, setIsDragging] = React.useState(false);

  // Store drag state in refs to avoid stale closures in document listeners
  const dragRef = React.useRef({ startX: 0, startWidth: 0, maxAllowed: maxWidth });
  const rafRef = React.useRef<number | null>(null);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Compute max allowed width once at drag start
      const containerWidth = containerRef?.current?.getBoundingClientRect().width;
      const maxAllowed = containerWidth
        ? Math.min(maxWidth, containerWidth * MAX_WIDTH_RATIO)
        : maxWidth;

      dragRef.current = { startX: e.clientX, startWidth: width, maxAllowed };
      setIsDragging(true);

      // Prevent text selection and set cursor globally during drag
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [width, maxWidth, containerRef],
  );

  React.useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const { startX, startWidth, maxAllowed } = dragRef.current;
        // Dragging left (negative deltaX) increases width for a right-anchored panel
        const deltaX = startX - e.clientX;
        const newWidth = Math.max(minWidth, Math.min(maxAllowed, startWidth + deltaX));
        setWidth(newWidth);
        rafRef.current = null;
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isDragging, minWidth]);

  return { width, isDragging, handleMouseDown };
}
