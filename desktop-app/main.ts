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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { drawMark } = require('./png.js') as { drawMark: (size: number, opts?: { color?: string }) => Buffer };

// macOS system-audio loopback (ScreenCaptureKit). Needs a recent Electron and
// macOS 13+; harmless elsewhere.
app.commandLine.appendSwitch(
  'enable-features',
  'MacLoopbackAudioForScreenShare,MacSckSystemAudioLoopbackOverride',
);

type Config = { apiBase: string; apiKey: string; mode: 'both' | 'system' | 'mic'; detectCalls: boolean };

const DEFAULT_CONFIG: Config = { apiBase: 'http://localhost:3000', apiKey: '', mode: 'both', detectCalls: true };
const TOGGLE_SHORTCUT = 'CommandOrControl+Shift+R';
// CI / local smoke test: load the UI hidden, report errors, exit.
const SMOKE_TEST = process.env.AFTERTHOUGHT_SMOKE_TEST === '1';

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
    show: !SMOKE_TEST,
    title: 'AfterThought',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  if (SMOKE_TEST) {
    const errors: string[] = [];
    mainWindow.webContents.on('console-message', (event: any, level?: number, message?: string) => {
      // Electron 35+ passes a details object; older versions pass positional args.
      const lvl = typeof level === 'number' ? level : event?.level === 'error' ? 3 : 0;
      const msg = message ?? event?.message ?? '';
      if (lvl >= 3) errors.push(msg);
    });
    mainWindow.webContents.once('did-finish-load', async () => {
      await new Promise((r) => setTimeout(r, 1500));
      const ui = await mainWindow!.webContents.executeJavaScript(
        "Boolean(window.desktopApi) && document.getElementById('root').childElementCount > 0",
      );
      console.log(`[smoke] electron ${process.versions.electron}, ui rendered: ${ui}, errors: ${errors.length}`);
      errors.forEach((e) => console.log(`[smoke] renderer error: ${e}`));
      (app as any).isQuitting = true;
      app.exit(ui && errors.length === 0 ? 0 : 1);
    });
  }

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
  // Drawn in code (PNG; Electron's nativeImage can't load SVG) so there are no binary assets.
  const color = recordingState === 'recording' ? '#ef4444' : '#60a5fa';
  const image = nativeImage.createFromBuffer(drawMark(32, { color }), { scaleFactor: 2 });
  return image;
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

    if (!SMOKE_TEST) {
      globalShortcut.register(TOGGLE_SHORTCUT, () => toggleRecording());
      setupCallDetection();
    }

    app.on('activate', showWindow);
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopCallDetection();
  });

  // Stay in the tray when the window closes (all platforms).
  app.on('window-all-closed', () => undefined);
}
