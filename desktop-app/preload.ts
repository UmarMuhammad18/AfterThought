import { contextBridge, ipcRenderer } from 'electron';

export type DesktopConfig = {
  apiBase: string;
  apiKey: string;
  mode: 'both' | 'system' | 'mic';
  detectCalls: boolean;
};

contextBridge.exposeInMainWorld('desktopApi', {
  getConfig: (): Promise<DesktopConfig> => ipcRenderer.invoke('config:get'),
  setConfig: (config: Partial<DesktopConfig>): Promise<DesktopConfig> => ipcRenderer.invoke('config:set', config),
  platform: (): Promise<string> => ipcRenderer.invoke('platform'),
  setRecordingState: (state: 'idle' | 'recording' | 'finishing') => ipcRenderer.send('recording:state', state),
  onToggle: (cb: (info: { reason?: string }) => void) => {
    ipcRenderer.removeAllListeners('recording:toggle');
    ipcRenderer.on('recording:toggle', (_e, info) => cb(info));
  },
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  hide: () => ipcRenderer.send('window:hide'),
});
