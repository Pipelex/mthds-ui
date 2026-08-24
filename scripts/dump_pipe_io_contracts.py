"""Dump a bundle's `pipe_io_contracts` as JSON, for the Storybook form fixtures.

`pipe_io_contracts` is the artifact the form kernel's `PipeIOContract` type
mirrors, and the thing `RunPanel` is fed. The hosted `/validate` returns it on
`PipelexValidationReport`, but **no pipelex CLI surfaces it today** — the agent
CLI's `validate bundle --format json` carries the verdict and the per-pipe
sweep, not the contracts. So this loads the bundle through pipelex's own
library manager and calls `build_pipe_io_contracts`, the canonical builder every
validate surface uses, then prints the contracts map on stdout.

**It deliberately does not run the validation sweep.** A contract is a
projection of what a pipe DECLARES, not of what happens when it runs, and
`build_pipe_io_contracts` takes loaded pipes. Going through
`validate_bundles_in_process` would drag the dry-run sweep in with it, which
means every contract in the corpus would depend on a current local model deck —
a bundle referencing a model handle the deck has not got would produce no
contract, for reasons that have nothing to do with its inputs.

Run through the sibling `../pipelex` checkout's venv, exactly like the rest of
`scripts/generate-fixtures.mjs`:

    ../pipelex/.venv/bin/python scripts/dump_pipe_io_contracts.py <bundle.mthds>

Retire this the moment the agent CLI can emit contracts itself — the request is
filed at `../wip/inbox/2026-08-23-pipelex-expose-pipe-io-contracts-in-agent-cli.md`.
Until then it is the only way to keep this fixture GENERATED rather than
hand-written, which the repo requires of every fixture.
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
from pipelex.pipeline.pipe_io_contracts import build_pipe_io_contracts


async def contracts_for(bundle: Path) -> dict[str, object]:
    """Load the bundle into a throwaway library and project its pipes into contracts."""
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

        # Must run while the library is still loaded: the builder resolves concept
        # classes from the CURRENT library and raises against a torn-down one.
        #
        # Dumped WITH the nulls, deliberately. `item_count` is nullable on both
        # sides of the contract and carries `null` off the `fixed` multiplicity
        # arm — which is nearly every slot — so an `exclude_none=True` here would
        # drop a key the wire always sends, and the generated modules cast through
        # `unknown`, so nothing would go red. The hosted `/validate` dumps its
        # valid arm the same way. `item_count` is the only nullable field on
        # either model today; a new one inherits this treatment for free.
        return {
            pipe_ref: contract.model_dump(mode="json")
            for pipe_ref, contract in build_pipe_io_contracts(pipes).items()
        }
    finally:
        if previous_library_id is not None:
            set_current_library(library_id=previous_library_id)
        else:
            clear_current_library()
        library_manager.teardown(library_id=library_id)


def main() -> int:
    """Boot pipelex, dump the bundle's contracts on stdout, and report an exit code."""
    if len(sys.argv) != 2:
        print("usage: dump_pipe_io_contracts.py <bundle.mthds>", file=sys.stderr)
        return 2

    bundle = Path(sys.argv[1])
    if not bundle.is_file():
        print(f"no such bundle: {bundle}", file=sys.stderr)
        return 2

    make_pipelex_for_agent_cli(needs_inference=False)
    contracts = asyncio.run(contracts_for(bundle))
    json.dump(contracts, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
