.PHONY: all install build lint format format-check typecheck test test-watch test-coverage check c clean smoke-pack storybook st fixtures fixtures-live fixtures-live-test fixtures-missing fixtures-live-missing schema-refresh t

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

clean:
	rm -rf dist node_modules
