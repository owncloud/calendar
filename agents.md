# AI Agent Guidelines for Calendar

This file provides context for AI coding agents (Claude Code, GitHub Copilot, Cursor, etc.) working in this repository.

## Repository Overview
- **Product family:** Classic (OC10)
- **Primary language(s):** JavaScript, PHP
- **Build system:** Composer, Make, npm/Yarn, Gulp
- **Test framework:** PHPUnit, Karma (JavaScript)
- **CI system:** GitHub Actions

## Architecture & Key Paths
- `controller/` - PHP controllers
- `http/` - HTTP layer
- `js/` - Frontend JavaScript
- `css/` - Stylesheets
- `templates/` - Server-side templates
- `l10n/` - Translations
- `appinfo/` - ownCloud app metadata
- `img/` - App icons
- `screenshots/` - App screenshots
- `tests/` - Test suites
- `Makefile` - Build and test automation
- `composer.json` - PHP dependencies
- `package.json` - JavaScript dependencies
- `gulpfile.js` - Gulp task runner configuration
- `phpunit.xml` - PHPUnit configuration

## Development Conventions
- **Branching:** master
- **Commit messages:** DCO sign-off required (`git commit -s`)
- **Code style:** PHP_CodeSniffer, ownCloud coding standard, ESLint
- **PR process:** Open a PR against master. All CI checks must pass.

## Build & Test Commands
```bash
# Build
make

# Test (all)
make test

# Test (PHP unit)
make test-php-unit

# Test (JavaScript)
make test-js

# Lint (PHP)
make test-php-style

# Fix code style
make test-php-style-fix
```

## Important Constraints
- All code contributions must be compatible with the **AGPL-3.0** license
- Do not introduce new **copyleft-licensed dependencies** (GPL, AGPL, LGPL, MPL) without explicit discussion in an issue first. This is especially important for repos migrating to Apache 2.0.
- Do not introduce new dependencies without discussion in an issue first
- This app is the frontend only; the CalDAV backend is in ownCloud Core


## OSPO Policy Constraints

### GitHub Actions
- **Only** use actions owned by `owncloud`, created by GitHub (`actions/*`), or verified on the GitHub Marketplace.
- Pin all actions to their full commit SHA (not tags): `uses: actions/checkout@<SHA> # vX.Y.Z`
- Never introduce actions from unverified third parties.

### Dependency Management
- Dependabot is configured for automated dependency updates.
- Review and merge Dependabot PRs as part of regular maintenance.
- Do not introduce new dependencies without discussion in an issue first.

### Git Workflow
- **Rebase policy**: Always rebase; never create merge commits. Use `git pull --rebase` and `git rebase` before pushing.
- **Signed commits**: All commits **must** be PGP/GPG signed (`git commit -S -s`).
- **DCO sign-off**: Every commit needs a `Signed-off-by` line (`git commit -s`).
- **Conventional Commits**: Use the [Conventional Commits](https://www.conventionalcommits.org/) format where the repository enforces it.

## Context for AI Agents
- Match existing code style
- Do not refactor unrelated code in the same PR
- Write tests for new functionality
- Keep PRs focused and atomic
- Backend (CalDAV) issues should be filed against ownCloud Core, not this repository
