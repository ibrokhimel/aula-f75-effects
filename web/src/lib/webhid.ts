/**
 * WebHID low-level I/O for AULA F87.
 */
import {
    REPORT_ID, CMD_READ, CMD_WRITE, CMD_COLOR, CMD_SAVE, CMD_PERKEY,
    SUBCMD_CONFIG, SUBCMD_PALETTE, SUBCMD_PERKEY, SUBCMD_CONFIRM,
    SELF_DEFINE_EFFECT,
    EFFECTS, CFG_TEMPLATE, PAL_TEMPLATE, PAL_ZEROS, PAL_LAST,
    buildFrame, checksum, effectTableLoc, encodeSpeedByte, decodeSpeedByte, hex,
} from './protocol';
import {
    FEATURE_REPORT_ID, LAYER_BASE, LAYER_OFFSET, validateBlob,
    type Layer,
} from './keybind';
import { isFeatureTransport, readConfigRegion, writeConfigRegion, readColorTable, writeColorTable } from './f75';
import { loadLayout, effectOffsetsFor, encodeBrightness, EFFECT_TABLE_BASE } from './f75-layout';

export type LogFn = (msg: string) => void;

// ── Low-level I/O ───────────────────────────────────────────────────────
export async function sendReport(device: HIDDevice, data: Uint8Array, log: LogFn) {
    const reportId = data[0];
    const body = data.slice(1);
    try {
        await device.sendReport(reportId, body);
    } catch (err: unknown) {
        const pages = device.collections
            .map(c => `0x${(c.usagePage ?? 0).toString(16).padStart(2, '0')} out=[${(c.outputReports ?? []).map(r => `0x${(r.reportId ?? 0).toString(16)}`).join(',')}]`)
            .join(' | ');
        throw new Error(`${err instanceof Error ? err.message : String(err)} (report 0x${reportId.toString(16).padStart(2, '0')}; collections: ${pages})`);
    }
    log(`TX: ${hex(data)}`);
}

export async function readReport(device: HIDDevice, timeoutMs = 200): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
        let resolved = false;
        const handler = (e: HIDInputReportEvent) => {
            if (resolved) return;
            resolved = true;
            device.removeEventListener('inputreport', handler);
            const full = new Uint8Array(e.data.buffer.byteLength + 1);
            full[0] = e.reportId;
            full.set(new Uint8Array(e.data.buffer), 1);
            resolve(full);
        };
        device.addEventListener('inputreport', handler);
        setTimeout(() => {
            if (!resolved) { resolved = true; device.removeEventListener('inputreport', handler); resolve(null); }
        }, timeoutMs);
    });
}

export async function writeKeybindBlob(device: HIDDevice, layer: Layer, blob: Uint8Array, log: LogFn) {
    validateBlob(blob);
    if (blob[LAYER_OFFSET] !== layer) {
        throw new Error(`Layer byte mismatch: blob=${blob[LAYER_OFFSET]}, requested=${layer}`);
    }
    log(`TX-FEATURE 0x${FEATURE_REPORT_ID.toString(16)} layer=${layer === LAYER_BASE ? 'base' : 'fn'} (520 bytes)`);
    // WebHID sendFeatureReport takes (reportId, data-without-its-byte-0).
    await device.sendFeatureReport(FEATURE_REPORT_ID, blob.slice(1));
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function txRx(device: HIDDevice, frame: Uint8Array, log: LogFn): Promise<Uint8Array | null> {
    await sendReport(device, frame, log);
    await sleep(3);
    const echo = await readReport(device, 200);
    if (echo) log(`RX: ${hex(echo)}`);
    else log('RX: (no reply)');
    return echo;
}

export async function txBulk(device: HIDDevice, frames: Uint8Array[], label: string, log: LogFn): Promise<Uint8Array[]> {
    const echoes: Uint8Array[] = [];
    for (const frame of frames) {
        const echo = await txRx(device, frame, log);
        if (echo) echoes.push(echo);
    }
    log(`${label}: ${echoes.length}/${frames.length} OK`);
    return echoes;
}

export async function readConfig(device: HIDDevice, log: LogFn, retries = 3): Promise<Uint8Array | (Uint8Array | null)[] | null> {
    if (isFeatureTransport(device.productId)) {
        return readConfigRegion(device, log, retries); // Uint8Array | null (128 bytes)
    }
    // Buffer ALL incoming reports before sending the read request so no
    // fragments are dropped while JS is awaiting between readReport calls.
    const buffer: Uint8Array[] = [];
    const bufferHandler = (e: HIDInputReportEvent) => {
        const full = new Uint8Array(e.data.buffer.byteLength + 1);
        full[0] = e.reportId;
        full.set(new Uint8Array(e.data.buffer), 1);
        buffer.push(full);
    };
    device.addEventListener('inputreport', bufferHandler);

    try {
        for (let attempt = 0; attempt < retries; attempt++) {
            if (attempt > 0) {
                log(`  Retrying config read (attempt ${attempt + 1}/${retries})...`);
                await sleep(150);
                buffer.length = 0;
            }

            const readFrame = buildFrame(CMD_READ, SUBCMD_CONFIRM, 0, new Uint8Array(15));
            await sendReport(device, readFrame, log);

            const config: (Uint8Array | null)[] = new Array(10).fill(null);
            const deadline = Date.now() + 1500;

            while (Date.now() < deadline) {
                while (buffer.length > 0) {
                    const r = buffer.shift()!;
                    if (r.length >= 20 && r[0] === REPORT_ID && r[1] === CMD_READ && r[2] === SUBCMD_CONFIG) {
                        const seq = r[3];
                        if (seq >= 0 && seq < 10) {
                            config[seq] = r;
                            log(`  cfg[${seq}]=${hex(r)}`);
                        }
                    }
                }
                if (config.every(c => c !== null)) break;
                await sleep(20);
            }

            if (config.every(c => c !== null)) return config;
        }
    } finally {
        device.removeEventListener('inputreport', bufferHandler);
    }

    return new Array(10).fill(null);
}

// ── High-level operations ───────────────────────────────────────────────
export interface EffectOptions {
    colorRgb?: [number, number, number] | null;
    colorful?: boolean;
    speed?: number | null;
    brightness?: number | null;
}

export async function setEffect(device: HIDDevice, effectNum: number, opts: EffectOptions, log: LogFn) {
    if (isFeatureTransport(device.productId)) {
        const eff = EFFECTS[effectNum];
        if (!eff) { log(`Unknown effect ${effectNum}`); return; }
        if (effectNum === SELF_DEFINE_EFFECT) { log('Self-define is per-key mode. Use the Per-Key tab.'); return; }

        const layout = loadLayout();
        const sel = layout?.effectSelectOffset ?? null;
        const offs = effectOffsetsFor(effectNum);
        const region = await readConfigRegion(device, log);
        if (!region) { log('ERROR: could not read config region'); return; }

        let desc = `── Setting #${effectNum}: ${effectNum === 0 ? 'OFF' : eff.name}`;
        if (opts.brightness !== null && opts.brightness !== undefined) desc += `  bright=${opts.brightness}`;
        if (opts.speed !== null && opts.speed !== undefined) desc += `  speed=${opts.speed}`;
        if (opts.colorful) desc += '  [colorful]';
        log(desc + ' ──');

        if (sel !== null) region[sel] = effectNum;
        const curPair = decodeSpeedByte(region[offs.speedColor]);
        if (opts.brightness !== null && opts.brightness !== undefined) region[offs.bright] = encodeBrightness(opts.brightness);
        region[offs.speedColor] = opts.colorful
            ? encodeSpeedByte(opts.speed ?? curPair.speed, true)
            : (opts.speed !== null && opts.speed !== undefined ? encodeSpeedByte(opts.speed, !!opts.colorRgb) : region[offs.speedColor]);
        await writeConfigRegion(device, region, log);
        log(`✓ ${eff.name} active!\n`);
        return;
    }

    const isOff = effectNum === 0;
    if (effectNum === SELF_DEFINE_EFFECT) {
        log('Self-define is per-key mode. Use the Per-Key tab.');
        return;
    }

    const eff = EFFECTS[effectNum];
    if (!eff) { log(`Unknown effect ${effectNum}`); return; }

    const colorRgb = isOff ? null : (opts.colorRgb ?? null);
    const colorful = isOff ? false : (opts.colorful ?? false);
    const speed = isOff ? null : (opts.speed ?? null);
    const brightness = isOff ? 0 : (opts.brightness ?? null);
    const [tgtSeq, tgtOff] = effectTableLoc(effectNum);

    let desc = `── Setting #${effectNum}: ${isOff ? 'OFF' : eff.name}`;
    if (colorRgb) desc += `  color=(${colorRgb.join(',')})`;
    if (colorful) desc += '  [colorful]';
    if (brightness !== null) desc += `  bright=${brightness}`;
    if (speed !== null) desc += `  speed=${speed}`;
    log(desc + ' ──');

    log('Phase 1: Reading config...');
    const config = await readConfig(device, log) as (Uint8Array | null)[];
    const gotConfig = config.every(c => c !== null);
    if (gotConfig) log(`  Current: #${config[0]![15]} (${EFFECTS[config[0]![15]]?.name || '?'})`);
    else log('  Using template');

    log('Phase 2: Writing config...');
    const writeFrames: Uint8Array[] = [];
    for (let seq = 0; seq < 10; seq++) {
        let f: Uint8Array;
        if (gotConfig) {
            f = new Uint8Array(config[seq]!);
            f[1] = CMD_WRITE;
            if (seq === 0) { f[8] = 0x01; f[14] = 0x00; f[15] = effectNum; f[17] = (colorRgb || colorful) ? 0x01 : 0x03; }
            if (!isOff && seq === tgtSeq) {
                if (brightness !== null) f[tgtOff] = brightness;
                const cur = decodeSpeedByte(f[tgtOff + 1]);
                f[tgtOff + 1] = encodeSpeedByte(speed !== null ? speed : cur.speed, colorful ? true : (!colorRgb && cur.colorful));
            }
            f[19] = checksum(f);
        } else {
            const p = new Uint8Array(CFG_TEMPLATE[seq]);
            if (seq === 0) { p[4] = 0x01; p[10] = 0x00; p[11] = effectNum; p[13] = (colorRgb || colorful) ? 0x01 : 0x03; }
            if (!isOff && seq === tgtSeq) {
                const payOff = tgtOff - 4;
                if (brightness !== null) p[payOff] = brightness;
                const cur = decodeSpeedByte(p[payOff + 1]);
                p[payOff + 1] = encodeSpeedByte(speed !== null ? speed : cur.speed, colorful ? true : (!colorRgb && cur.colorful));
            }
            f = buildFrame(CMD_WRITE, SUBCMD_CONFIG, seq, p);
        }
        writeFrames.push(f);
    }
    await txBulk(device, writeFrames, 'Config', log);

    log('Phase 3: Writing palette...');
    const palFrames: Uint8Array[] = [];
    for (let i = 0; i < 37; i++) {
        let payload: Uint8Array;
        if (i < PAL_TEMPLATE.length) payload = new Uint8Array(PAL_TEMPLATE[i]);
        else if (i === 36) payload = new Uint8Array(PAL_LAST);
        else payload = new Uint8Array(PAL_ZEROS);
        if (i === 1 && colorRgb) { payload[8] = colorRgb[0]; payload[9] = colorRgb[1]; payload[10] = colorRgb[2]; payload[12] = 0xff; }
        palFrames.push(buildFrame(CMD_COLOR, SUBCMD_PALETTE, i, payload));
    }
    await txBulk(device, palFrames, 'Palette', log);

    log('Phase 4: Saving...');
    const savePayload = new Uint8Array(15);
    savePayload[0] = 0x04; savePayload[1] = 0x07;
    await txRx(device, buildFrame(CMD_SAVE, SUBCMD_CONFIRM, 0, savePayload), log);
    log(`✓ ${eff.name} active!\n`);
}

export async function applyPerKey(device: HIDDevice, keyColors: Record<number, [number, number, number]>, log: LogFn) {
    if (isFeatureTransport(device.productId)) {
        log('── Applying per-key colors (feature transport) ──');
        const region = await readConfigRegion(device, log);
        if (!region) { log('ERROR: could not read config region'); return; }
        const layout = loadLayout();
        const sel = layout?.effectSelectOffset ?? null;
        if (sel !== null) { region[sel] = SELF_DEFINE_EFFECT; await writeConfigRegion(device, region, log); }
        const table = new Uint8Array(512);
        for (const [idx, rgb] of Object.entries(keyColors)) {
            const i = parseInt(idx);
            if (i >= 0 && i < 128) { table[i * 4] = rgb[0]; table[i * 4 + 1] = rgb[1]; table[i * 4 + 2] = rgb[2]; }
        }
        await writeColorTable(device, table, log);
        log(`✓ Per-key colors written (${Object.keys(keyColors).length} keys). If LEDs don't refresh, use the live per-key stream (direct mode).\n`);
        return;
    }

    log('── Applying per-key colors ──');

    log('Phase 1: Reading config...');
    const config = await readConfig(device, log) as (Uint8Array | null)[];
    const gotConfig = config.every(c => c !== null);

    log('Phase 2: Writing config (self-define mode)...');
    const writeFrames: Uint8Array[] = [];
    for (let seq = 0; seq < 10; seq++) {
        let f: Uint8Array;
        if (gotConfig) {
            f = new Uint8Array(config[seq]!);
            f[1] = CMD_WRITE;
            if (seq === 0) { f[8] = 0x01; f[14] = 0x00; f[15] = SELF_DEFINE_EFFECT; f[17] = 0x01; }
            f[19] = checksum(f);
        } else {
            const p = new Uint8Array(CFG_TEMPLATE[seq]);
            if (seq === 0) { p[4] = 0x01; p[10] = 0x00; p[11] = SELF_DEFINE_EFFECT; p[13] = 0x01; }
            f = buildFrame(CMD_WRITE, SUBCMD_CONFIG, seq, p);
        }
        writeFrames.push(f);
    }
    await txBulk(device, writeFrames, 'Config', log);

    log('Phase 3: Writing per-key color map...');
    const R = new Uint8Array(126), G = new Uint8Array(126), B = new Uint8Array(126);
    for (const [idx, rgb] of Object.entries(keyColors)) {
        const i = parseInt(idx);
        if (i >= 0 && i < 126) { R[i] = rgb[0]; G[i] = rgb[1]; B[i] = rgb[2]; }
    }
    const perkeyFrames: Uint8Array[] = [];
    let seq = 0;
    for (const plane of [R, G, B]) {
        for (let s = 0; s < 9; s++) {
            const payload = new Uint8Array(15);
            payload[0] = 0x0e;
            for (let j = 0; j < 14; j++) payload[1 + j] = plane[s * 14 + j];
            perkeyFrames.push(buildFrame(CMD_PERKEY, SUBCMD_PERKEY, seq++, payload));
        }
    }
    const trailer = new Uint8Array(15);
    trailer[0] = 0x06; trailer[3] = 0x5a; trailer[4] = 0xa5;
    perkeyFrames.push(buildFrame(CMD_PERKEY, SUBCMD_PERKEY, seq, trailer));
    await txBulk(device, perkeyFrames, 'PerKey', log);

    log('Phase 4: Saving...');
    const savePayload = new Uint8Array(15);
    savePayload[0] = 0x04; savePayload[1] = 0x07;
    await txRx(device, buildFrame(CMD_SAVE, SUBCMD_CONFIRM, 0, savePayload), log);
    log(`✓ Per-key colors applied! (${Object.keys(keyColors).length} keys)\n`);
}

export async function setSleepTimer(device: HIDDevice, minutes: number, log: LogFn) {
    const sleepByte = minutes * 2;
    const label = minutes ? `${minutes} min` : 'Off';
    log(`── Setting sleep timer: ${label} ──`);

    if (isFeatureTransport(device.productId)) {
        const region = await readConfigRegion(device, log);
        if (!region) { log('ERROR: could not read config region'); return; }
        const layout = loadLayout();
        // provisional: real offset comes from calibration (Task 7 refines it)
        const off = layout?.sleepOffset ?? 80;
        const value = Math.min(0xff, Math.round(minutes * 2));
        region[off] = value;
        await writeConfigRegion(device, region, log);
        log(`✓ Sleep timer set to ${label} (region offset 0x${off.toString(16)})\n`);
        return;
    }

    log('Phase 1: Reading config...');
    let config = await readConfig(device, log) as (Uint8Array | null)[];
    let gotConfig = config.every(c => c !== null);

    if (!gotConfig) {
        log('  Could not read config, retrying...');
        await sleep(150);
        config = await readConfig(device, log) as (Uint8Array | null)[];
        gotConfig = config.every(c => c !== null);
    }

    if (!gotConfig) { log('ERROR: Could not read config after retries'); return; }

    const curVal = config[1]![15];
    log(`  Current: ${curVal / 2} min (0x${curVal.toString(16).padStart(2, '0')})`);

    log('Phase 2: Writing config...');
    const writeFrames: Uint8Array[] = [];
    for (let s = 0; s < 10; s++) {
        const f = new Uint8Array(config[s]!);
        f[1] = CMD_WRITE;
        if (s === 0) f[8] = 0x01;
        if (s === 1) f[15] = sleepByte;
        f[19] = checksum(f);
        writeFrames.push(f);
    }
    await txBulk(device, writeFrames, 'Config', log);

    log('Phase 3: Saving...');
    const savePayload = new Uint8Array(15);
    savePayload[0] = 0x04; savePayload[1] = 0x07;
    await txRx(device, buildFrame(CMD_SAVE, SUBCMD_CONFIRM, 0, savePayload), log);
    log(`✓ Sleep timer set to ${label}!\n`);
}

export async function setDebounce(device: HIDDevice, level: number, log: LogFn) {
    if (isFeatureTransport(device.productId)) {
        const region = await readConfigRegion(device, log);
        if (!region) { log('ERROR: could not read config region'); return; }
        const layout = loadLayout();
        region[layout?.debounceOffset ?? EFFECT_TABLE_BASE + 9] = level - 1;
        await writeConfigRegion(device, region, log);
        log(`✓ Debounce set to ${level}ms\n`);
        return;
    }

    const debounceByte = level - 1;
    log(`── Setting debounce: ${level}ms ──`);

    log('Phase 1: Reading config...');
    let config = await readConfig(device, log) as (Uint8Array | null)[];
    let gotConfig = config.every(c => c !== null);

    if (!gotConfig) {
        log('  Could not read config, retrying...');
        await sleep(100);
        config = await readConfig(device, log) as (Uint8Array | null)[];
        gotConfig = config.every(c => c !== null);
    }

    if (gotConfig) {
        const curVal = config[0]![8];
        const curLevel = curVal <= 4 ? curVal + 1 : '?';
        log(`  Current: ${curLevel}ms (0x${curVal.toString(16).padStart(2, '0')})`);
    } else {
        log('  Warning: Could not read config, using template...');
    }

    log('Phase 2: Writing config...');
    const writeFrames: Uint8Array[] = [];
    for (let s = 0; s < 10; s++) {
        let f: Uint8Array;
        if (gotConfig) {
            f = new Uint8Array(config[s]!);
            f[1] = CMD_WRITE;
        } else {
            const p = new Uint8Array(CFG_TEMPLATE[s]);
            if (s === 0) p[4] = 0x01;  // write flag in payload
            f = buildFrame(CMD_WRITE, SUBCMD_CONFIG, s, p);
        }
        if (s === 0) f[8] = debounceByte;
        f[19] = checksum(f);
        writeFrames.push(f);
    }
    await txBulk(device, writeFrames, 'Config', log);

    log('Phase 3: Saving...');
    const savePayload = new Uint8Array(15);
    savePayload[0] = 0x04; savePayload[1] = 0x07;
    await txRx(device, buildFrame(CMD_SAVE, SUBCMD_CONFIRM, 0, savePayload), log);

    // Phase 4: Verify (optional)
    await sleep(50);
    const verifyConfig = await readConfig(device, log) as (Uint8Array | null)[];
    if (verifyConfig.every(c => c !== null)) {
        const vVal = verifyConfig[0]![8];
        const vLevel = vVal <= 4 ? vVal + 1 : '?';
        if (vVal === debounceByte) {
            log(`✓ Debounce set to ${level}ms (verified)\n`);
        } else {
            log(`⚠ Debounce set to ${level}ms (verify shows ${vLevel}ms)\n`);
        }
    } else {
        log(`✓ Debounce set to ${level}ms!\n`);
    }
}

export async function factoryReset(device: HIDDevice, log: LogFn) {
    if (isFeatureTransport(device.productId)) {
        log('── Factory resetting lighting config ──');
        const region = new Uint8Array(128);
        for (let id = 0; id < 19; id++) {
            const offs = effectOffsetsFor(id);
            region[offs.bright] = 9;
            region[offs.speedColor] = (id === 0 ? 0 : 0x47);
        }
        await writeConfigRegion(device, region, log);
        log('✓ Factory config baseline written (effect table).\n');
        return;
    }

    log('── Factory resetting keyboard lighting ──');

    log('Phase 1: Writing factory default config...');
    const cfgFrames: Uint8Array[] = [];
    for (let s = 0; s < 10; s++) {
        const p = new Uint8Array(CFG_TEMPLATE[s]);
        if (s === 0) p[4] = 0x01;
        cfgFrames.push(buildFrame(CMD_WRITE, SUBCMD_CONFIG, s, p));
    }
    await txBulk(device, cfgFrames, 'Config', log);

    log('Phase 2: Writing factory default palette...');
    const palFrames: Uint8Array[] = [];
    for (let i = 0; i < 37; i++) {
        let p: number[];
        if (i < PAL_TEMPLATE.length) p = PAL_TEMPLATE[i];
        else if (i === 36) p = PAL_LAST;
        else p = PAL_ZEROS;
        palFrames.push(buildFrame(CMD_COLOR, SUBCMD_PALETTE, i, p));
    }
    await txBulk(device, palFrames, 'Palette', log);

    log('Phase 3: Saving...');
    const savePayload = new Uint8Array(15);
    savePayload[0] = 0x04; savePayload[1] = 0x07;
    await txRx(device, buildFrame(CMD_SAVE, SUBCMD_CONFIRM, 0, savePayload), log);
    log('✓ Factory reset complete!\n');
}
