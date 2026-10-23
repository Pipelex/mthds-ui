/**
 * One upload the run panel runs for a dropped file: from the host's
 * `uploadFile` to the value written at the field's path, and the promise of that
 * value the panel hands back to the kernel's field as `onDropFile`'s answer.
 *
 * It is React-free and kept out of the component so that what the panel
 * promises the field can be tested on its own. The promise goes to the kernel's
 * control and to nothing else, so no story can hold it; the stories prove what
 * the field does with it.
 *
 * Why the panel answers at all (kernel `0.22.0`, docs/upload-seam.md in the
 * kernel, "The local preview belongs to the value it was made for"): a dropped
 * file is shown from an object URL until its upload lands, and the field must
 * then tell its upload's result from a file someone else wrote there. Told
 * nothing, it goes by when the value lands, which asks the host to write the
 * value in the very render it ends the flight. The panel cannot promise that:
 * the values are the host's, and a host applying them through a store, a
 * transition or a store that renders on write puts them on screen a render
 * after or before the panel's own mark goes, and the field then drops the
 * preview. Answered with the file the upload wrote, the field matches its URL
 * whichever render it lands in.
 */

/** What a host's upload returns: the stored URL, and optionally a display name. */
export interface UploadedFile {
  url: string;
  filename?: string;
}

/** The steps of one upload, each supplied by the panel. */
export interface PanelUpload {
  /** The field's id, its dotted value path, named when the upload is abandoned. */
  id: string;
  /** Starts the host's upload. */
  start: () => Promise<UploadedFile>;
  /** Whether the form the file was dropped in is still the one on screen. */
  isCurrent: () => boolean;
  /** Writes what the upload stored at the field's path and returns the value written. */
  write: (stored: UploadedFile) => UploadedFile;
  /** Takes the field out of the panel's set of uploads in flight. */
  endFlight: () => void;
  /** Where a bug in `write` is reported: an unhandled rejection unless a test passes its own. */
  reportBug?: (bug: unknown) => void;
}

/**
 * Runs one upload and returns its answer for the field: a promise that resolves
 * to the value it wrote, and rejects when it wrote nothing, because the upload
 * failed, the form moved on before it landed, or the write-back threw. The
 * field matches the resolved URL to the value, and retires the dropped file's
 * preview on a rejection rather than waiting for a file that will never arrive.
 * It is the kernel's own `useMethodForm` `dropFile`, answered the same way.
 *
 * Every rejection is handled here as well as by the field, so a caller that
 * ignores the promise leaves no unhandled rejection behind, as the kernel's
 * `dropFile` does. A failed upload is the host's to announce, since it owns the
 * transport, and an abandoned one is nobody's. A write-back bug is the one
 * failure that must stay visible, and is reported apart (see `write` below).
 */
export function runPanelUpload({
  id,
  start,
  isCurrent,
  write,
  endFlight,
  reportBug = surfaceAsUnhandledRejection,
}: PanelUpload): Promise<UploadedFile> {
  // Called through an async wrapper rather than directly. `uploadFile` is the
  // HOST's function and is typed as a plain function returning a promise —
  // nothing obliges it to be `async`. One that validates before it starts the
  // request (no API key configured, a file over the size limit, a mime type it
  // will not take) throws SYNCHRONOUSLY, and a synchronous throw happens before
  // there is a promise to hang the cleanup below on. The id the panel marked
  // before calling this would then stay marked for good: `uploading` disables
  // the dropzone, so the field cannot even be retried, and Run stays gated
  // until the user leaves the form entirely. The wrapper turns that throw into
  // the rejection this chain already cleans up, which makes the SAME host logic
  // behave the same way whether it was written `async` or not — the only
  // difference between those two spellings being the keyword.
  const landed = (async () => await start())().then((stored) => {
    // The form this file was dropped in is gone: another pipe, an example's
    // fill, or the panel unmounting (see the generation marker in
    // `RunPanel.tsx`). Writing now would land the file in a form that never
    // asked for it, so nothing is written, and the answer says so.
    if (!isCurrent()) {
      throw new Error(
        `The form moved on before the upload dropped at "${id}" landed, so it wrote nothing.`,
      );
    }
    try {
      return write(stored);
    } catch (bug) {
      // A bug in the write-back, not a failed upload. `uploadFile` is typed
      // `Promise<UploadedFile>`, but a type is not a runtime guarantee: a host
      // branch that forgets its `return`, or unwraps a JSON response one level
      // too few, resolves to `undefined`, and `stored.url` then throws.
      //
      // It rejects the answer, because nothing was written and the field must
      // not wait for it. But the field handles that rejection, and so does the
      // cleanup below, so a bug that only rejected the answer would be
      // swallowed: the spinner clears, the field reads empty, nothing is
      // logged, and re-dropping repeats it forever, the one failure in this
      // lifecycle with no diagnostic surface anywhere. Before the panel
      // answered the field, the bug stayed visible because nothing handled the
      // write-back's own promise; now that something does, it is also raised
      // on a promise of its own that nothing handles, as an unhandled rejection
      // where the host's error reporting can see it.
      reportBug(bug);
      throw bug;
    }
  });
  // The same generation check as the write-back, for a sharper reason.
  // Switching contracts already emptied the panel's set, and the very same id
  // may since have been re-added by a NEW upload under the new generation —
  // nothing exotic, since that is what sharing the `cv` input name means, and a
  // host returning to the pipe it left reaches it with no rename at all.
  // Deleting it here would un-mark an upload that is still running: its
  // dropzone re-enables mid-flight, its progress indicator vanishes, and the
  // Run gate lets go of it.
  //
  // Given both arguments, so this chain handles every rejection of `landed`
  // and itself always resolves.
  const settle = () => {
    if (isCurrent()) endFlight();
  };
  void landed.then(settle, settle);
  return landed;
}

/** Raises `bug` on a promise nothing handles: the host's error reporting sees an unhandled rejection. */
function surfaceAsUnhandledRejection(bug: unknown): void {
  void Promise.resolve().then(() => {
    throw bug;
  });
}
