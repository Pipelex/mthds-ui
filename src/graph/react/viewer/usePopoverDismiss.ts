import React from "react";

/** Why an open popover asked to close: a press outside it, or the Escape key. */
export type PopoverDismissReason = "outside" | "escape";

/**
 * Close a toolbar popover (the validation dropdown, the style menu) on a press
 * outside its wrapper or on Escape, while it is open. The listeners live on the
 * document only while `open` is true. `onDismiss` may change between renders
 * without re-registering them.
 */
export function usePopoverDismiss(
  open: boolean,
  wrapperRef: React.RefObject<HTMLElement | null>,
  onDismiss: (reason: PopoverDismissReason) => void,
): void {
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper && event.target instanceof Node && !wrapper.contains(event.target)) {
        onDismissRef.current("outside");
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismissRef.current("escape");
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, wrapperRef]);
}
