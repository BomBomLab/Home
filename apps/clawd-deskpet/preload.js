const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petWindow', {
  setIgnoreMouseEvents(ignore) {
    ipcRenderer.send('pet:set-ignore-mouse-events', ignore);
  },
  onKeyDown(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('pet:keydown', listener);
    return () => ipcRenderer.removeListener('pet:keydown', listener);
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
