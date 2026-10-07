// Plain words from identifiers: the simple style's fallback when a method
// declares nothing better. Pure, deterministic and tested — never a stand-in
// for an authored description, and never a guess at meaning: an identifier is
// split, cased and spelled, nothing more.

/**
 * Words spelled as acronyms although they hold a vowel. A word with no vowel at
 * all (`cv`, `pdf`, `rfp`, `html`) is spelled as an acronym without being
 * listed: no English word of two letters or more is written without one.
 */
const VOWELED_ACRONYMS: ReadonlySet<string> = new Set([
  "ai",
  "api",
  "faq",
  "iban",
  "id",
  "io",
  "ip",
  "json",
  "kpi",
  "ocr",
  "roi",
  "seo",
  "ui",
  "uri",
  "url",
  "uuid",
  "ux",
]);

const VOWELS = /[aeiouy]/;

/** Vowelless acronyms that end in `s` without being plurals (`css` is not two `cs`). */
const SINGULAR_S_ACRONYMS: ReadonlySet<string> = new Set([
  "cms",
  "css",
  "dns",
  "gps",
  "rss",
  "sms",
]);

/**
 * The plain names of the natives whose code does not read as words once split
 * (`YesNo` is not "Yes no"). Every other native reads well humanized.
 */
const NATIVE_PLAIN_NAMES: Readonly<Record<string, string>> = {
  Html: "HTML",
  JSON: "JSON",
  TextAndImages: "Text and images",
  YesNo: "Yes or no",
  SearchResult: "Search result",
  Composite: "Combined results",
  Dynamic: "Data",
};

/**
 * Natives that say what kind of value something is without saying what it is:
 * a final output of one of these is named by its variable, not its concept.
 */
const GENERIC_NATIVES: ReadonlySet<string> = new Set(["Anything", "Dynamic", "Composite"]);

function isAcronymWord(lower: string): boolean {
  if (lower.length < 2 || !/^[a-z]+$/.test(lower)) return false;
  return !VOWELS.test(lower) || VOWELED_ACRONYMS.has(lower);
}

/** Spell one lowercase word: an acronym in capitals (a plural keeps its `s`), anything else as is. */
function spellWord(lower: string, wasAllCaps: boolean): string {
  if (/^\d+$/.test(lower)) return lower;
  if (wasAllCaps && lower.length >= 2) return lower.toUpperCase();
  // A plural acronym keeps its lowercase `s`: `cvs` is "CVs", not "CVS".
  if (lower.endsWith("s") && !SINGULAR_S_ACRONYMS.has(lower) && isAcronymWord(lower.slice(0, -1))) {
    return lower.slice(0, -1).toUpperCase() + "s";
  }
  if (isAcronymWord(lower)) return lower.toUpperCase();
  return lower;
}

/**
 * Split an identifier into its words: on `_`, `-`, `.` and spaces, and at the
 * case boundaries of camel and Pascal case, keeping a run of capitals together
 * (`PDFDocument` is `PDF` and `Document`).
 */
function splitIdentifier(identifier: string): { word: string; wasAllCaps: boolean }[] {
  const parts = identifier
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .split(/[\s_\-.]+/)
    .filter((p) => p.length > 0);
  return parts.map((p) => ({
    word: p.toLowerCase(),
    wasAllCaps: p.length >= 2 && p === p.toUpperCase() && /[A-Z]/.test(p),
  }));
}

/** Capitalize the first letter, leaving the rest as written. */
function capitalizeFirst(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

/** The last segment of a dotted ref: the code without its domain (`recruitment.CandidateProfile` → `CandidateProfile`). */
export function stripDomain(ref: string): string {
  const dot = ref.lastIndexOf(".");
  return dot === -1 ? ref : ref.slice(dot + 1);
}

/**
 * An identifier as words in sentence case: `job_offer` → "Job offer",
 * `CandidateProfile` → "Candidate profile", `pr_url` → "PR URL",
 * `cvs` → "CVs". A dotted ref is humanized by its last segment.
 */
export function humanizeIdentifier(identifier: string): string {
  const words = splitIdentifier(stripDomain(identifier.trim()));
  if (words.length === 0) return "";
  return capitalizeFirst(words.map((w) => spellWord(w.word, w.wasAllCaps)).join(" "));
}

/** A concept's plain name, from its code or ref: a native's own plain name, or the humanized code. */
export function conceptPlainName(conceptRef: string): string {
  const code = stripDomain(conceptRef.trim());
  return NATIVE_PLAIN_NAMES[code] ?? humanizeIdentifier(code);
}

/** Whether a concept is a native that names no particular kind of content (`Anything`, `Dynamic`, `Composite`). */
export function isGenericConcept(conceptRef: string): boolean {
  return GENERIC_NATIVES.has(stripDomain(conceptRef.trim()));
}

/**
 * Authored text as a title: whitespace collapsed (descriptions are often
 * written across lines), the first letter capitalized, and a single closing
 * period dropped, since a label in a box reads as a heading. Nothing else is
 * touched: the words are the author's.
 */
export function sentenceCase(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  const trimmed =
    collapsed.endsWith(".") && !collapsed.endsWith("..") ? collapsed.slice(0, -1) : collapsed;
  return capitalizeFirst(trimmed);
}

/** The outcome names that read better as other words: a yes-or-no test's, and the default. */
const OUTCOME_WORDS: Readonly<Record<string, string>> = {
  true: "Yes",
  false: "No",
  default: "Otherwise",
};

/**
 * A condition's outcome as an arrow label: `english` → "English",
 * `high_priority` → "High priority", a yes-or-no test's `true` and `false` →
 * "Yes" and "No", and the `default` outcome → "Otherwise". A branch taken on
 * several outcomes, written `no_fit | default` as the static builder labels it,
 * reads "No fit or otherwise".
 */
export function outcomeLabel(outcome: string): string {
  const outcomes = outcome
    .split("|")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  const labels = outcomes.map((o, index) => {
    const label = OUTCOME_WORDS[o.toLowerCase()] ?? humanizeIdentifier(o);
    return index === 0 ? label : label.charAt(0).toLowerCase() + label.slice(1);
  });
  return labels.join(" or ");
}
