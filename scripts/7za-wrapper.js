const { spawn } = require('child_process');
const path = require('path');

// Find the real 7za.exe
const real7za = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

// Filter out -snld flag which causes symlink errors on Windows
const args = process.argv.slice(2).filter(arg => arg !== '-snld');

const child = spawn(real7za, args, { stdio: 'inherit', windowsHide: true });

child.on('close', (code) => {
  // Ignore exit code 2 (non-fatal errors like symlink failures)
  process.exit(code === 2 ? 0 : code);
});
