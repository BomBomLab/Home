# Journal

本目录是可直接本地预览的 journal 原型页，入口是 [Journal.html](/Users/yin/BomBomLab-Home/journal/Journal.html)。

GitHub Pages 预览：

- <https://bombomlab.github.io/Home/journal/Journal.html>

## 文件说明

- `Journal.html`
  - 页面入口
  - 直接加载 `runtime.js`
- `app.jsx`
  - 日 / 周 / 月视图 UI
- `data.jsx`
  - 嵌入式数据快照
  - 由 `.cyberboss` 数据同步生成
- `tweaks-panel.jsx`
  - 调参面板
- `runtime.js`
  - 由 `tweaks-panel.jsx + data.jsx + app.jsx` 打包生成
  - `Journal.html` 直接依赖它，不再依赖 `text/babel`

## 数据来源

页面优先消费统一的 `window.JOURNAL_DATA.journal`：

- `journal.day[dateKey]`
  - `events`
  - `tasks`
  - `summary`
- `journal.week[weekStartKey]`
  - `days`
  - `events`
  - `tasks`
  - `priorities`
  - `notes`
  - `summary`
- `journal.month[monthKey]`
  - `days`
  - `tasks`
  - `summary`

`data.jsx` 的实际源数据来自：

- `/Users/yin/.cyberboss/timeline/timeline-state.json`
- `/Users/yin/.cyberboss/timeline/timeline-facts.json`
- `/Users/yin/.cyberboss/todos.json`
- `/Users/yin/.cyberboss/diary/*.md`

如果 `.cyberboss` 有新增 event / todo / summary，必须重新同步 `data.jsx`，否则页面会继续显示旧快照。

## 本地预览

当前建议用本地 HTTP 服务预览，不要直接依赖旧的 Babel JSX 方案。

示例：

```bash
cd /Users/yin/BomBomLab-Home/journal
python3 -m http.server 8767
```

打开：

```text
http://localhost:8767/Journal.html
```

## 重编译 runtime.js

修改了 `app.jsx`、`data.jsx`、`tweaks-panel.jsx` 之后，需要重新生成 `runtime.js`。

当前使用 `timeline-for-agent` 里的 `esbuild`：

```bash
cd /Users/yin/BomBomLab-Home/journal && \
cat tweaks-panel.jsx data.jsx app.jsx | \
/Users/yin/timeline-for-agent/node_modules/.bin/esbuild \
  --bundle \
  --format=iife \
  --global-name=JournalRuntime \
  --loader=jsx \
  --outfile=runtime.js

# 调试时加 inline sourcemap（文件会变大约 3×）：
# 最后加 --sourcemap=inline
```

## 最近约定

- 月视图 summary 限制为一句话、一行，超出省略
- `daily / weekly / monthly` 的事件、任务、摘要优先走统一 `journal.*` schema
- event 色块之间统一保留 `2px` 间距
