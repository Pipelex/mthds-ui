// ─── Which file of a method leads ────────────────────────────────────────────
// A method spread over several `.mthds` files is merged in order, and the order
// decides which bundle's `main_pipe`, `description` and fallback domain the
// merged set adopts, and which declaration a genuine clash keeps (see
// `mergeBundles`). Every host that holds a method as a list of files therefore
// needs the same answer to "which one leads", and this module is that answer,
// shared so no host keeps a private copy that drifts.

/**
 * One `.mthds` file of a method: the name it goes by and its TOML text. The
 * same shape as an `mthds_sources[]` entry on the hosted API, so a host holding
 * one can pass it straight through.
 */
export interface MthdsSource {
  /**
   * File name, or a path ending in one. The whole string is the file's
   * identity: a `preferred` file is matched against it exactly, and an embed
   * lists each name once. Only the `bundle.mthds` tie-break reads the last
   * segment alone.
   */
  name: string;
  /** The file's `.mthds` TOML text. */
  content: string;
}

/** The file name that breaks a tie when several files declare `main_pipe`. */
export const DEFAULT_BUNDLE_FILE_NAME = "bundle.mthds";

const MAIN_PIPE_LINE = /^\s*main_pipe\s*=\s*(["'])[^"']+\1\s*(?:#.*)?$/;
const TABLE_HEADER_LINE = /^\s*\[/;

/**
 * Whether a file declares `main_pipe` at the top level, before its first table.
 *
 * A line scan rather than a TOML parse, on purpose: an editor asks this about
 * a file the author is in the middle of writing, and a syntax error further
 * down must not demote the file that plainly declares the entry point. The
 * scan stops at the first table header, because a `main_pipe` key inside a
 * table is not the bundle's.
 */
export function hasTopLevelMainPipe(content: string): boolean {
  for (const line of content.split(/\r\n|\r|\n/)) {
    if (TABLE_HEADER_LINE.test(line)) return false;
    if (MAIN_PIPE_LINE.test(line)) return true;
  }
  return false;
}

function isDefaultBundle(source: MthdsSource): boolean {
  const baseName = source.name.replace(/^.*[\\/]/, "");
  return baseName.toLowerCase() === DEFAULT_BUNDLE_FILE_NAME;
}

/**
 * The file a method's graph is anchored on.
 *
 * `preferred` is the file the host is looking at, such as the one open in an
 * editor; it leads whenever it declares `main_pipe` itself. Otherwise the file
 * declaring a top-level `main_pipe` leads, `bundle.mthds` when several do and
 * the first of them in the given order when none is named so. When no file
 * declares one, `preferred` leads, or else the first file. Returns `undefined`
 * only for an empty list.
 *
 * `preferred` is matched against `sources` by `name`, and the listed entry is
 * what is read and returned, so a host may pass its own object for the open
 * file rather than the list's: the result is always a member of `sources`,
 * because the merge reads the list and not `preferred`. That is also why
 * `preferred` is a plain `MthdsSource`: it cannot narrow the result's type and
 * strip the fields a host's own list entries carry. A `preferred` whose
 * name is not listed is ignored: it cannot lead a list it is not in, and the
 * answer is then the one given no `preferred` at all.
 */
export function selectPrimaryMthdsSource<T extends MthdsSource>(
  sources: readonly T[],
  preferred?: MthdsSource,
): T | undefined {
  const listed =
    preferred === undefined ? undefined : sources.find((source) => source.name === preferred.name);
  if (listed !== undefined && hasTopLevelMainPipe(listed.content)) return listed;
  const withMainPipe = sources.filter((source) => hasTopLevelMainPipe(source.content));
  return withMainPipe.find(isDefaultBundle) ?? withMainPipe[0] ?? listed ?? sources[0];
}

/**
 * The files in the order the static builder should merge them: the primary
 * file (see {@link selectPrimaryMthdsSource}, which also says how `preferred`
 * is matched) first, then the rest in the order given. The rest keep their
 * order so a host that wants a deterministic merge only has to list its files
 * deterministically. Returns a new array.
 */
export function orderMthdsSources<T extends MthdsSource>(
  sources: readonly T[],
  preferred?: MthdsSource,
): T[] {
  const primary = selectPrimaryMthdsSource(sources, preferred);
  const index = primary === undefined ? -1 : sources.indexOf(primary);
  if (index <= 0) return [...sources];
  return [sources[index], ...sources.slice(0, index), ...sources.slice(index + 1)];
}
