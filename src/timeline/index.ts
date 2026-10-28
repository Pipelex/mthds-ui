/**
 * The `./timeline` entry — a run's progress, React-free.
 *
 * The progress snapshot's types, the invocation path grammar, the rule a reader
 * keeps the fresher of two snapshots by, the projections of a snapshot into
 * what each timeline style draws (the detailed style's rows and bars, the
 * simple style's checklist), and the registry of those styles. Importable from a server, a worker or a
 * CLI with nothing but this package installed; the component that draws the
 * rows is behind `./timeline/react`.
 */
export * from "./progressSnapshot";
export * from "./invocationPath";
export * from "./snapshotFreshness";
export * from "./timelineRows";
export * from "./timelineTime";
export * from "./invocationTree";
export * from "./styles/timelineStyles";
export * from "./styles/registryJoin";
export * from "./styles/simpleProgress";
