const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petWindow', {
  setIgnoreMouseEvents(ignore) {
    ipcRenderer.send('pet:set-ignore-mouse-events', ignore);
  },
  startWindowDrag(screenX, screenY) {
    ipcRenderer.send('pet:start-window-drag', { screenX, screenY });
  },
  dragWindow(screenX, screenY) {
    ipcRenderer.send('pet:drag-window', { screenX, screenY });
  },
  stopWindowDrag() {
    ipcRenderer.send('pet:stop-window-drag');
  }
});
