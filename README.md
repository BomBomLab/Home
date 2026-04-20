# BomBomLab Home

This repository can be used as a lightweight monorepo for multiple BomBomLab projects.

## Structure

- `apps/`: standalone apps that can be built and distributed independently
- `packages/`: shared modules, utilities, or UI pieces used by multiple apps
- `assets/`: shared images, icons, and brand resources

## Current Projects

- `apps/xiaoke-pet`: Electron-based macOS desktop pet

## Recommended Workflow

1. Add each new product under `apps/<project-name>`.
2. Keep each app self-contained with its own `package.json` and README.
3. Move shared code into `packages/` only when two or more apps really reuse it.
4. Keep release artifacts like `dist/` and dependency folders out of git.
