// Launch the desktop app. Terminals inside VS Code (and other Electron apps)
// export ELECTRON_RUN_AS_NODE=1, which makes Electron behave like plain Node
// and crash on startup, so drop it for the child process.
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, [path.join(__dirname, '../desktop-app/dist/main.js')], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
