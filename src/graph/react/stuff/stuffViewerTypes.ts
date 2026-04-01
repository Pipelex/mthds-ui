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
