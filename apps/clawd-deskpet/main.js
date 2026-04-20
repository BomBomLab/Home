const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow = null;
let tray = null;
let dragOffset = null;
let cursorPollTimer = null;
let forceInteractive = false;
let lastIgnoreMouseEvents = null;

const WINDOW_WIDTH = 420;
const WINDOW_HEIGHT = 420;
const INTERACTION_REGION = {
  x: 52,
  y: 64,
  width: 316,
  height: 252,
  padding: 24
};

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

  app.on('activate', () => {
    if (!mainWindow) {
      mainWindow = createWindow();
    } else {
      mainWindow.showInactive();
    }
  });
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
