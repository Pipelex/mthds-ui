/**
 * The `./timeline` entry — a run's progress, React-free.
 *
 * The progress snapshot's types, the invocation path grammar, the rule a reader
 * keeps the fresher of two snapshots by, and the projection of a snapshot into
 * the rows and bars a timeline draws. Importable from a server, a worker or a
 * CLI with nothing but this package installed; the component that draws the
 * rows is behind `./timeline/react`.
 */
export * from "./progressSnapshot";
export * from "./invocationPath";
export * from "./snapshotFreshness";
export * from "./timelineRows";
export * from "./timelineTime";
