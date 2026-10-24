import {
  app,
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  nativeImage,
  session,
  shell,
} from 'electron';
import fs from 'fs';
import path from 'path';
import { startCallDetection, stopCallDetection } from './call-detection';

// macOS system-audio loopback (ScreenCaptureKit). Needs a recent Electron and
// macOS 13+; harmless elsewhere.
app.commandLine.appendSwitch(
  'enable-features',
  'MacLoopbackAudioForScreenShare,MacSckSystemAudioLoopbackOverride',
);

type Config = { apiBase: string; apiKey: string; mode: 'both' | 'system' | 'mic'; detectCalls: boolean };

const DEFAULT_CONFIG: Config = { apiBase: 'http://localhost:3000', apiKey: '', mode: 'both', detectCalls: true };
const TOGGLE_SHORTCUT = 'CommandOrControl+Shift+R';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let recordingState: 'idle' | 'recording' | 'finishing' = 'idle';

const configPath = () => path.join(app.getPath('userData'), 'config.json');

function readConfig(): Config {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath(), 'utf8')) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(config: Partial<Config>): Config {
  const next = { ...readConfig(), ...config };
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2));
  return next;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 560,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#0c0d12',
    title: 'AfterThought',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Closing the window keeps the app in the tray so the shortcut still works.
  mainWindow.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

function showWindow() {
  if (!mainWindow) createWindow();
  mainWindow!.show();
  mainWindow!.focus();
}

/** Ask the renderer to start or stop; it owns the recorder. */
function toggleRecording(reason?: string) {
  showWindow();
  mainWindow?.webContents.send('recording:toggle', { reason });
}

function trayIcon() {
  // 16x16 dot drawn in code so the build has no binary assets to ship.
  const color = recordingState === 'recording' ? '#ef4444' : '#60a5fa';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="6" fill="${color}"/></svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function updateTray() {
  if (!tray) return;
  tray.setImage(trayIcon());
  tray.setToolTip(recordingState === 'recording' ? 'AfterThought — recording' : 'AfterThought');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: recordingState === 'recording' ? 'Stop recording' : 'Start recording',
        accelerator: TOGGLE_SHORTCUT,
        click: () => toggleRecording(),
      },
      { label: 'Open AfterThought', click: showWindow },
      { label: 'Open dashboard', click: () => shell.openExternal(readConfig().apiBase + '/dashboard') },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          (app as any).isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function setupCallDetection() {
  stopCallDetection();
  if (!readConfig().detectCalls) return;
  startCallDetection((appName) => {
    if (recordingState !== 'idle' || !Notification.isSupported()) return;
    const n = new Notification({
      title: `${appName} is using your microphone`,
      body: 'Click to record this call with AfterThought.',
      silent: true,
    });
    n.on('click', () => toggleRecording(appName));
    n.show();
  });
}

// One instance only: a second launch just shows the window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  app.whenReady().then(() => {
    // getDisplayMedia() in the renderer -> the whole screen's system audio
    // (WhatsApp Desktop, Zoom, Teams, Discord, FaceTime, ...). The video track
    // is required by the API but never recorded.
    session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
      desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
        callback({ video: sources[0], audio: 'loopback' });
      });
    });

    ipcMain.handle('config:get', () => readConfig());
    ipcMain.handle('config:set', (_e, config: Partial<Config>) => {
      const next = writeConfig(config);
      setupCallDetection();
      return next;
    });
    ipcMain.handle('platform', () => process.platform);
    ipcMain.on('recording:state', (_e, state: typeof recordingState) => {
      recordingState = state;
      updateTray();
    });
    ipcMain.on('open-external', (_e, url: string) => {
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    });
    ipcMain.on('window:hide', () => mainWindow?.hide());

    createWindow();
    tray = new Tray(trayIcon());
    tray.on('click', showWindow);
    updateTray();

    globalShortcut.register(TOGGLE_SHORTCUT, () => toggleRecording());
    setupCallDetection();

    app.on('activate', showWindow);
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopCallDetection();
  });

  // Stay in the tray when the window closes (all platforms).
  app.on('window-all-closed', () => undefined);
}
