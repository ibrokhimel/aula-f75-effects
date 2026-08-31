// Bundle the Electron main and preload processes with esbuild.
// The web libs under ../web/src are compiled straight into the bundle;
// native modules stay external and load from node_modules at runtime.
import { build } from 'esbuild';

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
});

await build({
  ...common,
  entryPoints: ['src/preload.ts'],
  outfile: 'dist/preload.cjs',
  external: ['electron'],
});
