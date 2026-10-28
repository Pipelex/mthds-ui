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

/** Accessible label of the menu button: the current style, and what the button does. */
export function styleMenuLabel(style: GraphStyleId): string {
  return `Graph style: ${GRAPH_STYLES[style].name} — choose how the graph is drawn`;
}

/** What a style menu shows of one style: its name, its one-line description and its icon. */
export interface StyleMenuEntry {
  name: string;
  description: string;
  icon: React.ReactElement;
}

/** The graph's styles as its menu shows them. */
export const GRAPH_STYLE_MENU_ENTRIES: Record<GraphStyleId, StyleMenuEntry> = {
  [GRAPH_STYLE.DETAILED]: { ...GRAPH_STYLES[GRAPH_STYLE.DETAILED], icon: STYLE_ICONS.detailed },
  [GRAPH_STYLE.SIMPLE]: { ...GRAPH_STYLES[GRAPH_STYLE.SIMPLE], icon: STYLE_ICONS.simple },
};

export interface StyleMenuProps<Id extends string> {
  /** The active style, shown on the button and checked in the list. */
  value: Id;
  /** The styles offered, in order. */
  options: readonly Id[];
  onChange: (style: Id) => void;
  /** Where the list opens, from the button — the validation dropdown's vocabulary. */
  placement: ValidationPanelPlacement;
  /** Each style's name, description and icon. */
  entries: Readonly<Record<Id, StyleMenuEntry>>;
  /** The menu's accessible name: "Graph style". */
  menuLabel: string;
  /** The button's accessible label for the active style. */
  buttonLabel: (style: Id) => string;
  /** The button's class, and with `--open` its class while the list is open. */
  buttonClassName: string;
}

/**
 * A style menu: a button showing the current style's icon, opening a list of
 * radio items, each with its icon, name and one-line description, and a check
 * on the current one. A list rather than a two-state toggle, because a style
 * registry is built for more than two styles. Keyboard: arrows, Home and End
 * move, Enter or Space choose, Escape closes and returns to the button. The
 * graph's toolbar shows it over the graph's styles, and the run timeline's
 * header over the timeline's.
 */
export function StyleMenu<Id extends string>({
  value,
  options,
  onChange,
  placement,
  entries,
  menuLabel,
  buttonLabel,
  buttonClassName,
}: StyleMenuProps<Id>) {
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

  const choose = (style: Id) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (style !== value) onChange(style);
  };

  const label = buttonLabel(value);
  return (
    <div className="graph-toolbar-style" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${buttonClassName}${open ? ` ${buttonClassName}--open` : ""}`}
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
        {entries[value].icon}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          className={`graph-style-menu graph-style-menu--${placement}`}
          onKeyDown={onMenuKeyDown}
        >
          {options.map((style, index) => {
            const descriptor = entries[style];
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
                  {descriptor.icon}
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
