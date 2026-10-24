import { createServer } from 'node:http';
import { cpus, freemem, totalmem, uptime } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function totals() {
  return cpus().reduce((sum, core) => ({ idle: sum.idle + core.times.idle, total: sum.total + Object.values(core.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });
}
export function createSystemSampler() {
  let previous = totals();
  return () => {
    const next = totals(), elapsed = next.total - previous.total;
    const cpu = elapsed > 0 ? Math.max(0, Math.min(100, (1 - (next.idle - previous.idle) / elapsed) * 100)) : 0;
    previous = next;
    const totalBytes = totalmem(), usedBytes = totalBytes - freemem();
    return { cpu, memory: usedBytes / totalBytes * 100, totalBytes, usedBytes, uptime: uptime(), timestamp: Date.now() };
  };
}
export function startTelemetryServer(port = Number(process.env.STUDIO_TELEMETRY_PORT || 3001)) {
  const sample = createSystemSampler();
  let latest = sample();
  const timer = setInterval(() => { latest = sample(); }, 1000);
  const server = createServer((request, response) => {
    const origin = request.headers.origin;
    if (origin) {
      try {
        const url = new URL(origin);
        if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol)) throw new Error('origin');
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
      } catch { response.writeHead(403); response.end(); return; }
    }
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'GET' || request.url !== '/telemetry') { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(latest));
  });
  server.on('error', error => {
    clearInterval(timer);
    if (error.code === 'EADDRINUSE') console.log(`Telemetry helper already listening on ${port}.`);
    else console.error('Telemetry helper:', error.message);
  });
  server.on('close', () => clearInterval(timer));
  server.listen(port, '127.0.0.1', () => console.log(`System telemetry: http://127.0.0.1:${port}/telemetry`));
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startTelemetryServer();
