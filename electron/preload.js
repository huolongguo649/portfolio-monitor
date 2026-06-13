const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (defaultName) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  readBinaryFile: (filePath) => ipcRenderer.invoke('fs:readBinaryFile', filePath),
  writeBinaryFile: (filePath, data) => ipcRenderer.invoke('fs:writeBinaryFile', filePath, data),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('window:setAlwaysOnTop', flag),
  setAutoStart: (enable) => ipcRenderer.invoke('app:setAutoStart', enable)
})
