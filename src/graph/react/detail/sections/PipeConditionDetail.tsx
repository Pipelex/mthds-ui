import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { OUTCOME_TONE } from "@graph/types";
import {
  outcomeWordsOf,
  selectedOutcomeWords,
  type OutcomeWordsRead,
} from "@graph/styles/methodWords";
import { KV, PromptBlock } from "./shared";
import { PIPE_STATUS_COLOR } from "@graph/react/statusColors";

/** An outcome's label in its tone: an outcome with words and no tone reads as neutral. */
function OutcomeLabel({ words }: { words: OutcomeWordsRead }) {
  const tone = words.tone ?? OUTCOME_TONE.NEUTRAL;
  return (
    <span className={`detail-outcome-label detail-outcome-label--${tone}`}>
      {words.label ?? tone}
    </span>
  );
}

export function PipeConditionSection({
  blueprint,
  executionData,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeCondition" }>;
  executionData?: Record<string, unknown>;
}) {
  const evaluatedExpression = executionData?.evaluated_expression as string | undefined;
  const selectedOutcome = executionData?.selected_outcome as string | undefined;
  // A live run records the words of the outcome it took on the condition's node.
  const taken = selectedOutcomeWords(executionData);
  const defaultWords = outcomeWordsOf(blueprint, null);

  return (
    <>
      <PromptBlock label="Expression" text={blueprint.expression} />
      {evaluatedExpression && <KV label="Expression Result" value={evaluatedExpression} />}
      {taken && (
        <div className="detail-kv-row">
          <span className="detail-kv-key">Outcome Taken</span>
          <span className="detail-kv-value">
            <OutcomeLabel words={taken} />
            {taken.description && (
              <span className="detail-outcome-description">{taken.description}</span>
            )}
          </span>
        </div>
      )}
      <div>
        <div className="detail-section-label">Outcomes</div>
        {Object.entries(blueprint.outcome_map).map(([outcome, pipeCode]) => {
          const words = outcomeWordsOf(blueprint, outcome);
          return (
            <div
              key={outcome}
              className="detail-kv-row"
              style={
                selectedOutcome === pipeCode
                  ? { background: "var(--color-success-bg, rgba(80,250,123,0.08))" }
                  : undefined
              }
              title={words?.description ?? undefined}
            >
              <span className="detail-kv-key">
                {outcome}
                {words && (
                  <>
                    {" "}
                    <OutcomeLabel words={words} />
                  </>
                )}
              </span>
              <span
                className="detail-kv-value"
                style={
                  selectedOutcome === pipeCode ? { color: PIPE_STATUS_COLOR.succeeded } : undefined
                }
              >
                {pipeCode}
              </span>
            </div>
          );
        })}
        <div className="detail-kv-row" title={defaultWords?.description ?? undefined}>
          <span className="detail-kv-key">
            default
            {defaultWords && (
              <>
                {" "}
                <OutcomeLabel words={defaultWords} />
              </>
            )}
          </span>
          <span className="detail-kv-value">{blueprint.default_outcome}</span>
        </div>
      </div>
      <KV label="Alias Expression To" value={blueprint.add_alias_from_expression_to} />
    </>
  );
}
