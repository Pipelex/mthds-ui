import React from "react";

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
  /**
   * Close panel on Escape key. Defaults to true. An Escape pressed while a
   * dialog is open above the panel, such as the picture viewer a result opens,
   * closes that dialog alone and leaves the panel open.
   */
  closeOnEscape?: boolean;
}

/** What a layer above the panel can be: a dialog of any kind, native or ARIA. */
const DIALOG_LAYER_SELECTOR = 'dialog, [role="dialog"], [role="alertdialog"]';

/**
 * Whether an Escape press belongs to a dialog above the panel, which closes
 * instead of the panel. Read in a bubble listener on the document, after every
 * handler inside the page has had the key.
 *
 * Two signs, because dialogs give one or the other:
 *
 * - **A handler already took the key** and said so with `preventDefault()`.
 *   Radix's dismissable layer, under every shadcn dialog and so under the form
 *   kernel's picture viewer, hears Escape in the document's capture phase,
 *   before this listener, and prevents the default when it closes. A handler
 *   that stops the key's propagation instead never reaches this listener.
 * - **The key was pressed inside a dialog that does not hold the panel.** A
 *   native modal `<dialog>` closes on Escape as the key's default action, after
 *   the listeners, so nothing has prevented it yet. The panel itself may sit in
 *   a host's dialog, which is why a dialog holding it does not count.
 *
 * Neither sign asks which dialogs are open when this listener runs, and that is
 * deliberate: by then a real key press has already closed the dialog. The
 * browser runs microtasks between one listener and the next, React commits the
 * close the dialog's own listener asked for in one of them, and the dialog has
 * left the document before the key reaches this one. Its target is detached by
 * then, but `closest` still walks the dialog's own subtree. A key dispatched
 * from a script, as a story's play function does, runs no microtask in
 * between, which is why a check that holds only for one of the two is a trap.
 */
function escapeBelongsAbove(event: KeyboardEvent, panel: Element | null): boolean {
  if (event.defaultPrevented) return true;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const layer = target.closest(DIALOG_LAYER_SELECTOR);
  return layer !== null && !(panel !== null && layer.contains(panel));
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
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !escapeBelongsAbove(e, panelRef.current)) onClose();
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
    <div ref={panelRef} className={className} style={width ? { width: `${width}px` } : undefined}>
      {onResizeHandleMouseDown && (
        <div
          className="detail-panel-resize-handle"
          onMouseDown={onResizeHandleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
        />
      )}
      <div className="detail-panel-content">
        {/* Inside the scroll flow ON PURPOSE: the close button belongs to the
            top of the content and scrolls away with it — closing the panel
            means going back up. Do not pin it to the panel. */}
        <div className="detail-panel-close-row">
          <button className="detail-panel-close" onClick={onClose} aria-label="Close panel">
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
