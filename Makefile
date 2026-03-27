.PHONY: all install build lint format format-check typecheck test test-watch test-coverage check clean storybook

install:
	npm install

build:
	npx tsup

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

check: lint format-check typecheck test
	@echo "All checks passed."

all: check build
	@echo "All checks passed and build succeeded."

storybook:
	npx storybook dev -p 6006

clean:
	rm -rf dist node_modules
