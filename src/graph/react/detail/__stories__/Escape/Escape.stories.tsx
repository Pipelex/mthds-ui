import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { GraphSpecNodeIoItem } from "@graph/types";
import { DetailPanel } from "@graph/react/detail/DetailPanel";
import { StuffResultPanel } from "@graph/react/detail/StuffResultPanel";
import { LIVE_ALL_NATIVE_CONCEPTS } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_34";
import {
  CONTRACTS_ALL_NATIVE_CONCEPTS,
  OUTPUT_FORM_ALL_NATIVE_CONCEPTS,
} from "@form/react/__stories__/contracts/_generated/pipeline_34";
import { detailPanelDecorator, detailPanelParameters } from "../_shared";

/**
 * Escape closes the topmost thing, and only that.
 *
 * The panel closes on Escape, and the result it shows can open a dialog of its
 * own above it: a gallery tile opens the form kernel's picture viewer. One
 * press of Escape closes that viewer alone, returns focus to the tile it opened
 * from, and leaves the panel open, exactly as the viewer's Close button does;
 * the next press, with no dialog open, closes the panel.
 *
 * The result is pipeline 34's live `illustrate` output, a text with a list of
 * pictures, which the kernel draws as a gallery. Its picture's `url` member is
 * whatever the model wrote, which no browser can fetch, so `resolveUrl` answers
 * a picture this Storybook serves, as a host resolves a stored reference.
 */
const meta: Meta = {
  title: "Misc/Detail Panel/Escape",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

const PRODUCER = "native_sampler.illustrate";
const PICTURE = "/fixtures/eiffel_tower.jpg";

function illustrated(): GraphSpecNodeIoItem {
  const item = LIVE_ALL_NATIVE_CONCEPTS.nodes.find((node) => node.pipe_code === "illustrate")?.io
    ?.outputs?.[0];
  if (!item) throw new Error("pipeline 34's live run has no illustrate result");
  return item;
}

/** A panel the story opens, and closes when the panel asks to be closed. */
function PanelWithPictures() {
  const [open, setOpen] = React.useState(true);
  const close = React.useCallback(() => setOpen(false), []);
  return (
    <DetailPanel isOpen={open} onClose={close}>
      <StuffResultPanel
        pipeIoContracts={CONTRACTS_ALL_NATIVE_CONCEPTS}
        outputForm={OUTPUT_FORM_ALL_NATIVE_CONCEPTS}
        stuff={illustrated()}
        producerPipeRef={PRODUCER}
        resolveUrl={() => PICTURE}
      />
    </DetailPanel>
  );
}

function isPanelOpen(canvasElement: HTMLElement): boolean {
  const panel = canvasElement.querySelector(".detail-panel");
  if (!panel) throw new Error("no detail panel");
  return !panel.classList.contains("detail-panel--closed");
}

export const EscapeClosesThePictureViewerFirst: Story = {
  render: () => <PanelWithPictures />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The viewer is a dialog drawn over the whole page, so it is looked for in
    // the document rather than in the story's canvas.
    const page = within(canvasElement.ownerDocument.body);

    const tile = await waitFor(() => canvas.getByRole("button", { name: /^View / }));
    await userEvent.click(tile);
    const viewer = await waitFor(() => page.getByRole("dialog"));
    await waitFor(() => expect(viewer).toHaveFocus());

    // The first press closes the viewer, and the viewer alone.
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(tile).toHaveFocus());
    await expect(isPanelOpen(canvasElement)).toBe(true);

    // With no dialog left open, the next press is the panel's.
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(isPanelOpen(canvasElement)).toBe(false));
  },
};

/**
 * A dialog of the plainest kind: it closes on Escape and tells nobody, neither
 * preventing the key's default nor stopping it. The panel still leaves the key
 * to it, because the key was pressed inside a dialog that is not the one the
 * panel sits in.
 */
function PanelWithPlainDialog() {
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const opener = React.useRef<HTMLButtonElement>(null);
  const dialog = React.useRef<HTMLDivElement>(null);
  const closePanel = React.useCallback(() => setPanelOpen(false), []);
  React.useEffect(() => {
    if (dialogOpen) dialog.current?.focus();
  }, [dialogOpen]);
  return (
    <DetailPanel isOpen={panelOpen} onClose={closePanel}>
      <button ref={opener} type="button" onClick={() => setDialogOpen(true)}>
        Open a dialog
      </button>
      {dialogOpen && (
        <div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label="A plain dialog"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            setDialogOpen(false);
            opener.current?.focus();
          }}
        >
          A dialog that closes on Escape without a word.
        </div>
      )}
    </DetailPanel>
  );
}

export const EscapeClosesAPlainDialogFirst: Story = {
  render: () => <PanelWithPlainDialog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const opener = canvas.getByRole("button", { name: "Open a dialog" });
    await userEvent.click(opener);
    const dialog = await waitFor(() => canvas.getByRole("dialog", { name: "A plain dialog" }));
    await waitFor(() => expect(dialog).toHaveFocus());

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
    await expect(opener).toHaveFocus();
    await expect(isPanelOpen(canvasElement)).toBe(true);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(isPanelOpen(canvasElement)).toBe(false));
  },
};
