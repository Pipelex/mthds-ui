import React from "react";
import "./DetailPanel.css";

export interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Panel width in pixels. When provided, overrides the CSS default. */
  width?: number;
  /** Whether a resize drag is in progress. Disables CSS transition during drag. */
  isDragging?: boolean;
  /** Mouse-down handler for the resize handle. When provided, the handle is rendered. */
  onResizeHandleMouseDown?: (e: React.MouseEvent) => void;
  /** Close panel on Escape key. Defaults to true. */
  closeOnEscape?: boolean;
}

export function DetailPanel({
  isOpen,
  onClose,
  children,
  width,
  isDragging,
  onResizeHandleMouseDown,
  closeOnEscape = true,
}: DetailPanelProps) {
  React.useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  const className = [
    "detail-panel",
    !isOpen && "detail-panel--closed",
    isDragging && "detail-panel--dragging",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} style={width ? { width: `${width}px` } : undefined}>
      {onResizeHandleMouseDown && (
        <div
          className="detail-panel-resize-handle"
          onMouseDown={onResizeHandleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
        />
      )}
      <button className="detail-panel-close" onClick={onClose} aria-label="Close panel">
        x
      </button>
      <div className="detail-panel-content">{children}</div>
    </div>
  );
}
