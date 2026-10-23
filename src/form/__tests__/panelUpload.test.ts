/**
 * What the run panel's drop answers the kernel's field: a promise that
 * resolves to the file the upload wrote and rejects when it wrote nothing.
 *
 * The answer goes to the kernel's control and to nothing a story can hold, so
 * it is pinned here; the RunPanel stories pin what the field does with it (the
 * dropped file keeps its preview). Vitest fails a run on an unhandled
 * rejection, so every test below that lets its promise go unobserved also
 * proves that an upload which wrote nothing leaves none behind.
 */
import { describe, expect, it, vi } from "vitest";
import { runPanelUpload, type PanelUpload, type UploadedFile } from "@form/react/panelUpload";

const STORED: UploadedFile = { url: "pipelex-storage://org/assets/cv.pdf" };
const WRITTEN: UploadedFile = { url: STORED.url, filename: "cv.pdf" };

/** An upload whose steps are spies, current unless a test says otherwise. */
function steps(overrides: Partial<PanelUpload> = {}) {
  const write = vi.fn((stored: UploadedFile) => ({ url: stored.url, filename: "cv.pdf" }));
  const endFlight = vi.fn();
  const reportBug = vi.fn();
  const upload: PanelUpload = {
    id: "cv",
    start: () => Promise.resolve(STORED),
    isCurrent: () => true,
    write,
    endFlight,
    reportBug,
    ...overrides,
  };
  return { upload, write, endFlight, reportBug };
}

/** Lets every queued continuation run, the cleanup chain's included. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("runPanelUpload", () => {
  it("resolves to the file it wrote, once it has written it, and ends the flight", async () => {
    const { upload, write, endFlight, reportBug } = steps();

    await expect(runPanelUpload(upload)).resolves.toEqual(WRITTEN);
    expect(write).toHaveBeenCalledExactlyOnceWith(STORED);
    await settled();
    expect(endFlight).toHaveBeenCalledOnce();
    expect(reportBug).not.toHaveBeenCalled();
  });

  it("rejects with the upload's own failure, writes nothing and ends the flight", async () => {
    const refusal = new Error("storage refused the file");
    const { upload, write, endFlight, reportBug } = steps({ start: () => Promise.reject(refusal) });

    await expect(runPanelUpload(upload)).rejects.toBe(refusal);
    await settled();
    expect(write).not.toHaveBeenCalled();
    expect(endFlight).toHaveBeenCalledOnce();
    // The host announces its own failures; this is not a bug to raise.
    expect(reportBug).not.toHaveBeenCalled();
  });

  it("turns a synchronous throw from the host into the same rejection", async () => {
    const refusal = new Error("upload not configured");
    const { upload, write, endFlight } = steps({
      start: () => {
        throw refusal;
      },
    });

    let answer: Promise<UploadedFile> | undefined;
    expect(() => {
      answer = runPanelUpload(upload);
    }).not.toThrow();
    await expect(answer).rejects.toBe(refusal);
    await settled();
    expect(write).not.toHaveBeenCalled();
    expect(endFlight).toHaveBeenCalledOnce();
  });

  it("rejects an upload the form moved on from, writes nothing and leaves the flight alone", async () => {
    let current = true;
    let land: (stored: UploadedFile) => void = () => {};
    const { upload, write, endFlight, reportBug } = steps({
      start: () => new Promise<UploadedFile>((resolve) => (land = resolve)),
      isCurrent: () => current,
    });

    const answer = runPanelUpload(upload);
    // A pipe switch, a fill or an unmount, while the file is still arriving.
    current = false;
    land(STORED);

    await expect(answer).rejects.toThrow(/upload dropped at "cv"/);
    await settled();
    expect(write).not.toHaveBeenCalled();
    // The form that moved on emptied its set already, and the same id may hold
    // a newer upload by now, so the departed one must not take it out.
    expect(endFlight).not.toHaveBeenCalled();
    expect(reportBug).not.toHaveBeenCalled();
  });

  it("rejects when the write-back throws, and reports the bug rather than swallowing it", async () => {
    const bug = new TypeError("Cannot read properties of undefined (reading 'url')");
    const { upload, endFlight, reportBug } = steps({
      write: () => {
        throw bug;
      },
    });

    await expect(runPanelUpload(upload)).rejects.toBe(bug);
    expect(reportBug).toHaveBeenCalledExactlyOnceWith(bug);
    await settled();
    expect(endFlight).toHaveBeenCalledOnce();
  });

  it("leaves no unhandled rejection for an upload that wrote nothing when nobody waits on it", async () => {
    let current = true;
    const failed = steps({ start: () => Promise.reject(new Error("storage refused the file")) });
    const abandoned = steps({ isCurrent: () => current });

    // Neither promise is observed: an unhandled rejection from either would
    // fail this run.
    void runPanelUpload(failed.upload);
    void runPanelUpload(abandoned.upload);
    current = false;
    await settled();
    expect(failed.endFlight).toHaveBeenCalledOnce();
    expect(abandoned.write).not.toHaveBeenCalled();
  });
});
