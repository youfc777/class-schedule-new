const { spawn } = require('child_process');
const path = require('path');

// Strip ELECTRON_RUN_AS_NODE from env — it prevents Electron from initializing
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronPath = require('electron');
const args = process.argv.slice(2);

const child = spawn(electronPath, args, {
  stdio: 'inherit',
  env,
  windowsHide: false,
});

child.on('close', (code) => {
  process.exit(code);
});

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => child.kill(signal));
});
