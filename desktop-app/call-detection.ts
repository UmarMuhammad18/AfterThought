import { execFile } from 'child_process';

/**
 * Notice when a call starts so the user can record with one click.
 *
 * Windows: reads the privacy "microphone in use" records — any app whose
 *   LastUsedTimeStop is 0 is using the mic right now. Works for every app
 *   (WhatsApp, Zoom, Teams, Discord, browsers, Phone Link...).
 * macOS / Linux: no portable mic-in-use API, so fall back to noticing when a
 *   known calling app starts.
 */

const KNOWN_CALL_APPS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  zoom: 'Zoom',
  'zoom.us': 'Zoom',
  teams: 'Microsoft Teams',
  'ms-teams': 'Microsoft Teams',
  slack: 'Slack',
  discord: 'Discord',
  skype: 'Skype',
  facetime: 'FaceTime',
  webex: 'Webex',
  telegram: 'Telegram',
  signal: 'Signal',
  phoneexperiencehost: 'Phone Link',
};

let timer: ReturnType<typeof setInterval> | null = null;
const active = new Set<string>();

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) =>
      resolve(err ? '' : stdout),
    );
  });
}

function friendlyName(raw: string): string {
  const base = raw.split(/[\\/#]/).pop()!.replace(/\.exe$/i, '').toLowerCase();
  const hit = Object.keys(KNOWN_CALL_APPS).find((k) => base.includes(k));
  if (hit) return KNOWN_CALL_APPS[hit];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Windows: apps currently holding the microphone. */
async function windowsMicUsers(): Promise<string[]> {
  const root = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone';
  const out = await run('reg', ['query', root, '/s', '/v', 'LastUsedTimeStop']);
  const users: string[] = [];
  let key = '';
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('HKEY_')) key = line.trim();
    const m = line.match(/LastUsedTimeStop\s+REG_QWORD\s+0x([0-9a-f]+)/i);
    if (m && BigInt('0x' + m[1]) === BigInt(0) && key) {
      const name = key.split('\\').pop() || key;
      // Our own app records too; don't prompt about ourselves.
      if (!/afterthought|electron/i.test(name)) users.push(friendlyName(name));
    }
  }
  return [...new Set(users)];
}

/** macOS / Linux: known call apps that are running. */
async function runningCallApps(): Promise<string[]> {
  const out = await run('ps', ['-A', '-o', 'comm=']);
  const names = new Set<string>();
  for (const line of out.split('\n')) {
    const base = line.trim().split('/').pop()?.toLowerCase() || '';
    const hit = Object.keys(KNOWN_CALL_APPS).find((k) => base === k || base.startsWith(k));
    if (hit) names.add(KNOWN_CALL_APPS[hit]);
  }
  return [...names];
}

export function startCallDetection(onCallStarted: (appName: string) => void, intervalMs = 5000) {
  stopCallDetection();
  const check = async () => {
    const now = process.platform === 'win32' ? await windowsMicUsers() : await runningCallApps();
    for (const name of now) {
      if (!active.has(name)) onCallStarted(name);
    }
    active.clear();
    now.forEach((n) => active.add(n));
  };
  // Prime the set first so apps already open at launch don't trigger a prompt.
  void (process.platform === 'win32' ? windowsMicUsers() : runningCallApps()).then((initial) => {
    initial.forEach((n) => active.add(n));
    timer = setInterval(check, intervalMs);
  });
}

export function stopCallDetection() {
  if (timer) clearInterval(timer);
  timer = null;
  active.clear();
}
