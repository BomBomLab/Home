![BomBomLab Banner](assets/banner.png)

🍠 小红书：魔法BomBom —— 小克周边，持续更新  
🍠 Xiaohongshu: Magic BomBom — Clawd merch and side projects, continuously updated


这里收集了我开发的 Clawd 周边产品，包括克克时钟、小克桌宠，以及后续会持续扩展的新项目。

This repository collects Clawd web apps, desktop apps, and future connected projects.

## ✨ Apps

### 📝 安静的笔记 / A Quiet Note

在线体验：<https://bombomlab.github.io/Home/apps/claude-note/note.html>

写一段文字，再写下读它时心里浮起的声音。右侧会实时生成一张有纸张质感的卡片，最后可以导出为 PNG。

- 支持标题、正文、心声三个字段，实时预览
- 移动端优化：卡片作为背景，输入面板从底部半模态展开
- 一键导出卡片为高清 PNG

Write a piece of text, then write down the inner voice that surfaces as you read it. A paper-textured card is generated in real time and can be exported as PNG.

- Title, body text, and inner monologue fields with live preview
- Mobile optimized: card as background layer, input panel slides up as a bottom sheet
- One-tap PNG export

Source folder: `apps/claude-note`

---

### 🕒 克克时钟 / Clawd Clock

在线体验：<https://bombomlab.github.io/Home/apps/clawd-clock/>

打开链接就可以直接使用。  
你还可以长按抓起小克，随手调戏一下。

Open the link above to use it directly in your browser.  
You can also long-press and drag Clawd around for fun.

### 🦀 小克桌宠 / Clawd Deskpet

这是一个 macOS 桌面桌宠应用。  
小克会常驻在桌面上，听歌、晃动、陪你一起办公摸鱼。

最新 working Clawd 更新：
- 打字时会切到独立的 working 姿态，小克会转身对着旁边电脑敲键盘
- idle 与 working 的造型、眨眼、打字字母、气泡逻辑已经分开处理
- 停止输入约 3 秒后，小克会从 working 回到 idle

Star 这个仓库，后续会持续更新更多造型和版本。

This is a macOS desktop pet app for macOS.  
Clawd stays on your desktop, moves around, vibes with music, and keeps you company while you work.

Latest working Clawd update:
- typing now switches Clawd into a dedicated working pose facing a side computer
- idle and working now use separate pose, blink, typing-letter, and bubble behavior
- after about 3 seconds without typing, Clawd returns from working to idle

Source folder: `apps/clawd-deskpet`

#### 💻 小克桌宠安装方式 / How To Install Clawd Deskpet

如果你不想折腾开发环境，直接下载或 clone 本项目到本地，然后双击打开：

`/BomBomLab-Home/apps/clawd-deskpet/dist/mac-arm64/Clawd Deskpet.app`

第一次打开如果被 macOS 拦截：

1. 右键应用，选择“打开”
2. 如果系统仍然拦截，前往“系统设置 -> 隐私与安全性”手动放行

If you do not want to set up a development environment, just download or clone this repository and open:

`/BomBomLab-Home/apps/clawd-deskpet/dist/mac-arm64/Clawd Deskpet.app`

If macOS blocks the first launch:

1. Right-click the app and choose `Open`
2. If it is still blocked, allow it in `System Settings -> Privacy & Security`

#### 🔗 获取源码 / Source Access

如果你想查看源码、继续开发，或者让 Claude / Codex 帮你继续改，就把这个 GitHub 仓库链接直接发过去即可。

If you want the source code or want to continue development with Claude or Codex, just share this GitHub repository link directly.

## ⚖️ Personal Non-Commercial Use Notice

This repository is source-available, not open source.

1. The underlying IP, characters, brand elements, and related rights belong to their respective rightsholders.
2. This project is an unofficial fan-made derivative work.
3. Any original code or original material authored in this repository is shared for personal, non-commercial use only.
4. You may view, study, and modify this repository for personal use.
5. You may not use this repository or any part of it for commercial purposes, including selling, licensing, paid distribution, merchandise, or use in commercial products or services.
6. No trademark rights are granted.
7. If you are the relevant rightsholder and believe any content should be changed or removed, please contact the repository owner.
