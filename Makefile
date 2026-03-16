.PHONY: all install build lint format format-check typecheck test test-watch check clean

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

check: lint format-check typecheck test
	@echo "All checks passed."

all: check build
	@echo "All checks passed and build succeeded."

clean:
	rm -rf dist node_modules
