![BomBomLab Banner](assets/banner.png)

xiaohongshu: Magic BomBom — Clawd merch and side projects, continuously updated  
小红书：魔法BomBom —— 小克周边，持续更新

# BomBomLab Home

English first. Chinese follows below.

This repository is a lightweight monorepo for the Clawd product line, including web, desktop, and future connected-device apps.

本仓库是 Clawd 产品线的轻量 monorepo，用来统一管理网页应用、桌面应用，以及后续的多设备联动应用。

## Share This Project

If you want to share the source code, sharing this GitHub repository is the cleanest option.

If you want to share the app with non-developers, the easier option is to publish a packaged `.app`, `.zip`, or `.dmg` through GitHub Releases instead of asking people to clone the repo.

如果你要分享源码，最方便的方式就是直接分享这个 GitHub 仓库。

如果你要分享给非开发者使用，最方便的方式不是让对方 clone 仓库，而是通过 GitHub Releases 发布打包好的 `.app`、`.zip` 或 `.dmg`。

## Apps

- `apps/clawd-clock`: web app for `Clawd Clock`
- `apps/clawd-deskpet`: Electron app for `Clawd Deskpet`

- `apps/clawd-clock`：`克克时钟` 的网页应用
- `apps/clawd-deskpet`：`小克桌宠` 的 Electron 桌面应用

## Usage

### Clawd Clock

Open `apps/clawd-clock/index.html` directly in a browser for the current main version.

You can also open `apps/clawd-clock/xiaoke.html` to view the alternate version kept in the repo.

直接在浏览器中打开 `apps/clawd-clock/index.html` 即可查看当前主版本。

如果你想看仓库里保留的另一个版本，也可以打开 `apps/clawd-clock/xiaoke.html`。

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

开发命令如下：

```bash
cd apps/clawd-deskpet
npm install
npm start
```

构建 macOS 应用：

```bash
cd apps/clawd-deskpet
npm run build:mac
```

构建产物输出到 `apps/clawd-deskpet/dist/mac-arm64/Clawd Deskpet.app`。

## Assets

Shared assets now live under `assets/`, including:

- `assets/banner.png`
- `assets/bubble.svg`

共享素材现在统一放在 `assets/` 目录下，包括：

- `assets/banner.png`
- `assets/bubble.svg`

## Next App

The upcoming multi-device Clawd app should live in its own folder under `apps/` once its product name is finalized.

后续的多设备联动 Clawd 应用，建议在产品名确定后，作为新的独立目录加入 `apps/`。

## Structure

- `apps/`: standalone products with their own source, assets, and build config
- `packages/`: shared code that is actually reused by multiple apps
- `assets/`: shared brand resources across products

- `apps/`：独立产品目录，各自维护源码、素材和构建配置
- `packages/`：多个应用真正复用时再抽离出来的共享代码
- `assets/`：跨产品共享的品牌与视觉素材

## Branch Strategy

Do not create one long-lived branch per product.

- Keep all products in the same main repository structure
- Use one short-lived feature branch per task or milestone when needed
- Merge back quickly so shared naming, assets, and future cross-device code stay aligned

This works better than product branches because these apps are separate deliverables, not divergent versions of the same app.

不要为每个产品维护一个长期独立分支。

- 所有产品放在同一个主仓库结构里
- 只有在做具体功能或阶段性任务时，才临时开短期分支
- 尽快合回主分支，避免命名、素材和后续联动能力长期分叉

这样比“每个产品一个长期 branch”更合适，因为这些项目是并列产品，不是同一个应用的长期分叉版本。
