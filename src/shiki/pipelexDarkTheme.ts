import type { ThemeRegistrationRaw } from "shiki";

export const pipelexDarkTheme: ThemeRegistrationRaw = {
  name: "pipelex-dark",
  type: "dark",
  colors: {
    "editor.background": "#1e1e1e",
    "editor.foreground": "#d4d4d4",
  },
  settings: [
    // Default text
    {
      scope: [],
      settings: {
        foreground: "#d4d4d4",
      },
    },

    // ── Coral Red #FF6B6B bold ──────────────────────────────
    // Pipe sections, pipe types, pipe names
    {
      scope: [
        "support.type.property-name.pipe.mthds",
        "support.type.pipe-type.mthds",
        "support.function.pipe-name.mthds",
      ],
      settings: {
        foreground: "#FF6B6B",
        fontStyle: "bold",
      },
    },

    // ── Teal #4ECDC4 bold ───────────────────────────────────
    // Concept sections, concept types
    {
      scope: ["support.type.property-name.concept.mthds", "support.type.concept.mthds"],
      settings: {
        foreground: "#4ECDC4",
        fontStyle: "bold",
      },
    },

    // ── Pale Green #98FB98 bold ─────────────────────────────
    // Data variables
    {
      scope: ["variable.name.data.mthds"],
      settings: {
        foreground: "#98FB98",
        fontStyle: "bold",
      },
    },

    // ── Magenta #FF79C6 (no bold) ───────────────────────────
    // Template markers, sigils, escape sequences
    {
      scope: [
        "punctuation.definition.data-injection.mthds",
        "punctuation.definition.template-variable.mthds",
        "punctuation.definition.model-sigil.mthds",
        "constant.character.escape.mthds",
      ],
      settings: {
        foreground: "#FF79C6",
      },
    },

    // ── Magenta #FF79C6 bold (Jinja keywords) ───────────────
    {
      scope: ["keyword.control.jinja.mthds"],
      settings: {
        foreground: "#FF79C6",
        fontStyle: "bold",
      },
    },

    // ── Magenta #FF79C6 (Jinja operators) ───────────────────
    {
      scope: ["keyword.operator.jinja.mthds"],
      settings: {
        foreground: "#FF79C6",
      },
    },

    // ── Magenta #FF79C6 (HTML tags) ─────────────────────────
    {
      scope: ["entity.name.tag.html.mthds"],
      settings: {
        foreground: "#FF79C6",
      },
    },

    // ── Orange #FFB86C bold (model refs) ────────────────────
    {
      scope: ["entity.name.model-ref.mthds"],
      settings: {
        foreground: "#FFB86C",
        fontStyle: "bold",
      },
    },

    // ── Orange #FFB86C (Jinja delimiters) ───────────────────
    {
      scope: ["punctuation.definition.jinja.mthds"],
      settings: {
        foreground: "#FFB86C",
      },
    },

    // ── Salmon #ce9178 (strings) ────────────────────────────
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
        foreground: "#ce9178",
      },
    },

    // ── Green #6a9955 italic (comments) ─────────────────────
    {
      scope: [
        "comment",
        "comment.line.number-sign.mthds",
        "comment.block.jinja.mthds",
        "comment.block.html.mthds",
      ],
      settings: {
        foreground: "#6a9955",
        fontStyle: "italic",
      },
    },

    // ── Green #6a9955 italic (preprocessor directives) ──────
    {
      scope: ["meta.preprocessor.mthds"],
      settings: {
        foreground: "#6a9955",
        fontStyle: "italic",
      },
    },

    // ── Light Blue #9cdcfe (generic property names) ─────────
    {
      scope: ["support.type.property-name.mthds"],
      settings: {
        foreground: "#9cdcfe",
      },
    },

    // ── Blue #569cd6 (booleans) ───────────────────────────
    {
      scope: ["constant.language.boolean.mthds"],
      settings: {
        foreground: "#569cd6",
      },
    },

    // ── Light Green #b5cea8 (numbers) ─────────────────────
    {
      scope: ["constant.numeric", "constant.other.time"],
      settings: {
        foreground: "#b5cea8",
      },
    },

    // ── Light Blue #9cdcfe (table/array property names) ──────
    {
      scope: ["support.type.property-name.table.mthds", "support.type.property-name.array.mthds"],
      settings: {
        foreground: "#9cdcfe",
      },
    },

    // ── Yellow #dcdcaa (Jinja functions, HTML attributes) ────
    {
      scope: ["support.function.jinja.mthds", "entity.other.attribute-name.html.mthds"],
      settings: {
        foreground: "#dcdcaa",
      },
    },

    // ── Light Blue #9cdcfe (Jinja variables) ────────────────
    {
      scope: ["variable.other.jinja.mthds"],
      settings: {
        foreground: "#9cdcfe",
      },
    },

    // ── Standard foreground #d4d4d4 (punctuation) ───────────
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
        foreground: "#d4d4d4",
      },
    },

    // ── Red #FF5555 underline (invalid) ─────────────────────
    {
      scope: ["invalid.illegal.escape.mthds"],
      settings: {
        foreground: "#FF5555",
        fontStyle: "underline",
      },
    },
  ],
};
