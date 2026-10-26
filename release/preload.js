const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (data) => ipcRenderer.invoke('save-config', data),
  browseGamePath: () => ipcRenderer.invoke('browse-game-path'),
  launchGame: () => ipcRenderer.invoke('launch-game'),
  checkServerStatus: () => ipcRenderer.invoke('check-server-status'),
  requestPlay: () => ipcRenderer.invoke('request-play'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, data) => callback(data));
  },
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window')
});
