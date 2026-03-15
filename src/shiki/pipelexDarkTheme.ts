import type { ThemeRegistrationRaw } from "shiki";

export const pipelexDarkTheme: ThemeRegistrationRaw = {
  name: "pipelex-dark",
  type: "dark",
  colors: {
    "editor.background": "#0d0b14",
    "editor.foreground": "#e2e0e8",
  },
  settings: [
    // Default text
    {
      scope: [],
      settings: {
        foreground: "#e2e0e8",
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

    // ── Yellow #F1FA8C (strings) ────────────────────────────
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
        foreground: "#F1FA8C",
      },
    },

    // ── Muted Blue #6272A4 italic (comments) ────────────────
    {
      scope: [
        "comment",
        "comment.line.number-sign.mthds",
        "comment.block.jinja.mthds",
        "comment.block.html.mthds",
      ],
      settings: {
        foreground: "#6272A4",
        fontStyle: "italic",
      },
    },

    // ── Muted #8B95B0 italic (preprocessor directives) ─────
    {
      scope: ["meta.preprocessor.mthds"],
      settings: {
        foreground: "#8B95B0",
        fontStyle: "italic",
      },
    },

    // ── Purple #BD93F9 (generic property names, constants) ──
    {
      scope: [
        "support.type.property-name.mthds",
        "constant.language.boolean.mthds",
        "constant.numeric",
        "constant.other.time",
      ],
      settings: {
        foreground: "#BD93F9",
      },
    },

    // ── Cyan #8BE9FD (table/array property names) ───────────
    {
      scope: ["support.type.property-name.table.mthds", "support.type.property-name.array.mthds"],
      settings: {
        foreground: "#8BE9FD",
      },
    },

    // ── Green #50FA7B (Jinja functions, HTML attributes) ────
    {
      scope: ["support.function.jinja.mthds", "entity.other.attribute-name.html.mthds"],
      settings: {
        foreground: "#50FA7B",
      },
    },

    // ── Light foreground #e2e0e8 (Jinja variables) ──────────
    {
      scope: ["variable.other.jinja.mthds"],
      settings: {
        foreground: "#e2e0e8",
      },
    },

    // ── Muted punctuation #b0adc0 ──────────────────────────
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
        foreground: "#b0adc0",
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
