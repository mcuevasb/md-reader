# Contributing

Thank you for contributing to this project.

The goal is to keep the codebase simple, maintainable, and predictable.

## Branch Strategy

Permanent branches:

* main
* develop

New work should always begin from `develop`.

Examples:

* feature/add-search
* feature/pdf-export
* fix/theme-toggle
* docs/readme-update

Never commit directly to `main`.

## Development Process

1. Create a feature branch from `develop`.
2. Implement the requested change.
3. Test the feature locally.
4. Commit using Conventional Commits.
5. Push the branch.
6. Open a Pull Request targeting `develop`.
7. After approval and testing, merge into `develop`.
8. Promote tested changes from `develop` to `main`.

## Commit Convention

Use Conventional Commits.

Examples:

* feat:
* fix:
* docs:
* refactor:
* style:
* test:
* chore:

Examples:

feat: add search panel

fix: correct Mermaid rendering

docs: improve README

## Code Style

Prefer clarity over cleverness.

Keep functions focused.

Avoid duplicated logic.

Comment only when necessary.

Use descriptive variable names.

## Dependencies

Avoid introducing new dependencies unless there is a strong justification.

Large frameworks are intentionally excluded from this project.

## Pull Requests

Each Pull Request should:

* address one topic
* include a clear description
* avoid unrelated formatting changes
* preserve backward compatibility

## Reporting Issues

When reporting bugs include:

* Browser
* Operating System
* Steps to reproduce
* Expected behavior
* Actual behavior
* Screenshots when applicable

## Documentation

Documentation is considered part of the project.

When a feature changes behavior, update the relevant documentation.
