import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const web = fileURLToPath(new URL('../../web/', import.meta.url));
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], { cwd: web, env: { ...process.env, NEXT_OUTPUT: 'export', NEXT_BUILD_DIR: 'studio-out' }, stdio: 'inherit' });
process.exit(result.status ?? 1);
