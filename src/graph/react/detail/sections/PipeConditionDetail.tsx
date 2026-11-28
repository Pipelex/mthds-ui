import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import {
  outcomeTone,
  outcomeWordsOf,
  selectedOutcomeWords,
  type OutcomeWordsRead,
} from "@graph/styles/methodWords";
import { KV, PromptBlock } from "./shared";
import { PIPE_STATUS_COLOR } from "@graph/react/statusColors";

/**
 * An outcome's name, in its tone when it has one (`outcomeTone`): the label
 * the method gives it, else `fallback`, the key or the pipe it names. A tone
 * is never shown as a name.
 */
function OutcomeName({ words, fallback }: { words: OutcomeWordsRead | null; fallback: string }) {
  const tone = outcomeTone(words);
  return (
    <span className={`detail-outcome-label${tone ? ` detail-outcome-label--${tone}` : ""}`}>
      {words?.label ?? fallback}
    </span>
  );
}

/**
 * An outcome row's key column: the key as the method writes it, followed by
 * its label in its tone, or, with no label, the key itself in its tone. The
 * column may wrap, so a sentence-long label leaves room for the pipe it names.
 */
function OutcomeKeyCell({
  outcomeKey,
  words,
}: {
  outcomeKey: string;
  words: OutcomeWordsRead | null;
}) {
  return (
    <span className="detail-kv-key detail-kv-key--outcome">
      {words?.label ? (
        <>
          {outcomeKey} <OutcomeName words={words} fallback={outcomeKey} />
        </>
      ) : outcomeTone(words) ? (
        <OutcomeName words={words} fallback={outcomeKey} />
      ) : (
        outcomeKey
      )}
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
            <OutcomeName words={taken} fallback={selectedOutcome ?? ""} />
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
              <OutcomeKeyCell outcomeKey={outcome} words={words} />
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
          <OutcomeKeyCell outcomeKey="default" words={defaultWords} />
          <span className="detail-kv-value">{blueprint.default_outcome}</span>
        </div>
      </div>
      <KV label="Alias Expression To" value={blueprint.add_alias_from_expression_to} />
    </>
  );
}
