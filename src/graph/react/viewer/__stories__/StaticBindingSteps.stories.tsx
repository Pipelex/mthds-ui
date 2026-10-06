import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import { GraphViewer } from "../GraphViewer";

// Two entries of the vendored MTHDS Test Corpus, built by the static builder
// with no pipelex run: the composite that exercises binding steps alongside a
// batch, a judge and an optional, and the entry batching over a dotted path.
import catalogReviewBundle from "../../../../../data/mthds-corpus/entries/feature_binding_step_catalog_review/bundle.mthds?raw";
import catalogPagesBundle from "../../../../../data/mthds-corpus/entries/feature_binding_step_batch_over_catalog_pages/bundle.mthds?raw";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - static/Valid/Binding steps",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    initialDirection: { control: { type: "inline-radio" }, options: ["LR", "TB"] },
    initialShowControllers: { control: { type: "boolean" } },
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

const D = { initialDirection: "LR" as const, initialShowControllers: true };

/** Wait for the binding cards the graph should draw, and return them. */
async function bindingCards(canvasElement: HTMLElement, count: number): Promise<HTMLElement[]> {
  return waitFor(
    () => {
      const cards = Array.from(canvasElement.querySelectorAll<HTMLElement>(".pipe-card--binding"));
      if (cards.length !== count) throw new Error(`${cards.length} binding cards, want ${count}`);
      return cards;
    },
    { timeout: 10000 },
  );
}

/**
 * Corpus entry `feature_binding_step_catalog_review`: four binding steps read
 * the catalog's title, the page view of every page (a list, through a list of
 * pages), its cheapest price and its optional editor's note. A batch captions
 * the bound views, a judge reads the bound price, and the review reads the rest.
 */
export const CatalogReview: Story = {
  args: { graph: { graphSpec: buildStaticGraphSpecFromToml(catalogReviewBundle).spec }, ...D },
  play: async ({ canvasElement }) => {
    const cards = await bindingCards(canvasElement, 4);
    for (const card of cards) {
      await expect(within(card).getByText("Binding")).toBeInTheDocument();
    }
    const pageViews = canvasElement.querySelector<HTMLElement>(
      '[data-id="catalog_review.review_catalog/step_2"]',
    );
    await expect(pageViews?.textContent).toContain("catalog.pages.page_view");
    await expect(pageViews?.textContent).toContain("Image[]");

    await userEvent.click(pageViews as HTMLElement);
    const panel = await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>(".detail-panel-content");
      if (!el) throw new Error("no detail panel");
      return el;
    });
    const rows = Array.from(panel.querySelectorAll(".detail-kv-row")).map((row) => [
      row.querySelector(".detail-kv-key")?.textContent,
      row.querySelector(".detail-kv-value")?.textContent,
    ]);
    await expect(rows).toContainEqual(["From", "catalog.pages.page_view"]);
    await expect(rows).toContainEqual(["Result", "page_views"]);
    await expect(within(panel).queryByText("Blueprint not available")).toBeNull();
  },
};

/**
 * Corpus entry `feature_binding_step_batch_over_catalog_pages`: a step batching
 * over the dotted path `catalog.pages` is drawn as the runtime runs it, a
 * binding of the list under a private name, then the batch over that name.
 */
export const DottedBatchOver: Story = {
  args: { graph: { graphSpec: buildStaticGraphSpecFromToml(catalogPagesBundle).spec }, ...D },
  play: async ({ canvasElement }) => {
    const [card] = await bindingCards(canvasElement, 1);
    await expect(card.textContent).toContain("catalog.pages");
    await expect(card.textContent).toContain("_bound_catalog_pages");
    await expect(card.textContent).toContain("CatalogPage[]");
  },
};
