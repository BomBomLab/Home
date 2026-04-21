const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const { uIOhook, UiohookKey } = require('uiohook-napi');

let mainWindow = null;
let tray = null;
let dragOffset = null;
let cursorPollTimer = null;
let forceInteractive = false;
let lastIgnoreMouseEvents = null;
let globalKeyListenerStarted = false;

const WINDOW_WIDTH = 420;
const WINDOW_HEIGHT = 420;
const INTERACTION_REGION = {
  x: 52,
  y: 64,
  width: 316,
  height: 252,
  padding: 24
};

const SHIFTED_CHAR_MAP = {
  '1': '!',
  '2': '@',
  '3': '#',
  '4': '$',
  '5': '%',
  '6': '^',
  '7': '&',
  '8': '*',
  '9': '(',
  '0': ')',
  '-': '_',
  '=': '+',
  '[': '{',
  ']': '}',
  '\\': '|',
  ';': ':',
  "'": '"',
  ',': '<',
  '.': '>',
  '/': '?',
  '`': '~'
};

const KEYCODE_CHAR_MAP = new Map([
  [UiohookKey.A, 'a'],
  [UiohookKey.B, 'b'],
  [UiohookKey.C, 'c'],
  [UiohookKey.D, 'd'],
  [UiohookKey.E, 'e'],
  [UiohookKey.F, 'f'],
  [UiohookKey.G, 'g'],
  [UiohookKey.H, 'h'],
  [UiohookKey.I, 'i'],
  [UiohookKey.J, 'j'],
  [UiohookKey.K, 'k'],
  [UiohookKey.L, 'l'],
  [UiohookKey.M, 'm'],
  [UiohookKey.N, 'n'],
  [UiohookKey.O, 'o'],
  [UiohookKey.P, 'p'],
  [UiohookKey.Q, 'q'],
  [UiohookKey.R, 'r'],
  [UiohookKey.S, 's'],
  [UiohookKey.T, 't'],
  [UiohookKey.U, 'u'],
  [UiohookKey.V, 'v'],
  [UiohookKey.W, 'w'],
  [UiohookKey.X, 'x'],
  [UiohookKey.Y, 'y'],
  [UiohookKey.Z, 'z'],
  [UiohookKey[0], '0'],
  [UiohookKey[1], '1'],
  [UiohookKey[2], '2'],
  [UiohookKey[3], '3'],
  [UiohookKey[4], '4'],
  [UiohookKey[5], '5'],
  [UiohookKey[6], '6'],
  [UiohookKey[7], '7'],
  [UiohookKey[8], '8'],
  [UiohookKey[9], '9'],
  [UiohookKey.Numpad0, '0'],
  [UiohookKey.Numpad1, '1'],
  [UiohookKey.Numpad2, '2'],
  [UiohookKey.Numpad3, '3'],
  [UiohookKey.Numpad4, '4'],
  [UiohookKey.Numpad5, '5'],
  [UiohookKey.Numpad6, '6'],
  [UiohookKey.Numpad7, '7'],
  [UiohookKey.Numpad8, '8'],
  [UiohookKey.Numpad9, '9'],
  [UiohookKey.Space, ' '],
  [UiohookKey.Minus, '-'],
  [UiohookKey.Equal, '='],
  [UiohookKey.BracketLeft, '['],
  [UiohookKey.BracketRight, ']'],
  [UiohookKey.Backslash, '\\'],
  [UiohookKey.Semicolon, ';'],
  [UiohookKey.Quote, "'"],
  [UiohookKey.Comma, ','],
  [UiohookKey.Period, '.'],
  [UiohookKey.Slash, '/'],
  [UiohookKey.Backquote, '`'],
  [UiohookKey.NumpadDecimal, '.'],
  [UiohookKey.NumpadAdd, '+'],
  [UiohookKey.NumpadSubtract, '-'],
  [UiohookKey.NumpadMultiply, '*'],
  [UiohookKey.NumpadDivide, '/']
]);

const NUMPAD_KEYCODES = new Set([
  UiohookKey.Numpad0,
  UiohookKey.Numpad1,
  UiohookKey.Numpad2,
  UiohookKey.Numpad3,
  UiohookKey.Numpad4,
  UiohookKey.Numpad5,
  UiohookKey.Numpad6,
  UiohookKey.Numpad7,
  UiohookKey.Numpad8,
  UiohookKey.Numpad9,
  UiohookKey.NumpadDecimal,
  UiohookKey.NumpadAdd,
  UiohookKey.NumpadSubtract,
  UiohookKey.NumpadMultiply,
  UiohookKey.NumpadDivide
]);

function normalizeKey(event) {
  const baseKey = KEYCODE_CHAR_MAP.get(event.keycode);
  if (!baseKey) {
    return null;
  }

  if (/^[a-z]$/.test(baseKey)) {
    return event.shiftKey ? baseKey.toUpperCase() : baseKey;
  }

  if (baseKey === ' ') {
    return null;
  }

  if (NUMPAD_KEYCODES.has(event.keycode)) {
    return baseKey;
  }

  return event.shiftKey && SHIFTED_CHAR_MAP[baseKey] ? SHIFTED_CHAR_MAP[baseKey] : baseKey;
}

function forwardGlobalKeydown(event) {
  const key = normalizeKey(event);
  if (!key || key.length !== 1 || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('pet:keydown', { key });
}

function startGlobalKeyListener() {
  if (globalKeyListenerStarted) {
    return;
  }

  try {
    uIOhook.on('keydown', forwardGlobalKeydown);
    uIOhook.start();
    globalKeyListenerStarted = true;
  } catch (error) {
    console.error('Failed to start global key listener:', error);
  }
}

function stopGlobalKeyListener() {
  if (!globalKeyListenerStarted) {
    return;
  }

  uIOhook.off('keydown', forwardGlobalKeydown);

  try {
    uIOhook.stop();
  } catch (error) {
    console.error('Failed to stop global key listener:', error);
  } finally {
    globalKeyListenerStarted = false;
  }
}

function createTrayImage() {
  const trayIconPath = path.join(__dirname, 'claude.svg');
  let image;

  if (fs.existsSync(trayIconPath)) {
    const svg = fs.readFileSync(trayIconPath, 'utf8');
    image = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  } else {
    image = nativeImage.createEmpty();
  }

  image = image.resize({ width: 18, height: 18 });
  image.setTemplateImage(true);
  return image;
}

function createWindow() {
  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    transparent: true,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  win.setPosition(Math.round(screenWidth - WINDOW_WIDTH - 80), Math.round(screenHeight - WINDOW_HEIGHT - 100));
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'screen-saver', 1);
  setWindowIgnoreMouseEvents(win, true);
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.showInactive());
  win.on('closed', () => {
    stopCursorPolling();
    mainWindow = null;
  });

  startCursorPolling(win);
  return win;
}

function setWindowIgnoreMouseEvents(win, ignore) {
  if (!win || win.isDestroyed() || lastIgnoreMouseEvents === ignore) {
    return;
  }
  win.setIgnoreMouseEvents(ignore, { forward: true });
  lastIgnoreMouseEvents = ignore;
}

function isCursorInsideInteractionRegion(win) {
  const bounds = win.getBounds();
  const cursor = screen.getCursorScreenPoint();
  const left = bounds.x + INTERACTION_REGION.x - INTERACTION_REGION.padding;
  const top = bounds.y + INTERACTION_REGION.y - INTERACTION_REGION.padding;
  const right = left + INTERACTION_REGION.width + INTERACTION_REGION.padding * 2;
  const bottom = top + INTERACTION_REGION.height + INTERACTION_REGION.padding * 2;

  return cursor.x >= left && cursor.x <= right && cursor.y >= top && cursor.y <= bottom;
}

function refreshMousePassthrough(win) {
  if (!win || win.isDestroyed()) {
    return;
  }
  const shouldCaptureMouse = forceInteractive || isCursorInsideInteractionRegion(win);
  setWindowIgnoreMouseEvents(win, !shouldCaptureMouse);
}

function startCursorPolling(win) {
  stopCursorPolling();
  cursorPollTimer = setInterval(() => refreshMousePassthrough(win), 80);
}

function stopCursorPolling() {
  if (cursorPollTimer) {
    clearInterval(cursorPollTimer);
    cursorPollTimer = null;
  }
}

function createTray() {
  tray = new Tray(createTrayImage());
  tray.setToolTip('Clawd Deskpet');
  tray.setTitle('小克');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示小克桌宠',
        click: () => {
          if (mainWindow) {
            mainWindow.showInactive();
          }
        }
      },
      {
        label: '退出',
        click: () => app.quit()
      }
    ])
  );
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.showInactive();
      }
    }
  });
}

app.whenReady().then(() => {
  if (app.dock) {
    app.dock.hide();
  }

  mainWindow = createWindow();
  createTray();
  startGlobalKeyListener();

  app.on('activate', () => {
    if (!mainWindow) {
      mainWindow = createWindow();
    } else {
      mainWindow.showInactive();
    }
  });
});

app.on('will-quit', () => {
  stopCursorPolling();
  stopGlobalKeyListener();
});

ipcMain.on('pet:set-ignore-mouse-events', (_event, ignore) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    setWindowIgnoreMouseEvents(mainWindow, Boolean(ignore));
  }
});

ipcMain.on('pet:start-window-drag', (_event, payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  forceInteractive = true;
  const [winX, winY] = mainWindow.getPosition();
  dragOffset = {
    x: payload.screenX - winX,
    y: payload.screenY - winY
  };
  refreshMousePassthrough(mainWindow);
});

ipcMain.on('pet:drag-window', (_event, payload) => {
  if (!mainWindow || mainWindow.isDestroyed() || !dragOffset) {
    return;
  }
  const nextX = Math.round(payload.screenX - dragOffset.x);
  const nextY = Math.round(payload.screenY - dragOffset.y);
  mainWindow.setPosition(nextX, nextY);
});

ipcMain.on('pet:stop-window-drag', () => {
  dragOffset = null;
  forceInteractive = false;
  refreshMousePassthrough(mainWindow);
});
