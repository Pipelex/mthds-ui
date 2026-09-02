.PHONY: all install build lint format format-check typecheck test test-watch test-coverage check c clean smoke-pack storybook st fixtures fixtures-contracts fixtures-live fixtures-live-test fixtures-missing fixtures-live-missing schema-refresh t use-local use-npm ul un

install:
	npm install

build:
	npm run build

lint:
	npx eslint src/

format:
	npx prettier --write "src/**/*.{ts,tsx}"

format-check:
	npx prettier --check "src/**/*.{ts,tsx}"

typecheck:
	npx tsc --noEmit

test:
	npx vitest run

t: test

test-watch:
	npx vitest

test-coverage:
	npx vitest run --coverage

check: lint format-check typecheck
	@echo "All checks passed."

c: check

all: check test build
	@echo "All checks passed and build succeeded."

# Pack the tarball and inspect it from a bare consumer that deliberately does
# NOT have @pipelex/mthds-form installed — the only place the export map, the
# externals and the "use client" directives are observable. Slow (it builds and
# installs), so it is not part of `check`.
smoke-pack:
	node scripts/smoke-pack.mjs

storybook:
	npx storybook dev -p 6006

st: storybook

# Pass ONLY=pipeline_04 (or a comma-separated list) to regenerate just those
# pipelines — the rest are reused from disk so the fixture file stays complete.
fixtures:
	node scripts/generate-fixtures.mjs $(if $(ONLY),--only $(ONLY))

# ALWAYS pass ONLY= here. A full-corpus live run sweeps every fixture onto
# whatever pipelex the local CLI happens to be, and has no skip path — any
# failure aborts partway, leaving a half-swept, mixed-version tree.
# See wip/fixtures-live-corpus-regeneration.md.
fixtures-live:
	node scripts/generate-fixtures.mjs --live $(if $(ONLY),--only $(ONLY))

# Refresh only the pipe_io_contracts layer (what the run form renders) and the
# generated contracts fixture. Runs no pipeline: a contract is a projection of
# what a pipe declares, so this is offline, inference-free and fast.
fixtures-contracts:
	node scripts/generate-fixtures.mjs --contracts $(if $(ONLY),--only $(ONLY))

# Regenerate only the pipelines missing an on-disk spec — fills gaps after a
# partial or failed run without redoing (or paying for) the ones already done.
fixtures-missing:
	node scripts/generate-fixtures.mjs --missing

# Every pipeline has a live spec on disk, so this is currently a no-op. It earns
# its keep after a partial or failed sweep — see the fixtures-live note above.
fixtures-live-missing:
	node scripts/generate-fixtures.mjs --live --missing

# Smoke-test the live path on 3 small bundles — runs real inference, writes nothing.
fixtures-live-test:
	node scripts/generate-fixtures.mjs --live --check --only pipeline_01,pipeline_02,pipeline_03

# Re-copy the MTHDS authoring schema from the pipelex repo (reference contract
# for src/static-graph/ parsing — not a runtime dependency).
schema-refresh:
	cp ../pipelex/derived/mthds_schema.json data/schema/mthds_schema.json

# ── Local form-kernel development ──────────────────────────────────────────
# By default the optional peer `@pipelex/mthds-form` comes from npm, at the
# range package.json pins. `make use-local` swaps node_modules over to a build
# of the sibling ../mthds-form so the kernel and this library can be developed
# side by side; `make use-npm` swaps back.
#
# Both targets install with `--no-save`, so package.json is never rewritten.
# That is deliberate here and is the one place this diverges from the same pair
# in ../pipelex-starter-js, which restores `@latest` and re-pins. The kernel is
# named TWICE in this package.json — `peerDependencies` and `devDependencies` —
# and the two must agree, so moving the version is a reviewed change that
# belongs to the `/bump-mthds-form` skill, not a side effect of leaving dev mode.
#
# We pack a tarball rather than symlink because a symlinked kernel is a second
# React context identity for Vite to resolve, which is exactly the failure the
# optional-peer arrangement exists to prevent. The tarball gives a real
# directory in node_modules. Re-run `make use-local` after every kernel edit.
#
# The pack step passes `--ignore-scripts`: mthds-form's `prepare` re-runs its
# build during `npm pack`, and that build (tsup + tailwindcss) prints to stdout,
# which would corrupt the captured tarball filename. We build explicitly first,
# so skipping `prepare` loses nothing — and building explicitly is what puts
# `dist/styles.css` and `dist/theme.css` in the tarball, which .storybook/
# preview.ts imports.
#
# Both targets clear Vite's pre-bundle cache. `.storybook/main.ts` names the
# kernel in `optimizeDeps.include`, so it is pre-bundled into node_modules/.vite;
# a local build usually carries the SAME version string as the published one, so
# the optimizer's hash does not change and Storybook would keep serving the
# stale copy.

use-local:
	@if [ ! -d ../mthds-form ]; then \
		echo "ERROR: ../mthds-form not found — expected as a sibling directory."; exit 1; \
	fi
	@echo "Building ../mthds-form so dist/ is up-to-date..."
	cd ../mthds-form && npm run build
	@echo "Packing ../mthds-form into a tarball..."
	@# `2>/dev/null | tail -1`, and both halves are needed. `--silent` does not
	@# silence the build tsup runs on pack (nor browserslist's warning), so the
	@# capture picks up several lines and `mv` fails with "is not a directory" —
	@# naming a temp path, which reads like a filesystem problem rather than a
	@# capture one. The filename is always the LAST line.
	@# `mthds` is packed and installed TOO, and that is not optional. It is the
	@# kernel's peer, this package pins it at an unpublished `^0.25.0`, and npm
	@# prunes a devDependency it cannot resolve — so installing the kernel alone
	@# silently removed it, the kernel's re-exported types became `any` under
	@# skipLibCheck, and `tsc` stayed green while eslint complained about unsafe
	@# `any` in files nobody had touched.
	@#
	@# Both siblings are reverted first: ../pipelex-app's own `use-local` rewrites
	@# their manifests to point at each other, and packing one in that state bakes
	@# `file:../mthds-js` into the tarball, which then refuses to install here.
	@cd ../mthds-form && git checkout -- package.json
	@cd ../mthds-js && git checkout -- package.json 2>/dev/null || true
	@cd ../mthds-js && npm run build >/dev/null && rm -f mthds-*.tgz && TARBALL=$$(npm pack --silent --ignore-scripts 2>/dev/null | tail -1) && mv $$TARBALL /tmp/mthds-local.tgz
	@cd ../mthds-form && rm -f pipelex-mthds-form-*.tgz && TARBALL=$$(npm pack --silent --ignore-scripts 2>/dev/null | tail -1) && mv $$TARBALL /tmp/pipelex-mthds-form-local.tgz
	rm -rf node_modules/@pipelex/mthds-form node_modules/mthds node_modules/.vite node_modules/.cache/storybook
	npm install /tmp/mthds-local.tgz /tmp/pipelex-mthds-form-local.tgz --no-save --silent
	@echo "Now using local ../mthds-form (tarball install of $$(node -p "require('./node_modules/@pipelex/mthds-form/package.json').version")). Re-run after every kernel edit. 'make use-npm' to switch back."

use-npm:
	rm -rf node_modules/@pipelex/mthds-form node_modules/.vite node_modules/.cache/storybook
	npm install @pipelex/mthds-form@$$(node -p "require('./package.json').devDependencies['@pipelex/mthds-form']") --no-save
	@echo "Restored npm-published @pipelex/mthds-form $$(node -p "require('./node_modules/@pipelex/mthds-form/package.json').version") (the range package.json pins). Run 'make use-local' to switch back."

ul: use-local

un: use-npm

clean:
	rm -rf dist node_modules
