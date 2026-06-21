/**
 * Parse the text content of an embedded `<script type="application/json">`
 * placeholder. Empty or whitespace-only content (an omitted/empty embed
 * substitution) yields `null` so the adapter renders its initial/null state;
 * malformed JSON throws so the failure surfaces on the error screen.
 *
 * Trimming before the emptiness check is load-bearing: the standalone HTML
 * template indents the placeholders onto their own lines, so an embed that
 * substitutes an empty value leaves the script body as whitespace (e.g.
 * `"\n      \n    "`) rather than `""`. Without the trim, that whitespace
 * reaches `JSON.parse` and throws instead of returning the null/initial state.
 */
export function parseJsonScriptText(text: string | null | undefined, id: string): unknown {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse JSON from <script id="${id}">: ${message}`);
  }
}
