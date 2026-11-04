import React from "react";
import type { Problem } from "mthds/errors";
import type { GraphSpecMode, StepCategory } from "@graph/types";
import { GRAPH_SPEC_MODE } from "@graph/types";
import { STEP_CATEGORY_WORDS } from "@graph/styles/simpleStyle";
import type {
  SimpleArrowDetail,
  SimpleDecisionDetail,
  SimpleDetail,
  SimpleFrameDetail,
  SimpleNodeLink,
  SimpleRunSummary,
  SimpleStepDetail,
  SimpleValue,
  SimpleValueDetail,
} from "@graph/styles/simpleDetail";
import { CATEGORY_ICONS, Icon, STATUS_ICONS, STATUS_LABELS } from "./simpleIcons";
import { SIMPLE_DETAIL_STRINGS as S, plainDuration } from "./simpleDetailStrings";

// The simple style's detail panel: what the reader opened, in the words the
// method declares, as the canvas draws it. It draws `buildSimpleNodeDetail`'s
// model and nothing else; the values themselves and the technical fold are the
// viewer's to render, through `renderValue` and `renderTechnical`.

export interface SimpleDetailPanelProps {
  detail: SimpleDetail;
  /** The spec's mode: a static graph ran nothing, and a dry run's values are made up. */
  mode: GraphSpecMode | undefined;
  /**
   * Draws a value itself, through the form kernel's result view. Called only in
   * a run whose values are real; returns nothing when no renderer can show it.
   */
  renderValue?: (value: SimpleValue) => React.ReactNode;
  /** The technical panel, drawn inside the fold at the bottom. */
  renderTechnical?: () => React.ReactNode;
  /** Selects a drawn node and brings it into view: what a link in the panel does. */
  onOpenNode?: (nodeId: string, event: React.MouseEvent) => void;
}

export function SimpleDetailPanel(props: SimpleDetailPanelProps) {
  const { detail } = props;
  return (
    <div className="simple-detail" data-kind={detail.kind}>
      {detail.kind === "step" && <StepView {...props} detail={detail} />}
      {detail.kind === "decision" && <DecisionView {...props} detail={detail} />}
      {detail.kind === "frame" && <FrameView {...props} detail={detail} />}
      {detail.kind === "value" && <ValueView {...props} detail={detail} />}
      {detail.kind === "arrow" && <ArrowView {...props} detail={detail} />}
    </div>
  );
}

type ViewProps<D extends SimpleDetail> = Omit<SimpleDetailPanelProps, "detail"> & { detail: D };

/** Whether the spec's values are real ones a reader should see. */
function showsValues(mode: GraphSpecMode | undefined): boolean {
  return mode !== GRAPH_SPEC_MODE.STATIC && mode !== GRAPH_SPEC_MODE.DRY;
}

// ─── Views ──────────────────────────────────────────────────────────────────

function StepView({
  detail,
  mode,
  renderValue,
  renderTechnical,
  onOpenNode,
}: ViewProps<SimpleStepDetail>) {
  const runs = detail.run?.tally?.total ?? 1;
  return (
    <>
      <Header
        category={detail.category}
        word={STEP_CATEGORY_WORDS[detail.category]}
        run={detail.run}
      />
      <h2 className="simple-detail-title">{detail.title}</h2>
      {detail.forEach && (
        <p className="simple-detail-foreach">
          <Icon size={12}>{CATEGORY_ICONS.repeat}</Icon>
          {detail.forEach}
        </p>
      )}
      {detail.problem && <PlainProblem problem={detail.problem} />}
      {runs > 1 && showsValues(mode) && <p className="simple-detail-note">{S.oneRunShown(runs)}</p>}
      {mode === GRAPH_SPEC_MODE.DRY && <p className="simple-detail-note">{S.dryRunValues}</p>}
      {detail.uses.length > 0 && (
        <Section title={S.uses}>
          {detail.uses.map((value) => (
            <ValueRow
              key={value.digest || value.title}
              value={value}
              side="from"
              mode={mode}
              renderValue={renderValue}
              onOpenNode={onOpenNode}
            />
          ))}
        </Section>
      )}
      {detail.produces.length > 0 && (
        <Section title={S.produces}>
          {detail.produces.map((value, index) => (
            <ValueRow
              key={value.digest || value.title}
              value={value}
              side="to"
              mode={mode}
              renderValue={renderValue}
              onOpenNode={onOpenNode}
              openValue={index === 0}
            />
          ))}
        </Section>
      )}
      {detail.inner && (
        <Section title={S.groups(detail.inner.count)}>
          <ol className="simple-detail-steps">
            {detail.inner.steps.map((title, index) => (
              <li key={`${index}:${title}`}>{title}</li>
            ))}
          </ol>
          {detail.inner.onExpand && (
            <button
              type="button"
              className="simple-detail-button"
              onClick={(event) => detail.inner?.onExpand?.({ soloMode: event.altKey })}
            >
              {S.showSteps}
            </button>
          )}
        </Section>
      )}
      {detail.instructions && (
        <Fold
          title={S.instructions(detail.instructions.category)}
          className="simple-detail-instructions"
        >
          <div className="simple-detail-prompt">{detail.instructions.text}</div>
        </Fold>
      )}
      <TechnicalFold render={renderTechnical} />
    </>
  );
}

function DecisionView({
  detail,
  mode,
  renderValue,
  renderTechnical,
  onOpenNode,
}: ViewProps<SimpleDecisionDetail>) {
  return (
    <>
      <Header category="decision" word={S.decisionKind} run={detail.run} />
      <h2 className="simple-detail-title">{detail.title}</h2>
      {detail.problem && <PlainProblem problem={detail.problem} />}
      {detail.uses.length > 0 && (
        <Section title={S.uses}>
          {detail.uses.map((value) => (
            <ValueRow
              key={value.digest || value.title}
              value={value}
              side="from"
              mode={mode}
              renderValue={renderValue}
              onOpenNode={onOpenNode}
            />
          ))}
        </Section>
      )}
      {detail.outcomes.length > 0 && (
        <Section title={S.outcomes}>
          <ul className="simple-detail-outcomes">
            {detail.outcomes.map((outcome) => {
              const state =
                outcome.taken === undefined ? undefined : outcome.taken > 0 ? "taken" : "not-taken";
              return (
                <li
                  key={outcome.label}
                  className={`simple-detail-outcome${state ? ` simple-detail-outcome--${state}` : ""}`}
                >
                  <span className="simple-detail-outcome-label">{outcome.label}</span>
                  <span className="simple-detail-outcome-arrow" aria-hidden="true">
                    →
                  </span>
                  <span className="simple-detail-outcome-target">
                    {outcome.ends ? (
                      S.outcomeEnds[outcome.ends]
                    ) : outcome.leadsTo ? (
                      <NodeLink link={outcome.leadsTo} onOpenNode={onOpenNode} />
                    ) : (
                      outcome.leadsToTitle
                    )}
                  </span>
                  {outcome.taken !== undefined && (
                    <span className="simple-detail-outcome-taken">
                      {S.taken(outcome.taken, detail.runs)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}
      <TechnicalFold render={renderTechnical} />
    </>
  );
}

function FrameView({
  detail,
  mode,
  renderValue,
  renderTechnical,
  onOpenNode,
}: ViewProps<SimpleFrameDetail>) {
  return (
    <>
      <Header category="repeat" word={S.frameKind} run={detail.run} items={detail.items} />
      <h2 className="simple-detail-title">{detail.title}</h2>
      {detail.problem && <PlainProblem problem={detail.problem} />}
      {detail.over && (
        <Section title={S.repeatsOver}>
          <ValueRow
            value={detail.over}
            side="from"
            mode={mode}
            renderValue={renderValue}
            onOpenNode={onOpenNode}
          />
        </Section>
      )}
      {detail.steps.length > 0 && (
        <Section title={S.stepsRepeated}>
          <ol className="simple-detail-steps">
            {detail.steps.map((step) => (
              <li key={step.nodeId}>
                <NodeLink link={step} onOpenNode={onOpenNode} />
              </li>
            ))}
          </ol>
        </Section>
      )}
      <TechnicalFold render={renderTechnical} />
    </>
  );
}

function ValueView({
  detail,
  mode,
  renderValue,
  renderTechnical,
  onOpenNode,
}: ViewProps<SimpleValueDetail>) {
  const { value, role } = detail;
  const shown = showsValues(mode) ? renderValue?.(value) : null;
  const links = role === "input" ? value.to : value.from;
  return (
    <>
      <div className="simple-detail-header">
        <span className={`simple-detail-kind simple-detail-kind--${role}`}>
          <DocumentIcon list={value.isList} />
          {role === "input" ? S.inputKind : S.outputKind}
        </span>
      </div>
      <h2 className="simple-detail-title">{value.title}</h2>
      <ValueKind value={value} />
      {value.description && <p className="simple-detail-description">{value.description}</p>}
      {mode === GRAPH_SPEC_MODE.DRY && <p className="simple-detail-note">{S.dryRunValues}</p>}
      {links.length > 0 && (
        <Section title={role === "input" ? S.readBy : S.madeBy}>
          <ul className="simple-detail-links">
            {links.map((link) => (
              <li key={link.nodeId}>
                <NodeLink link={link} onOpenNode={onOpenNode} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      {shown && <div className="simple-detail-value">{shown}</div>}
      {detail.fields.length > 0 && (
        <Section title={S.contains}>
          <dl className="simple-detail-fields">
            {detail.fields.map((field) => (
              <React.Fragment key={field.title}>
                <dt>{field.title}</dt>
                {field.description && <dd>{field.description}</dd>}
              </React.Fragment>
            ))}
          </dl>
        </Section>
      )}
      <TechnicalFold render={renderTechnical} />
    </>
  );
}

function ArrowView({ detail, mode, renderValue, onOpenNode }: ViewProps<SimpleArrowDetail>) {
  return (
    <>
      <div className="simple-detail-header">
        <span className="simple-detail-kind">
          <Icon>
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </Icon>
          {S.arrowKind}
        </span>
      </div>
      <dl className="simple-detail-ends">
        <dt>{S.arrowFrom}</dt>
        <dd>
          <NodeLink link={detail.from} onOpenNode={onOpenNode} />
        </dd>
        <dt>{S.arrowTo}</dt>
        <dd>
          <NodeLink link={detail.to} onOpenNode={onOpenNode} />
        </dd>
      </dl>
      {detail.outcome && (
        <p className="simple-detail-outcome-note">{S.whenOutcome(detail.outcome)}</p>
      )}
      {mode === GRAPH_SPEC_MODE.DRY && detail.values.length > 0 && (
        <p className="simple-detail-note">{S.dryRunValues}</p>
      )}
      {detail.values.length > 0 ? (
        <Section title={S.carries}>
          {detail.values.map((value) => (
            <ValueRow
              key={value.digest || value.title}
              value={value}
              mode={mode}
              renderValue={renderValue}
              onOpenNode={onOpenNode}
              openValue
            />
          ))}
        </Section>
      ) : (
        <p className="simple-detail-note">{S.carriesNothing}</p>
      )}
    </>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────────

function Header({
  category,
  word,
  run,
  items,
}: {
  category: StepCategory;
  word: string;
  run?: SimpleRunSummary;
  items?: SimpleRunSummary["tally"];
}) {
  return (
    <div className={`simple-detail-header simple-detail-header--${category}`}>
      <span className="simple-detail-kind">
        <Icon>{CATEGORY_ICONS[category]}</Icon>
        {word}
      </span>
      {run && <RunLine run={run} items={items} />}
    </div>
  );
}

/** Where the run stands: "Done · 3.2s", or a step's runs counted, or a frame's items. */
function RunLine({ run, items }: { run: SimpleRunSummary; items?: SimpleRunSummary["tally"] }) {
  const status = STATUS_LABELS[run.status];
  let text: string;
  if (items) text = S.items(items);
  else if (run.tally) text = S.ranTimes(run.tally);
  else
    text = S.ranOnce(
      status,
      run.durationSeconds !== undefined ? plainDuration(run.durationSeconds) : null,
    );
  return (
    <span className={`simple-detail-run simple-detail-run--${run.status}`}>
      <span className={`simple-status simple-status--${run.status}`} aria-hidden="true">
        <Icon size={11}>{STATUS_ICONS[run.status]}</Icon>
      </span>
      <span className="simple-detail-run-text">
        {items || run.tally ? <span className="simple-detail-sr">{status}: </span> : null}
        {text}
      </span>
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="simple-detail-section">
      <h3 className="simple-detail-section-title">{title}</h3>
      {children}
    </section>
  );
}

/**
 * A fold whose content is mounted only while it is open, so a folded value
 * costs nothing: a step that reads five values draws the one it produced, not
 * five result views behind closed folds.
 */
function Fold({
  title,
  className,
  bodyClassName,
  children,
  defaultOpen = false,
}: {
  title: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode | (() => React.ReactNode);
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <details
      className={`simple-detail-fold${className ? ` ${className}` : ""}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="simple-detail-fold-title">{title}</summary>
      {open && (
        <div className={`simple-detail-fold-body${bodyClassName ? ` ${bodyClassName}` : ""}`}>
          {typeof children === "function" ? children() : children}
        </div>
      )}
    </details>
  );
}

/**
 * The technical panel, folded: the detailed style's panel for the same node,
 * for the reader who wants the pipe's code, its settings and its prompts as
 * sent.
 */
function TechnicalFold({ render }: { render?: () => React.ReactNode }) {
  if (!render) return null;
  return (
    <Fold
      title={S.technicalDetails}
      className="simple-detail-technical"
      bodyClassName="simple-detail-technical-body"
    >
      {render}
    </Fold>
  );
}

/** A value: its name, what kind of thing it is, where it comes from or goes, and in a run the value itself. */
function ValueRow({
  value,
  side,
  mode,
  renderValue,
  onOpenNode,
  openValue = false,
}: {
  value: SimpleValue;
  /** Which of its links to show: where it comes from, where it goes, or neither, on an arrow. */
  side?: "from" | "to";
  mode: GraphSpecMode | undefined;
  renderValue?: (value: SimpleValue) => React.ReactNode;
  onOpenNode?: (nodeId: string, event: React.MouseEvent) => void;
  openValue?: boolean;
}) {
  const shown = showsValues(mode) ? renderValue?.(value) : null;
  return (
    <div className="simple-value">
      <div className="simple-value-head">
        <DocumentIcon list={value.isList} />
        <span className="simple-value-title">{value.title}</span>
        <ValueKind value={value} inline />
      </div>
      {value.description && <p className="simple-value-description">{value.description}</p>}
      {side && <ValueLinks value={value} side={side} onOpenNode={onOpenNode} />}
      {shown && (
        <Fold
          title={openValue ? S.value : S.showValue}
          className="simple-value-fold"
          defaultOpen={openValue}
        >
          {shown}
        </Fold>
      )}
    </div>
  );
}

/** The concept's plain name beside a value's title, and whether it is a list. */
function ValueKind({ value, inline = false }: { value: SimpleValue; inline?: boolean }) {
  const kind = value.subtitle
    ? value.isList
      ? S.listOf(value.subtitle)
      : value.subtitle
    : value.isList
      ? S.list
      : undefined;
  if (!kind) return null;
  return inline ? (
    <span className="simple-value-kind">{kind}</span>
  ) : (
    <p className="simple-detail-subtitle">{kind}</p>
  );
}

function ValueLinks({
  value,
  side,
  onOpenNode,
}: {
  value: SimpleValue;
  side: "from" | "to";
  onOpenNode?: (nodeId: string, event: React.MouseEvent) => void;
}) {
  const links = side === "from" ? value.from : value.to;
  if (side === "to" && links.length === 0) {
    return <p className="simple-value-links simple-value-links--none">{S.nothingReadsIt}</p>;
  }
  if (links.length === 0) return null;
  return (
    <p className="simple-value-links">
      <span className="simple-value-links-label">{side === "from" ? S.from : S.usedBy}</span>
      {links.map((link, index) => (
        <React.Fragment key={link.nodeId}>
          {index > 0 && <span className="simple-value-links-sep">, </span>}
          <NodeLink link={link} onOpenNode={onOpenNode} />
        </React.Fragment>
      ))}
    </p>
  );
}

/** A drawn node named in the panel: a method input or result reads as such, a step by its title. */
function NodeLink({
  link,
  onOpenNode,
}: {
  link: SimpleNodeLink;
  onOpenNode?: (nodeId: string, event: React.MouseEvent) => void;
}) {
  const label =
    link.kind === "input"
      ? `${S.inputOfMethod}: ${link.title}`
      : link.kind === "output"
        ? `${S.resultOfMethod}: ${link.title}`
        : link.title;
  if (!onOpenNode) return <span className="simple-link simple-link--static">{label}</span>;
  return (
    <button
      type="button"
      className={`simple-link simple-link--${link.kind}`}
      onClick={(event) => onOpenNode(link.nodeId, event)}
    >
      {label}
    </button>
  );
}

/** Why it failed, in the problem's own words: its title, its detail and what to do next. */
function PlainProblem({ problem }: { problem: Problem }) {
  return (
    <div className="simple-detail-problem" role="alert">
      {problem.title && <p className="simple-detail-problem-title">{problem.title}</p>}
      {problem.detail && <p className="simple-detail-problem-detail">{problem.detail}</p>}
      {problem.next_step?.detail && (
        <p className="simple-detail-problem-next">
          <span className="simple-detail-problem-next-label">{S.whatToDoNext}: </span>
          {problem.next_step.detail}
        </p>
      )}
    </div>
  );
}

/** A document, stacked when it is a list, as the canvas draws an input or a result. */
function DocumentIcon({ list }: { list: boolean }) {
  return (
    <span
      className={`simple-value-icon${list ? " simple-value-icon--list" : ""}`}
      aria-hidden="true"
    >
      <Icon size={13}>
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      </Icon>
    </span>
  );
}
