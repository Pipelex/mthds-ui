/** Data for rendering a stuff (data item) in the StuffViewer component. */
export interface StuffViewerData {
  digest: string;
  name?: string;
  concept?: string;
  contentType?: string;
  data?: unknown;
  dataText?: string;
  dataHtml?: string;
}

/**
 * Resolver for `pipelex-storage://` URIs.
 *
 * Internal pipelex-storage URIs are not directly fetchable by a browser. Callers
 * pass this function to components that may render such URIs (StuffViewer etc.)
 * to exchange them for short-lived, browser-fetchable URLs (e.g. presigned S3).
 *
 * The resolved URL has a limited lifetime. Components displaying media for
 * extended periods should re-invoke the resolver before expiry.
 *
 * Returns null if the URI cannot be resolved (auth failure, ownership mismatch, etc.).
 */
export type ResolveStorageUrl = (uri: string) => Promise<string | null>;
