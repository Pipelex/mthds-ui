.PHONY: all install build lint format format-check typecheck test test-watch test-coverage check clean storybook fixtures fixtures-live fixtures-live-test

install:
	npm install

build:
	npm run build

lint:
	npx eslint src/

format:
	npx prettier --write "src/**/*.ts"

format-check:
	npx prettier --check "src/**/*.ts"

typecheck:
	npx tsc --noEmit

test:
	npx vitest run

test-watch:
	npx vitest

test-coverage:
	npx vitest run --coverage

check: lint format-check typecheck
	@echo "All checks passed."

all: check test build
	@echo "All checks passed and build succeeded."

storybook:
	npx storybook dev -p 6006

fixtures:
	node scripts/generate-fixtures.mjs

fixtures-live:
	node scripts/generate-fixtures.mjs --live

# Smoke-test the live path on 3 small bundles — runs real inference, writes nothing.
fixtures-live-test:
	node scripts/generate-fixtures.mjs --live --check --only pipeline_01,pipeline_02,pipeline_03

clean:
	rm -rf dist node_modules
