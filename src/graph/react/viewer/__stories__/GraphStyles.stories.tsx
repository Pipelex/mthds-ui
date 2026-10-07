import type { Meta, StoryObj } from "@storybook/react-vite";

import { StyleReview } from "./StyleReview";
import { REVIEW_FIXTURE_IDS } from "./styleReviewFixtures";

/**
 * The graph styles' review set, to flip through live: every fixture, with
 * controls for the style, the spec's mode, the direction and the theme, and
 * the toolbar's style menu on. The capture of the same set for the review loop
 * is `GraphStyles.style-review.tsx` (`make style-review`).
 */
const meta: Meta<typeof StyleReview> = {
  title: "Graph - styles/Review set",
  component: StyleReview,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    graphStyle: "simple",
    mode: "static",
    direction: "LR",
    theme: "light",
    styleMenu: true,
  },
  argTypes: {
    fixture: { control: { type: "select" }, options: REVIEW_FIXTURE_IDS },
    graphStyle: { control: { type: "inline-radio" }, options: ["detailed", "simple"] },
    mode: { control: { type: "inline-radio" }, options: ["static", "dry", "live"] },
    direction: { control: { type: "inline-radio" }, options: ["LR", "TB"] },
    theme: { control: { type: "inline-radio" }, options: ["light", "dark"] },
    styleMenu: { control: { type: "boolean" } },
  },
};

export default meta;
type Story = StoryObj<typeof StyleReview>;

export const SinglePipe: Story = { args: { fixture: "SINGLE_PIPE" } };
export const SimpleSequence: Story = { args: { fixture: "SIMPLE_SEQUENCE" } };
export const LongSequence: Story = { args: { fixture: "LONG_SEQUENCE" } };
export const SimpleParallel: Story = { args: { fixture: "SIMPLE_PARALLEL" } };
export const WideParallel: Story = { args: { fixture: "WIDE_PARALLEL" } };
export const SimpleCondition: Story = { args: { fixture: "SIMPLE_CONDITION" } };
export const EmailTriage: Story = { args: { fixture: "EMAIL_TRIAGE" } };
export const AvailabilityRouting: Story = { args: { fixture: "AVAILABILITY_ROUTING" } };
export const SimpleBatch: Story = { args: { fixture: "SIMPLE_BATCH" } };
export const BatchWithInnerSeq: Story = { args: { fixture: "BATCH_WITH_INNER_SEQ" } };
export const CvBatchScreening: Story = { args: { fixture: "CV_BATCH_SCREENING" } };
export const CvScreening: Story = { args: { fixture: "CV_SCREENING" } };
export const RfpQualifier: Story = { args: { fixture: "RFP_QUALIFIER" } };
export const MeetingTriage: Story = { args: { fixture: "MEETING_TRIAGE" } };
export const NestedSeqCondSeq: Story = { args: { fixture: "NESTED_SEQ_COND_SEQ" } };
export const DeepNesting: Story = { args: { fixture: "DEEP_NESTING" } };
export const AllControllerTypes: Story = { args: { fixture: "ALL_CONTROLLER_TYPES" } };
export const AllPipeTypes: Story = { args: { fixture: "ALL_PIPE_TYPES" } };
export const AllNativeConcepts: Story = { args: { fixture: "ALL_NATIVE_CONCEPTS" } };
export const CatalogReview: Story = { args: { fixture: "CATALOG_REVIEW" } };

/** A run caught midway: steps done, running and failed. */
export const CvScreeningLive: Story = { args: { fixture: "CV_SCREENING", mode: "live" } };
