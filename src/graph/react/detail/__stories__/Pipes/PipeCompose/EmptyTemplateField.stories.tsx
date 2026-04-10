/**
 * PipeCompose / Construct mode / Empty template field (regression test)
 *
 * Edge case: a `template` field with an empty string. Before the routing fix
 * (PR #23 review from greptile + cubic-dev-ai), this got misrouted to the
 * non-template KV section and rendered as `(template)`. After the fix, the
 * field is routed to PromptToggle, which short-circuits when both templateText
 * and renderedText are falsy — so the field renders nothing instead of being
 * misrouted.
 */

import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  PipeStory,
  detailPanelDecorator,
  detailPanelParameters,
  makeComposeBlueprint,
  makeComposeStoryProps,
} from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeCompose/Empty Template Field",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const EmptyTemplateField: Story = {
  name: "Empty Template Field (regression)",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          body: { method: "template", template: "" },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};
