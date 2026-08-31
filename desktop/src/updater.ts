/**
 * Update check against the GitHub repository's default branch.
 *
 * The build script bakes the git commit the bundle was made from into
 * __BUILD_COMMIT__; checking asks the public GitHub API how far the default
 * branch has moved past that commit. Downloading stays manual — the UI's
 * button opens the releases page in the browser.
 */
import { net } from 'electron';
import type { UpdateCheckResult } from '../../web/src/lib/native-ipc';

// Injected by scripts/build.mjs (esbuild define); absent under plain tsc.
declare const __BUILD_COMMIT__: string | null;
declare const __BUILD_DATE__: string | null;

export const REPO = 'ibrokhimel/aula-f75-effects';
export const RELEASES_URL = `https://github.com/${REPO}/releases`;

const API = `https://api.github.com/repos/${REPO}`;

const BUILD_COMMIT = typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : null;
const BUILD_DATE = typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : null;

interface GhCommit {
  sha: string;
  commit: {
    message: string;
    committer: { date: string } | null;
    author: { date: string } | null;
  };
}

async function gh<T>(path: string): Promise<T> {
  const res = await net.fetch(`${API}${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path || '/'}`);
  return await res.json() as T;
}

const toLatest = (c: GhCommit): UpdateCheckResult['latest'] => ({
  sha: c.sha.slice(0, 7),
  date: c.commit.committer?.date ?? c.commit.author?.date ?? null,
  message: c.commit.message.split('\n')[0],
});

export async function checkForUpdates(version: string): Promise<UpdateCheckResult> {
  const { default_branch: branch } = await gh<{ default_branch: string }>('');
  const base: UpdateCheckResult = {
    version,
    commit: BUILD_COMMIT?.slice(0, 7) ?? null,
    builtAt: BUILD_DATE,
    branch,
    updateAvailable: null,
    behindBy: null,
    latest: null,
  };

  if (BUILD_COMMIT) {
    try {
      const cmp = await gh<{ ahead_by: number; commits: GhCommit[] }>(
        `/compare/${BUILD_COMMIT}...${encodeURIComponent(branch)}`);
      const tip = cmp.commits[cmp.commits.length - 1];
      return {
        ...base,
        updateAvailable: cmp.ahead_by > 0,
        behindBy: cmp.ahead_by,
        latest: tip ? toLatest(tip) : null,
      };
    } catch {
      // A local, never-pushed build commit 404s the compare — fall through
      // and report the branch tip without a comparison.
    }
  }

  return { ...base, latest: toLatest(await gh<GhCommit>(`/commits/${encodeURIComponent(branch)}`)) };
}
