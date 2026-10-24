import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SegmentedRecorder,
  getDisplayAudioStream,
  type CaptureMode,
  type RecorderState,
} from '../../lib/capture/recorder';

type DesktopConfig = { apiBase: string; apiKey: string; mode: CaptureMode; detectCalls: boolean };

declare global {
  interface Window {
    desktopApi: {
      getConfig: () => Promise<DesktopConfig>;
      setConfig: (c: Partial<DesktopConfig>) => Promise<DesktopConfig>;
      platform: () => Promise<string>;
      setRecordingState: (s: 'idle' | 'recording' | 'finishing') => void;
      onToggle: (cb: (info: { reason?: string }) => void) => void;
      openExternal: (url: string) => void;
      hide: () => void;
    };
  }
}

const api = window.desktopApi;

/**
 * Linux has no loopback capture in Chromium; PulseAudio/PipeWire expose each
 * output as a "Monitor of …" input device, which records everything you hear.
 */
async function linuxMonitorStream(): Promise<MediaStream> {
  // Labels are only visible after a permission grant.
  const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
  probe.getTracks().forEach((t) => t.stop());
  const devices = await navigator.mediaDevices.enumerateDevices();
  const monitor = devices.find((d) => d.kind === 'audioinput' && /monitor/i.test(d.label));
  if (!monitor) throw new Error('No "Monitor" audio device found. Enable one in your sound settings (pavucontrol).');
  return navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: monitor.deviceId }, echoCancellation: false, noiseSuppression: false },
  });
}

function fmt(seconds: number) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const mmss = `${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return h ? `${h}:${mmss}` : mmss;
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', color: '#e5e7eb', background: '#0c0d12' },
  titlebar: { WebkitAppRegion: 'drag', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', fontSize: 13, fontWeight: 600 } as React.CSSProperties,
  body: { flex: 1, overflowY: 'auto', padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: 12, color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: 6 },
  input: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e5e7eb', padding: '9px 11px', fontSize: 13 },
  primary: { background: '#60a5fa', color: '#0c0d12', border: 0, borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  secondary: { background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px', fontSize: 13, cursor: 'pointer' },
  danger: { background: '#ef4444', color: 'white', border: 0, borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  muted: { fontSize: 12, color: '#9ca3af', lineHeight: 1.5, margin: 0 },
  error: { fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.12)', borderRadius: 10, padding: 10, margin: 0 },
};

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#9ca3af' }}>
      <span style={{ width: 36 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(value * 100)}%`, height: '100%', background: '#60a5fa', transition: 'width 0.1s linear' }} />
      </div>
    </div>
  );
}

export function App() {
  const [config, setConfig] = useState<DesktopConfig | null>(null);
  const [platform, setPlatform] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState({ mic: 0, system: 0 });
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [consent, setConsent] = useState(false);
  const [lastMeeting, setLastMeeting] = useState<string | null>(null);
  const recorderRef = useRef<SegmentedRecorder | null>(null);

  useEffect(() => {
    api.getConfig().then((c) => {
      setConfig(c);
      if (!c.apiKey) setShowSettings(true);
    });
    api.platform().then(setPlatform);
  }, []);

  useEffect(() => {
    if (state !== 'recording' && state !== 'paused') return;
    const t = setInterval(() => setElapsed(recorderRef.current?.elapsedSeconds ?? 0), 500);
    return () => clearInterval(t);
  }, [state]);

  const start = useCallback(
    async (platformHint?: string) => {
      if (!config) return;
      setError(null);
      setLastMeeting(null);
      const recorder = new SegmentedRecorder({
        apiBase: config.apiBase,
        getToken: async () => config.apiKey,
        mode: config.mode,
        getSystemStream: platform === 'linux' ? linuxMonitorStream : getDisplayAudioStream,
        meta: {
          source: 'desktop',
          title: title || undefined,
          platform: platformHint,
          consentConfirmed: consent,
        },
        onState: (s) => {
          setState(s);
          api.setRecordingState(s === 'recording' || s === 'paused' ? 'recording' : s === 'finishing' ? 'finishing' : 'idle');
        },
        onError: setError,
        onLevels: setLevels,
      });
      recorderRef.current = recorder;
      try {
        await recorder.start();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start recording');
        api.setRecordingState('idle');
      }
    },
    [config, platform, title, consent],
  );

  const stop = useCallback(async () => {
    const id = await recorderRef.current?.stop();
    if (id) setLastMeeting(id);
    setState('idle');
    setTitle('');
    setConsent(false);
    api.setRecordingState('idle');
  }, []);

  // Global shortcut / tray / call-detection notification.
  useEffect(() => {
    api.onToggle(({ reason }) => {
      const s = recorderRef.current?.currentState;
      if (s === 'recording' || s === 'paused') void stop();
      else if (consent) void start(reason);
      else setError(reason ? `${reason} call detected — confirm consent below, then press Start.` : 'Confirm consent below, then press Start.');
    });
  }, [start, stop, consent]);

  if (!config) return null;

  const active = state === 'recording' || state === 'paused';

  return (
    <div style={styles.shell}>
      <div style={styles.titlebar}>
        <span>● AfterThought</span>
        <span style={{ WebkitAppRegion: 'no-drag', display: 'flex', gap: 8 } as React.CSSProperties}>
          {!active && (
            <button style={{ ...styles.secondary, padding: '4px 8px' }} onClick={() => setShowSettings((v) => !v)}>
              {showSettings ? 'Done' : 'Settings'}
            </button>
          )}
          <button style={{ ...styles.secondary, padding: '4px 8px' }} onClick={api.hide} aria-label="Hide">
            —
          </button>
        </span>
      </div>

      <div style={styles.body}>
        {showSettings ? (
          <Settings
            config={config}
            onSave={async (c) => {
              setConfig(await api.setConfig(c));
              setShowSettings(false);
            }}
          />
        ) : active || state === 'finishing' || state === 'starting' ? (
          <>
            <div style={{ textAlign: 'center', fontSize: 40, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 16 }}>
              {fmt(elapsed)}
            </div>
            <p style={{ ...styles.muted, textAlign: 'center' }}>
              {state === 'starting' ? 'Starting…' : state === 'finishing' ? 'Uploading the last segment…' : state === 'paused' ? 'Paused' : 'Recording'}
            </p>
            {config.mode !== 'system' && <Meter label="You" value={levels.mic} />}
            {config.mode !== 'mic' && <Meter label="Them" value={levels.system} />}
            {active && (
              <>
                <button style={styles.danger} onClick={() => void stop()}>
                  Stop &amp; summarise
                </button>
                <button
                  style={styles.secondary}
                  onClick={() => (state === 'paused' ? recorderRef.current?.resume() : recorderRef.current?.pause())}
                >
                  {state === 'paused' ? 'Resume' : 'Pause'}
                </button>
              </>
            )}
            <p style={styles.muted}>Ctrl/Cmd + Shift + R stops from anywhere.</p>
          </>
        ) : (
          <>
            <p style={styles.muted}>
              Records any call on this computer — WhatsApp, Zoom, Teams, Meet, Discord, Slack, FaceTime, phone links —
              both sides, from system audio and your mic.
            </p>
            <label style={styles.label}>
              Title (optional)
              <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto-generated if empty" />
            </label>
            <label style={{ ...styles.label, flexDirection: 'row', alignItems: 'flex-start', color: '#e5e7eb' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
              Everyone on the call knows it&apos;s being recorded
            </label>
            <button style={{ ...styles.primary, opacity: consent ? 1 : 0.5 }} disabled={!consent} onClick={() => void start()}>
              Start recording
            </button>
            <p style={styles.muted}>
              Shortcut: <b>Ctrl/Cmd + Shift + R</b>. {platform === 'win32' && config.detectCalls ? 'You’ll get a prompt when an app starts using your mic.' : ''}
              {platform === 'darwin' ? ' macOS asks for Screen Recording permission the first time (needed to hear other apps).' : ''}
            </p>
            {lastMeeting && (
              <button style={styles.secondary} onClick={() => api.openExternal(`${config.apiBase}/meeting/${lastMeeting}`)}>
                Open the notes from your last call
              </button>
            )}
          </>
        )}
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

function Settings({ config, onSave }: { config: DesktopConfig; onSave: (c: DesktopConfig) => void }) {
  const [draft, setDraft] = useState(config);
  return (
    <>
      <label style={styles.label}>
        AfterThought URL
        <input style={styles.input} value={draft.apiBase} onChange={(e) => setDraft({ ...draft, apiBase: e.target.value.replace(/\/$/, '') })} />
      </label>
      <label style={styles.label}>
        API key
        <input style={styles.input} type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value.trim() })} placeholder="at_…" />
      </label>
      <button style={styles.secondary} onClick={() => window.desktopApi.openExternal(`${draft.apiBase}/settings/extension-access`)}>
        Create an API key →
      </button>
      <label style={styles.label}>
        Capture
        <select style={styles.input} value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value as CaptureMode })}>
          <option value="both">System audio + microphone (recommended)</option>
          <option value="system">System audio only</option>
          <option value="mic">Microphone only</option>
        </select>
      </label>
      <label style={{ ...styles.label, flexDirection: 'row', alignItems: 'center', color: '#e5e7eb' }}>
        <input type="checkbox" checked={draft.detectCalls} onChange={(e) => setDraft({ ...draft, detectCalls: e.target.checked })} />
        Offer to record when a call starts
      </label>
      <button style={styles.primary} onClick={() => onSave(draft)}>
        Save
      </button>
    </>
  );
}
