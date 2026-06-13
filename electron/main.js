const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null
let tray = null
let isQuitting = false

const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0A0E1A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '..', 'src', 'assets', 'icon.png')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  // 托盘图标兜底：文件不存在则用纯色图
  let iconPath = path.join(__dirname, '..', 'src', 'assets', 'tray-icon.png')
  let trayIcon
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (trayIcon.isEmpty()) throw new Error('empty')
  } catch {
    // 生成 16x16 蓝色方块兜底
    const canvas = Buffer.alloc(16 * 16 * 4)
    for (let i = 0; i < 16 * 16; i++) {
      canvas[i * 4] = 0; canvas[i * 4 + 1] = 212; canvas[i * 4 + 2] = 255; canvas[i * 4 + 3] = 255
    }
    trayIcon = nativeImage.createFromBuffer(canvas, { width: 16, height: 16 })
  }
  tray = new Tray(trayIcon)
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => mainWindow.show() },
    { label: '窗口置顶', type: 'checkbox', checked: false, click: (item) => mainWindow.setAlwaysOnTop(item.checked) },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit() } }
  ])
  tray.setToolTip('持仓监控')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow.show())
}

// IPC handlers
ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '表格文件', extensions: ['csv', 'xlsx', 'xls'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    ...options
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:saveFile', async (_, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: '加密存档', extensions: ['dat'] },
      { name: 'CSV文件', extensions: ['csv'] }
    ]
  })
  if (result.canceled) return null
  return result.filePath
})

ipcMain.handle('fs:readFile', async (_, filePath) => {
  return fs.readFileSync(filePath, 'utf-8')
})

ipcMain.handle('fs:writeFile', async (_, filePath, data) => {
  fs.writeFileSync(filePath, data, 'utf-8')
  return true
})

ipcMain.handle('fs:readBinaryFile', async (_, filePath) => {
  return fs.readFileSync(filePath)
})

ipcMain.handle('fs:writeBinaryFile', async (_, filePath, data) => {
  fs.writeFileSync(filePath, Buffer.from(data))
  return true
})

ipcMain.handle('window:minimize', () => mainWindow.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.handle('window:close', () => mainWindow.hide())
ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized())
ipcMain.handle('window:setAlwaysOnTop', (_, flag) => mainWindow.setAlwaysOnTop(flag))

// 开机自启
ipcMain.handle('app:setAutoStart', (_, enable) => {
  app.setLoginItemSettings({ openAtLogin: enable })
  return true
})

app.whenReady().then(() => {
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {})
app.on('activate', () => mainWindow.show())
app.on('before-quit', () => { isQuitting = true })
