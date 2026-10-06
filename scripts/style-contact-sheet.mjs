#!/usr/bin/env node
// The graph styles' contact sheet: one capture of `make style-review` laid out
// as a single self-contained HTML page, each fixture's detailed and simple
// pictures side by side with the rubric's measurements beneath, for a reviewer
// to read anywhere. The pictures are inlined, so the page is one file.
//
//   node scripts/style-contact-sheet.mjs .style-review/<iteration> [out.html]
//
// It reads `manifest.json` (the review set, written by the capture), each
// capture's `.jpg` and `.json`, the `interactions/` pictures if any, and an
// optional `review.json` the reviewer writes beside them: a summary, the
// cold-read results and per-fixture notes. It writes `contact-sheet.html` into
// the capture directory unless told otherwise.

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) {
  process.stderr.write("usage: node scripts/style-contact-sheet.mjs .style-review/<iteration> [out.html]\n");
  process.exit(1);
}
const out = process.argv[3] ?? path.join(dir, "contact-sheet.html");

const readJson = (file, fallback) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
const manifest = readJson(path.join(dir, "manifest.json"), null);
if (!manifest) {
  process.stderr.write(`no manifest.json in ${dir}: run \`make style-review\` first\n`);
  process.exit(1);
}
const review = readJson(path.join(dir, "review.json"), {});

const escapeHtml = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const dataUri = (file) => `data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}`;

/** The captures of one style, keyed by name (`<FIXTURE>-<mode>-<direction>-<theme>`). */
function capturesOf(style) {
  const styleDir = path.join(dir, style);
  const found = new Map();
  if (!fs.existsSync(styleDir)) return found;
  for (const file of fs.readdirSync(styleDir)) {
    if (!file.endsWith(".jpg")) continue;
    const name = file.slice(0, -4);
    found.set(name, {
      image: path.join(styleDir, file),
      metrics: readJson(path.join(styleDir, `${name}.json`), null),
    });
  }
  return found;
}
const detailed = capturesOf("detailed");
const simple = capturesOf("simple");

const VARIANT_ORDER = ["static-LR-light", "static-TB-light", "static-LR-dark", "live-LR-light"];
const VARIANT_LABEL = {
  "static-LR-light": "Static, left to right",
  "static-TB-light": "Top to bottom",
  "static-LR-dark": "Dark theme",
  "live-LR-light": "Live run, caught midway",
};
const GROUP_LABEL = {
  basics: "Basics",
  fork: "Fork and join",
  decisions: "Decisions",
  loops: "Loops",
  realistic: "Realistic methods",
  nesting: "Nesting and folding",
  catalog: "Catalog",
};
const LEGIBLE_PX = 11;

function figure(style, capture, alt) {
  if (!capture) {
    return `<figure class="shot shot--missing"><div class="missing">No ${style} capture</div></figure>`;
  }
  return `<figure class="shot"><img src="${dataUri(capture.image)}" alt="${escapeHtml(alt)}" loading="lazy" width="1280" height="800"><figcaption>${style === "detailed" ? "Detailed" : "Simple"}</figcaption></figure>`;
}

function metricRow(d, s) {
  if (!s) return "";
  const cell = (label, value, state = "") =>
    `<div class="metric${state ? ` metric--${state}` : ""}"><dt>${label}</dt><dd>${value}</dd></div>`;
  const px = (m) => (m ? `${m.effectiveTitlePx}px` : "–");
  const clipped = s.clippedTexts ?? [];
  const cells = [
    cell("Nodes", `${d ? d.nodes : "–"} → ${s.nodes}`, d && s.nodes < d.nodes ? "good" : ""),
    cell(
      "Title at fit view",
      `${px(d)} → ${px(s)}`,
      s.effectiveTitlePx >= LEGIBLE_PX ? "good" : "bad",
    ),
    cell("Overlaps", String(s.overlaps), s.overlaps === 0 ? "good" : "bad"),
    cell(
      "Identifiers drawn",
      String(s.identifierTexts.length),
      s.identifierTexts.length === 0 ? "good" : "bad",
    ),
    cell("Titles cut", String(clipped.length), clipped.length === 0 ? "good" : "warn"),
  ];
  const cut = clipped.length
    ? `<p class="cut">Cut with a tooltip: ${clipped.map((c) => `“${escapeHtml(c.text)}” (${c.needed} lines)`).join("; ")}</p>`
    : "";
  return `<dl class="metrics">${cells.join("")}</dl>${cut}`;
}

const sections = [];
let currentGroup = "";
for (const fixture of manifest.fixtures) {
  const variants = VARIANT_ORDER.filter(
    (v) => detailed.has(`${fixture.id}-${v}`) || simple.has(`${fixture.id}-${v}`),
  );
  if (variants.length === 0) continue;
  if (fixture.group !== currentGroup) {
    currentGroup = fixture.group;
    sections.push(`<h2 class="group" id="group-${currentGroup}">${GROUP_LABEL[currentGroup] ?? currentGroup}</h2>`);
  }
  const note = review.notes?.[fixture.id];
  const pairs = variants
    .map((v) => {
      const name = `${fixture.id}-${v}`;
      const d = detailed.get(name);
      const s = simple.get(name);
      return `<div class="variant"><h4>${VARIANT_LABEL[v]}</h4><div class="pair">${figure("detailed", d, `${fixture.label}, detailed, ${VARIANT_LABEL[v]}`)}${figure("simple", s, `${fixture.label}, simple, ${VARIANT_LABEL[v]}`)}</div>${metricRow(d?.metrics, s?.metrics)}</div>`;
    })
    .join("");
  sections.push(
    `<section class="fixture" id="${fixture.id}"><h3>${escapeHtml(fixture.label)}</h3>${note ? `<p class="note">${escapeHtml(note)}</p>` : ""}${pairs}</section>`,
  );
}

const interactionsDir = path.join(dir, "interactions");
const interactions = fs.existsSync(interactionsDir)
  ? fs
      .readdirSync(interactionsDir)
      .filter((f) => f.endsWith(".jpg"))
      .sort()
      .map((f) => {
        const caption = f
          .slice(0, -4)
          .replace(/^menu-/, "Style menu open, toolbar at ")
          .replace(/^detail-step$/, "A step's detail panel")
          .replaceAll("-", " ");
        return `<figure class="shot"><img src="${dataUri(path.join(interactionsDir, f))}" alt="${escapeHtml(caption)}" loading="lazy" width="1280" height="800"><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
      })
  : [];

const coldReads = (review.coldReads ?? [])
  .map(
    (c) => `<tr><th scope="row">${escapeHtml(c.fixture)}</th>${["detailed", "simple"]
      .map((style) => {
        const r = c[style];
        if (!r) return "<td>–</td>";
        return `<td><span class="verdict verdict--${r.pass ? "pass" : "fail"}">${r.pass ? "Pass" : "Fail"}</span> ${escapeHtml(r.reading)}</td>`;
      })
      .join("")}</tr>`,
  )
  .join("");

const summary = (review.summary ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
const title = review.title ?? "Graph styles contact sheet";

const html = `<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Source+Sans+3:wght@400;600&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* Layout: a reading column for the verdict, then full-width pairs of pictures, detailed left and simple right, stacked on a phone. */
:root {
  --bg: #f5f7fa;
  --surface: #ffffff;
  --ink: #18202c;
  --muted: #5a6577;
  --line: #d9dee7;
  --accent: #b4540a;
  --good: #17733f;
  --warn: #8a6100;
  --bad: #b3261e;
  --font-display: "Bricolage Grotesque", "Source Sans 3", system-ui, sans-serif;
  --font-body: "Source Sans 3", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-data: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0f1319; --surface: #171c24; --ink: #e6eaf0; --muted: #9aa5b5; --line: #2a313c;
    --accent: #f0a25a; --good: #5cc98a; --warn: #e2b54d; --bad: #f2827a; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0f1319; --surface: #171c24; --ink: #e6eaf0; --muted: #9aa5b5; --line: #2a313c;
  --accent: #f0a25a; --good: #5cc98a; --warn: #e2b54d; --bad: #f2827a; color-scheme: dark;
}
body { background: var(--bg); color: var(--ink); font: 16px/1.55 var(--font-body); }
.page { max-width: 1440px; margin: 0 auto; padding-inline: 16px; padding-block: 32px 64px; display: grid; gap: 28px; }
header { display: grid; gap: 12px; max-width: 70ch; }
.eyebrow { font: 600 12px/1 var(--font-body); letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
h1 { font: 700 clamp(28px, 4vw, 40px)/1.1 var(--font-display); margin: 0; text-wrap: balance; }
h2.group { font: 700 24px/1.2 var(--font-display); margin: 24px 0 0; padding-top: 16px; border-top: 1px solid var(--line); }
h3 { font: 600 20px/1.25 var(--font-display); margin: 0; }
h4 { font: 600 13px/1 var(--font-body); letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin: 0; }
header p, .summary p { margin: 0; max-width: 70ch; }
nav { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 14px; }
nav a, a { color: var(--accent); }
.fixture { display: grid; gap: 16px; }
.variant { display: grid; gap: 10px; }
.pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 760px) { .pair { grid-template-columns: minmax(0, 1fr); } }
.shot { margin: 0; display: grid; gap: 6px; min-width: 0; }
.shot img { width: 100%; height: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); }
.shot figcaption { font-size: 13px; color: var(--muted); }
.missing { aspect-ratio: 16 / 10; max-width: 100%; display: grid; place-items: center; border: 1px dashed var(--line); border-radius: 6px; color: var(--muted); }
.metrics { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; }
.metric { display: grid; gap: 2px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); min-width: 0; }
.metric dt { font-size: 12px; color: var(--muted); }
.metric dd { margin: 0; font: 500 14px/1.3 var(--font-data); font-variant-numeric: tabular-nums; }
.metric--good dd { color: var(--good); }
.metric--warn dd { color: var(--warn); }
.metric--bad dd { color: var(--bad); }
.cut, .note { margin: 0; font-size: 14px; color: var(--muted); max-width: 90ch; }
.note { color: var(--ink); }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; min-width: 640px; background: var(--surface); font-size: 14px; }
th, td { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid var(--line); }
thead th { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.verdict { display: inline-block; font: 600 12px/1 var(--font-body); padding: 3px 7px; border-radius: 999px; border: 1px solid currentColor; margin-right: 6px; }
.verdict--pass { color: var(--good); }
.verdict--fail { color: var(--bad); }
.interactions { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 12px; }
</style>
<div class="page">
  <header>
    <span class="eyebrow">${escapeHtml(review.eyebrow ?? `Iteration ${path.basename(dir)}`)}</span>
    <h1>${escapeHtml(title)}</h1>
    <div class="summary">${summary}</div>
    <nav aria-label="Groups">${[...new Set(manifest.fixtures.map((f) => f.group))]
      .map((g) => `<a href="#group-${g}">${GROUP_LABEL[g] ?? g}</a>`)
      .join("")}${coldReads ? '<a href="#cold-read">Cold read</a>' : ""}${interactions.length ? '<a href="#interactions">Menu and detail panel</a>' : ""}</nav>
  </header>
  ${
    coldReads
      ? `<section id="cold-read"><h2 class="group">Cold read</h2><p class="cut">A fresh reader is given one picture and nothing else, and asked what the process needs, what it produces and what it decides. A pass names the input, the output and every decision.</p><div class="table-wrap"><table><thead><tr><th scope="col">Fixture</th><th scope="col">Detailed</th><th scope="col">Simple</th></tr></thead><tbody>${coldReads}</tbody></table></div></section>`
      : ""
  }
  ${sections.join("\n")}
  ${interactions.length ? `<section id="interactions"><h2 class="group">Menu and detail panel</h2><div class="interactions">${interactions.join("")}</div></section>` : ""}
</div>
`;

fs.writeFileSync(out, html);
process.stdout.write(`${out} (${(Buffer.byteLength(html) / 1e6).toFixed(1)} MB)\n`);
