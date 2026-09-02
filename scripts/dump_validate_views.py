"""Dump a bundle's `pipe_io_contracts`, `input_form` and `output_form` as JSON, for the Storybook fixtures.

These are the artifacts the form kernel is fed, and they are **siblings, not a
whole and a part**: the contract says what a pipe's slots ACCEPT and what its
output PAYLOAD looks like (the JSON schemas), while the two descriptors say what
each slot IS (kind, constraints, presence, gating, and the authored order the
contract's `inputs` map deliberately does not carry). Since form-kernel `0.5.0`
a descriptor is what drives the derivation and the contract is co-walked beside
it, so a fixture carrying only one renders nothing at all.

`output_form` is the newest of the three and the reason this file grew a third
builder: it is what `ResultPanel` renders, the output twin of `input_form` —
one `field` rather than a list of them, named `output`, carrying no `presence`
and no `gating`, because a result is not a slot a caller fills. Paired with
`output.json_schema` off the contract it is everything a renderer needs to show
a run's result without inspecting the payload.

The hosted `/validate` returns all three on `PipelexValidationReport` and lets a
caller ask for them by name (`views: ["pipe_io_contracts", "input_form",
"output_form"]`), but **no pipelex CLI surfaces any of them today** — the agent
CLI's `validate bundle --format json` carries the verdict and the per-pipe
sweep, not these. So this loads the bundle through pipelex's own library manager
and calls `build_pipe_io_contracts`, `build_input_form` and `build_output_form`,
the canonical builders every validate surface uses, then prints all three maps
on stdout under the same names the wire gives them.

All three are built from ONE load of ONE library window, which is not merely an
optimization: the builders iterate the same `pipes` sequence and therefore share
one key set, and the descriptor builders read the authored blueprints
accumulated in that window. Separate invocations could not promise either.

**It deliberately does not run the validation sweep.** All three artifacts are
projections of what a pipe DECLARES, not of what happens when it runs, and the
builders take loaded pipes. Going through `validate_bundles_in_process` would
drag the dry-run sweep in with it, which means every fixture in the corpus would
depend on a current local model deck — a bundle referencing a model handle the
deck has not got would produce nothing, for reasons that have nothing to do with
its inputs.

Run through the sibling `../pipelex` checkout's venv, exactly like the rest of
`scripts/generate-fixtures.mjs`:

    ../pipelex/.venv/bin/python scripts/dump_validate_views.py <bundle.mthds>

Retire this the moment the agent CLI can emit the views itself — the request is
filed as ledger item `L-260823-d042fd`, owned by `pipelex`. Until then it is the
only way to keep these fixtures GENERATED rather than hand-written, which the
repo requires of every fixture.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from pipelex.cli.agent_cli.commands.agent_cli_factory import make_pipelex_for_agent_cli
from pipelex.interpreter_hub import (
    clear_current_library,
    get_current_library_id_or_none,
    get_library_manager,
    resolve_library_dirs,
    set_current_library,
)
from pipelex.mthds_parsing.parser import MthdsParser
from pipelex.pipeline.input_form import (
    build_input_form,
    build_output_form,
    qualify_current_library_crate,
)
from pipelex.pipeline.pipe_io_contracts import build_pipe_io_contracts


async def views_for(bundle: Path) -> dict[str, object]:
    """Load the bundle into a throwaway library and project its pipes into every validate view."""
    library_manager = get_library_manager()
    library_id, _ = library_manager.open_library()
    previous_library_id = get_current_library_id_or_none()
    try:
        set_current_library(library_id=library_id)
        effective_dirs, _ = resolve_library_dirs(None)
        if effective_dirs:
            library_manager.load_libraries(library_id=library_id, library_dirs=effective_dirs)
        await asyncio.sleep(0)  # keep the async shape the loader expects

        blueprint = MthdsParser.make_pipelex_bundle_blueprint(
            mthds_content=bundle.read_text(encoding="utf-8"),
            mthds_source=str(bundle),
        )
        pipes = library_manager.load_from_blueprints(library_id=library_id, blueprints=[blueprint])

        # Every builder must run while the library is still loaded: the contract
        # builder resolves concept classes from the CURRENT library and raises
        # against a torn-down one, and the descriptor derivers read that
        # library's accumulated crate for the authored facts (hints, the slot
        # forms behind `presence`). The crate is qualified ONCE and handed to
        # both descriptor builders, since qualification is a whole-crate walk
        # and doing it twice would be the same walk for the same answer.
        #
        # Dumped WITH the nulls, deliberately. `item_count` is nullable on both
        # sides of the contract and carries `null` off the `fixed` multiplicity
        # arm — which is nearly every slot — so an `exclude_none=True` here would
        # drop a key the wire always sends, and the generated modules cast through
        # `unknown`, so nothing would go red. The hosted `/validate` dumps its
        # valid arm the same way.
        contracts = {
            pipe_ref: contract.model_dump(mode="json")
            for pipe_ref, contract in build_pipe_io_contracts(pipes).items()
        }
        qualified_crate = qualify_current_library_crate()
        input_form = {
            pipe_ref: descriptor.model_dump(mode="json")
            for pipe_ref, descriptor in build_input_form(
                pipes, qualified_crate=qualified_crate
            ).items()
        }
        output_form = {
            pipe_ref: descriptor.model_dump(mode="json")
            for pipe_ref, descriptor in build_output_form(
                pipes, qualified_crate=qualified_crate
            ).items()
        }
        return {
            "pipe_io_contracts": contracts,
            "input_form": input_form,
            "output_form": output_form,
        }
    finally:
        if previous_library_id is not None:
            set_current_library(library_id=previous_library_id)
        else:
            clear_current_library()
        library_manager.teardown(library_id=library_id)


def main() -> int:
    """Boot pipelex, dump the bundle's validate views on stdout, and report an exit code."""
    if len(sys.argv) != 2:
        print("usage: dump_validate_views.py <bundle.mthds>", file=sys.stderr)
        return 2

    bundle = Path(sys.argv[1])
    if not bundle.is_file():
        print(f"no such bundle: {bundle}", file=sys.stderr)
        return 2

    make_pipelex_for_agent_cli(needs_inference=False)
    views = asyncio.run(views_for(bundle))
    json.dump(views, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
