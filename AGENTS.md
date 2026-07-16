# AGENTS

## Purpose

This repository contains a lightweight web application for viewing Markdown documents in a web browser.

The application is intended to remain simple, portable, and easy to maintain.

It must continue to work from any static HTTP server, including Visual Studio Code Live Server.

The project does not require any backend.

---

# Project Goals

The application should provide a pleasant reading experience for Markdown documents while remaining lightweight.

Current features include:

* Markdown rendering
* Table of contents
* Mermaid diagrams
* Light/Dark theme
* Responsive layout
* Local file loading
* Drag & Drop support

Future features should follow the same philosophy.

---

# Architecture

This project intentionally avoids build tools.

Do not introduce:

* Node.js
* npm
* webpack
* vite
* React
* Vue
* Angular
* Svelte

The application must remain executable by simply opening:

index.html

through any HTTP server.

---

# Technology Stack

Use only:

* HTML5
* CSS3
* Vanilla JavaScript (ES2022 or newer)

External libraries should be avoided unless they provide significant value that cannot reasonably be implemented inside the project.

Mermaid is currently an accepted dependency.

---

# Design Principles

Prefer:

* simplicity
* readability
* maintainability
* accessibility
* performance

Avoid:

* unnecessary abstractions
* excessive dependencies
* duplicated code
* large libraries

---

# Coding Guidelines

Keep functions small.

Use descriptive names.

Avoid global variables whenever possible.

Document complex algorithms.

Prefer modular code.

Never sacrifice readability for cleverness.

---

# Backward Compatibility

Existing functionality must never be broken intentionally.

New features should be additive.

Existing documents should continue rendering correctly.

---

# UI Guidelines

Maintain a clean reading interface.

Do not overload the toolbar.

Preserve keyboard shortcuts.

Support desktop and mobile layouts.

Keep visual consistency across new features.

---

# Performance

Avoid unnecessary DOM updates.

Avoid loading libraries unless required.

Lazy-load optional functionality whenever possible.

---

# Security

Never execute arbitrary HTML from Markdown.

Escape user content whenever applicable.

Use secure defaults for Mermaid.

Avoid introducing XSS risks.

---

# Git Workflow

Permanent branches:

* main
* develop

Feature branches:

feature/<feature-name>

Bug fixes:

fix/<bug-name>

Documentation:

docs/<topic>

Hotfixes:

hotfix/<description>

Never commit directly to main.

All production changes must arrive through Pull Requests.

---

# Commit Messages

Use Conventional Commits.

Examples:

feat:

fix:

docs:

style:

refactor:

test:

chore:

---

# Pull Requests

Every Pull Request should:

* have a clear description
* keep a single purpose
* avoid unrelated changes
* preserve existing behavior

---

# Testing

Before merging:

* HTML should validate.
* JavaScript should be error free.
* Markdown rendering should work.
* Mermaid diagrams should render correctly.
* Existing features should continue functioning.

---

# Documentation

README.md is intended for users.

The docs directory contains technical documentation.

CHANGELOG.md records released versions.

CONTRIBUTING.md describes the development workflow.

---

# Long-Term Vision

The project should remain a lightweight Markdown reader that can be deployed anywhere with minimal requirements while maintaining high code quality and excellent readability.
