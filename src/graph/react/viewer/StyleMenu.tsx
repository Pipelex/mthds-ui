import React from "react";
import { GRAPH_STYLE, type GraphStyleId } from "@graph/types";
import { GRAPH_STYLES } from "@graph/styles/graphStyles";
import type { ValidationPanelPlacement } from "./ValidationPanel";
import { usePopoverDismiss } from "./usePopoverDismiss";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  width: 14,
  height: 14,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * Each style's icon, on the toolbar button (the current style) and in its menu
 * row. Keyed by `GraphStyleId`, so a new style does not compile without one.
 */
const STYLE_ICONS: Record<GraphStyleId, React.ReactElement> = {
  // Cards with their rows: every pipe with its slots.
  [GRAPH_STYLE.DETAILED]: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <line x1="14" y1="4" x2="21" y2="4" />
      <line x1="14" y1="9" x2="21" y2="9" />
      <line x1="14" y1="15" x2="21" y2="15" />
      <line x1="14" y1="20" x2="21" y2="20" />
    </svg>
  ),
  // Two steps and the arrow between them: a flowchart.
  [GRAPH_STYLE.SIMPLE]: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <path d="M7 11v4a2 2 0 0 0 2 2h4" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  ),
};

const CHECK_ICON = (
  <svg {...ICON_PROPS}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/** The icon of a style. Pure, unit-testable. */
export function graphStyleIcon(style: GraphStyleId): React.ReactElement {
  return STYLE_ICONS[style];
}

/** Accessible label of the menu button: the current style, and what the button does. */
export function styleMenuLabel(style: GraphStyleId): string {
  return `Graph style: ${GRAPH_STYLES[style].name} — choose how the graph is drawn`;
}

export interface StyleMenuProps {
  /** The active style, shown on the button and checked in the list. */
  value: GraphStyleId;
  /** The styles offered, in order. */
  options: readonly GraphStyleId[];
  onChange: (style: GraphStyleId) => void;
  /** Where the list opens, from the toolbar's anchor — the validation dropdown's vocabulary. */
  placement: ValidationPanelPlacement;
}

/**
 * The toolbar's style menu: a button showing the current style's icon, opening
 * a list of radio items, each with its icon, name and one-line description, and
 * a check on the current one. A list rather than a two-state toggle, because
 * the registry is built for more than two styles. Keyboard: arrows, Home and
 * End move, Enter or Space choose, Escape closes and returns to the button.
 */
export function StyleMenu({ value, options, onChange, placement }: StyleMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  // useId, not a constant: several viewers can coexist on one page.
  const menuId = React.useId();

  usePopoverDismiss(open, wrapperRef, (reason) => {
    setOpen(false);
    if (reason === "escape") buttonRef.current?.focus();
  });

  // Opening moves focus to the checked item, as a radio menu does.
  React.useEffect(() => {
    if (!open) return;
    const index = Math.max(0, options.indexOf(value));
    setActiveIndex(index);
    itemRefs.current[index]?.focus();
    // Only on opening: choosing a style closes the menu anyway.
  }, [open]);

  const focusItem = (index: number) => {
    const count = options.length;
    const next = ((index % count) + count) % count;
    setActiveIndex(next);
    itemRefs.current[next]?.focus();
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(activeIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(activeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(options.length - 1);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const choose = (style: GraphStyleId) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (style !== value) onChange(style);
  };

  const label = styleMenuLabel(value);
  return (
    <div className="graph-toolbar-style" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`graph-toolbar-btn${open ? " graph-toolbar-btn--open" : ""}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        {graphStyleIcon(value)}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Graph style"
          className={`graph-style-menu graph-style-menu--${placement}`}
          onKeyDown={onMenuKeyDown}
        >
          {options.map((style, index) => {
            const descriptor = GRAPH_STYLES[style];
            const checked = style === value;
            return (
              <button
                key={style}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={index === activeIndex ? 0 : -1}
                className={`graph-style-menu-item${checked ? " graph-style-menu-item--checked" : ""}`}
                onClick={() => choose(style)}
              >
                <span className="graph-style-menu-icon" aria-hidden="true">
                  {graphStyleIcon(style)}
                </span>
                <span className="graph-style-menu-text">
                  <span className="graph-style-menu-name">{descriptor.name}</span>
                  <span className="graph-style-menu-description">{descriptor.description}</span>
                </span>
                <span className="graph-style-menu-check" aria-hidden="true">
                  {checked ? CHECK_ICON : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
