![BomBomLab Banner](assets/banner.png)

xiaohongshu：魔法BomBom —— 小克周边，持续更新

# BomBomLab Home

This repository is a lightweight monorepo for the Clawd product line.

## Share This Project

If you want to share the source code, sharing this GitHub repository is the cleanest option.

If you want to share the app with non-developers, the easier option is to publish a packaged `.app`, `.zip`, or `.dmg` through GitHub Releases instead of asking people to clone the repo.

## Apps

- `apps/clawd-clock`: web app for `克克时钟` / `Clawd Clock`
- `apps/clawd-deskpet`: Electron app for `小克桌宠` / `Clawd Deskpet`

## Usage

### Clawd Clock

Open `apps/clawd-clock/index.html` directly in a browser for the current main version.

You can also open `apps/clawd-clock/xiaoke.html` to view the alternate version kept in the repo.

### Clawd Deskpet

For development:

```bash
cd apps/clawd-deskpet
npm install
npm start
```

To build the macOS app:

```bash
cd apps/clawd-deskpet
npm run build:mac
```

The packaged app is generated under `apps/clawd-deskpet/dist/mac-arm64/Clawd Deskpet.app`.

## Assets

Shared assets now live under `assets/`, including:

- `assets/banner.png`
- `assets/bubble.svg`

## Next App

The upcoming multi-device Clawd app should live in its own folder under `apps/` once its product name is finalized.

## Structure

- `apps/`: standalone products with their own source, assets, and build config
- `packages/`: shared code that is actually reused by multiple apps
- `assets/`: shared brand resources across products

## Branch Strategy

Do not create one long-lived branch per product.

- Keep all products in the same main repository structure
- Use one short-lived feature branch per task or milestone when needed
- Merge back quickly so shared naming, assets, and future cross-device code stay aligned

This works better than product branches because these apps are separate deliverables, not divergent versions of the same app.
