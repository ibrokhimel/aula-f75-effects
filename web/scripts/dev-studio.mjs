import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startTelemetryServer } from './telemetry.mjs';

// Polling also catches edits made by tools that do not emit Windows watcher
// notifications. This keeps the user's live preview in sync with the files.
const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const telemetry = startTelemetryServer();
const child = spawn(process.execPath, [next, 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', process.env.STUDIO_PORT || '3000'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, WATCHPACK_POLLING: '1000' },
  stdio: 'inherit',
});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { telemetry.close(); process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
