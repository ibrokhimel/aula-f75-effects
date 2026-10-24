import { cpus, freemem, totalmem, uptime } from 'node:os';
import type { SystemSample } from '../../packages/engine/src';
function counters() { return cpus().reduce((sum, cpu) => { sum.idle += cpu.times.idle; sum.total += Object.values(cpu.times).reduce((a, b) => a + b, 0); return sum; }, { idle: 0, total: 0 }); }
export function createTelemetrySampler() {
  let before = counters(), sampledAt = 0, cached: SystemSample | null = null;
  return (): SystemSample => {
    const now = Date.now();
    if (cached && now - sampledAt < 1000) return cached;
    const next = counters(), total = next.total - before.total, idle = next.idle - before.idle;
    const bytes = totalmem(), used = bytes - freemem();
    cached = { cpu: total > 0 ? Math.max(0, Math.min(100, 100 * (1 - idle / total))) : 0, memory: 100 * used / bytes, usedBytes: used, totalBytes: bytes, uptime: uptime(), timestamp: now };
    before = next; sampledAt = now; return cached;
  };
}
