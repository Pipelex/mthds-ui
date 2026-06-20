import type { ThemeRegistrationRaw } from "@shikijs/core";

/**
 * Light counterpart of `pipelexDarkTheme` — same scopes, one-for-one.
 * Surfaces and neutrals match the pipelex-app light theme (warm cream
 * `--card` background, warm near-black `--foreground` text, warm muted
 * grays) so the editor sits naturally inside the app instead of reading
 * as a stark-white third-party widget. The Pipelex brand accents (coral,
 * teal, green, magenta, orange) keep their dark-theme hues, darkened so
 * they hold contrast on the cream background.
 */
export const pipelexLightTheme: ThemeRegistrationRaw = {
  name: "pipelex-light",
  type: "light",
  colors: {
    "editor.background": "#F6F3EF",
    "editor.foreground": "#1B1713",
  },
  settings: [
    // Default text
    {
      scope: [],
      settings: {
        foreground: "#1B1713",
      },
    },

    // ── Coral Red #D32F2F bold (dark: #FF6B6B) ──────────────
    // Pipe sections, pipe types, pipe names
    {
      scope: [
        "entity.name.tag.pipe.mthds",
        "entity.name.tag.pipe-type.mthds",
        "entity.name.tag.pipe-name.mthds",
      ],
      settings: {
        foreground: "#D32F2F",
        fontStyle: "bold",
      },
    },

    // ── Teal #0F766E bold (dark: #4ECDC4) ───────────────────
    // Concept sections, concept types
    {
      scope: ["entity.name.type.concept.mthds"],
      settings: {
        foreground: "#0F766E",
        fontStyle: "bold",
      },
    },

    // ── Green #15803D bold (dark: #98FB98) ──────────────────
    // Data variables
    {
      scope: ["variable.other.readwrite.mthds"],
      settings: {
        foreground: "#15803D",
        fontStyle: "bold",
      },
    },

    // ── Magenta #C2255C (dark: #FF79C6, no bold) ────────────
    // Template markers, sigils, escape sequences
    {
      scope: ["storage.modifier.mthds", "constant.character.escape.mthds"],
      settings: {
        foreground: "#C2255C",
      },
    },

    // ── Magenta #C2255C bold (Jinja keywords) ───────────────
    {
      scope: ["keyword.control.jinja.mthds"],
      settings: {
        foreground: "#C2255C",
        fontStyle: "bold",
      },
    },

    // ── Magenta #C2255C (Jinja operators) ───────────────────
    {
      scope: ["keyword.operator.jinja.mthds"],
      settings: {
        foreground: "#C2255C",
      },
    },

    // ── Magenta #C2255C (HTML tags) ─────────────────────────
    {
      scope: ["entity.name.tag.html.mthds"],
      settings: {
        foreground: "#C2255C",
      },
    },

    // ── Orange #C2410C bold (model refs; dark: #FFB86C) ─────
    {
      scope: ["constant.other.symbol.mthds"],
      settings: {
        foreground: "#C2410C",
        fontStyle: "bold",
      },
    },

    // ── Orange #C2410C (Jinja delimiters) ───────────────────
    {
      scope: ["punctuation.definition.jinja.mthds"],
      settings: {
        foreground: "#C2410C",
      },
    },

    // ── Dark red #A31515 (strings; Light+ default) ──────────
    {
      scope: [
        "string.quoted.triple.basic.block.mthds",
        "string.quoted.single.basic.line.mthds",
        "string.quoted.triple.literal.block.mthds",
        "string.quoted.single.literal.line.mthds",
        "string.quoted.triple.basic.block.jinja2.mthds",
        "string.quoted.single.basic.line.jinja2.mthds",
        "string.quoted.triple.basic.block.prompt.mthds",
        "string.quoted.single.basic.line.prompt.mthds",
        "string.quoted.html.mthds",
      ],
      settings: {
        foreground: "#A31515",
      },
    },

    // ── Green #008000 italic (comments; Light+ default) ─────
    {
      scope: [
        "comment",
        "comment.line.number-sign.mthds",
        "comment.block.jinja.mthds",
        "comment.block.html.mthds",
      ],
      settings: {
        foreground: "#008000",
        fontStyle: "italic",
      },
    },

    // ── Green #008000 italic (preprocessor directives) ──────
    {
      scope: ["meta.preprocessor.mthds"],
      settings: {
        foreground: "#008000",
        fontStyle: "italic",
      },
    },

    // ── Navy #001080 (generic property names; Light+) ───────
    {
      scope: ["support.type.property-name.mthds"],
      settings: {
        foreground: "#001080",
      },
    },

    // ── Blue #0000FF (booleans; Light+) ─────────────────────
    {
      scope: ["constant.language.boolean.mthds"],
      settings: {
        foreground: "#0000FF",
      },
    },

    // ── Dark green #098658 (numbers; Light+) ────────────────
    {
      scope: ["constant.numeric", "constant.other.time"],
      settings: {
        foreground: "#098658",
      },
    },

    // ── Navy #001080 (table/array property names) ───────────
    {
      scope: ["support.type.property-name.table.mthds", "support.type.property-name.array.mthds"],
      settings: {
        foreground: "#001080",
      },
    },

    // ── Brown #795E26 (Jinja functions, HTML attributes; Light+) ─
    {
      scope: ["support.function.jinja.mthds", "entity.other.attribute-name.html.mthds"],
      settings: {
        foreground: "#795E26",
      },
    },

    // ── Navy #001080 (Jinja variables) ──────────────────────
    {
      scope: ["variable.other.jinja.mthds"],
      settings: {
        foreground: "#001080",
      },
    },

    // ── Standard foreground #1B1713 (punctuation) ───────────
    {
      scope: [
        "punctuation.definition.table.mthds",
        "punctuation.definition.array.table.mthds",
        "punctuation.definition.array.mthds",
        "punctuation.definition.table.inline.mthds",
        "punctuation.separator.dot.mthds",
        "punctuation.separator.array.mthds",
        "punctuation.separator.table.inline.mthds",
        "punctuation.eq.mthds",
        "punctuation.definition.string.begin.mthds",
        "punctuation.definition.string.end.mthds",
      ],
      settings: {
        foreground: "#1B1713",
      },
    },

    // ── Magenta #C2255C (pipe ref arrow) ────────────────────
    {
      scope: ["keyword.operator.arrow.mthds"],
      settings: {
        foreground: "#C2255C",
      },
    },

    // ── Warm muted #6A6158 (namespace/package address) ──────
    // Matches the app's light --muted-foreground.
    {
      scope: ["punctuation.separator.namespace.mthds"],
      settings: {
        foreground: "#6A6158",
      },
    },

    // ── Red #C00000 underline (invalid) ─────────────────────
    {
      scope: ["invalid.illegal.escape.mthds"],
      settings: {
        foreground: "#C00000",
        fontStyle: "underline",
      },
    },
  ],
};
