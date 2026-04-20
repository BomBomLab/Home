# BomBomLab Home

This repository is a lightweight monorepo for the Clawd product line.

## Apps

- `apps/clawd-clock`: web app for `克克时钟` / `Clawd Clock`
- `apps/clawd-deskpet`: Electron app for `小克桌宠` / `Clawd Deskpet`

## Next App

The upcoming multi-device Clawd app should live in its own folder under `apps/` once its product name is finalized.

## Structure

- `apps/`: standalone products with their own source, assets, and build config
- `packages/`: shared code that is actually reused by multiple apps
- `assets/`: shared brand resources if they become common across products

## Branch Strategy

Do not create one long-lived branch per product.

- Keep all products in the same main repository structure
- Use one short-lived feature branch per task or milestone when needed
- Merge back quickly so shared naming, assets, and future cross-device code stay aligned

This works better than product branches because these apps are separate deliverables, not divergent versions of the same app.
