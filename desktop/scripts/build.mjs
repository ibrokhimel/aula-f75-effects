// Bundle the Electron main and preload processes with esbuild.
// The web libs under ../web/src are compiled straight into the bundle;
// native modules stay external and load from node_modules at runtime.
import { build } from 'esbuild';
import { execSync } from 'node:child_process';

// Bake the source commit into the bundle so the update check can compare
// this build against the GitHub default branch. Null outside a git checkout.
let commit = null;
try {
  commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch { /* update check falls back to reporting the branch tip */ }

const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'info',
};

await build({
  ...common,
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.cjs',
  external: ['electron', 'node-hid', 'uiohook-napi'],
  define: {
    __BUILD_COMMIT__: JSON.stringify(commit),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
});

await build({
  ...common,
  entryPoints: ['src/preload.ts'],
  outfile: 'dist/preload.cjs',
  external: ['electron'],
});
