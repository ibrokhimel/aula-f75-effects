'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { WIRED_VID, WIRED_PID, WIRELESS_VID, WIRELESS_PID } from '@/lib/protocol';
import { setEffect, applyPerKey, setSleepTimer, setDebounce, factoryReset, readConfig, writeKeybindBlob, type EffectOptions } from '@/lib/webhid';
import { type Layer } from '@/lib/keybind';
import { isFeatureTransport, readConfigRegion, readColorTable } from '@/lib/f75';
import { calibrate, clearLayout, probeSelectViaKnob, snapshotConfig, restoreSnapshot, probeSelfDefineSlots } from '@/lib/f75-layout';
import { buildTrace, collectEnv, downloadTrace } from '@/lib/trace';
import { stopPreviewKeepalive } from '@/lib/direct-mode';

export function useKeyboard() {
    const [device, setDevice] = useState<HIDDevice | null>(null);
    const [connected, setConnected] = useState(false);
    const [status, setStatus] = useState('Not connected');
    const [logs, setLogs] = useState<string[]>([]);
    const logsRef = useRef<string[]>([]);
    const deviceRef = useRef<HIDDevice | null>(null);

    useEffect(() => {
        deviceRef.current = device;
    }, [device]);

    const log = useCallback((msg: string) => {
        const ts = new Date().toLocaleTimeString('en', { hour12: false, fractionalSecondDigits: 3 });
        const entry = `[${ts}] ${msg}`;
        logsRef.current = [...logsRef.current, entry];
        setLogs([...logsRef.current]);
        console.log(msg);
    }, []);

    const connect = useCallback(async (vendorFilter: boolean) => {
        if (device?.opened) {
            await device.close();
            setDevice(null);
            setConnected(false);
            setStatus('Disconnected');
            log('Disconnected');
            return;
        }

        try {
            let filters: HIDDeviceFilter[];
            if (vendorFilter) {
                filters = [];
                for (let page = 0xff00; page <= 0xff04; page++) {
                    filters.push({ vendorId: WIRED_VID, productId: WIRED_PID, usagePage: page });
                    filters.push({ vendorId: WIRELESS_VID, productId: WIRELESS_PID, usagePage: page });
                }
                log('Requesting device (vendor pages)...');
            } else {
                filters = [
                    { vendorId: WIRED_VID, productId: WIRED_PID },
                    { vendorId: WIRELESS_VID, productId: WIRELESS_PID },
                ];
                log('Requesting device (any)...');
            }

            const hid = (navigator as Navigator & { hid?: HID }).hid;
            if (!hid) {
                const reason = isSecureContext
                    ? 'WebHID API is not available in this browser. Please use a Chromium-based browser.'
                    : 'WebHID requires a secure context (HTTPS or localhost).';
                log(`Error: ${reason}`);
                setStatus(`Error: ${reason}`);
                return;
            }

            const [dev] = await hid.requestDevice({ filters });
            if (!dev) { log('No device selected'); return; }

            const vid = dev.vendorId.toString(16).padStart(4, '0');
            const pid = dev.productId.toString(16).padStart(4, '0');
            const model = dev.productName || 'AULA F75';
            log(`Selected: ${model} (${vid}:${pid})`);
            for (const c of dev.collections) {
                const cp = `0x${(c.usagePage ?? 0).toString(16).padStart(2, '0')}`;
                const out = c.outputReports?.map(r => `0x${(r.reportId ?? 0).toString(16)}`).join(',') ?? '';
                const feat = c.featureReports?.map(r => `0x${(r.reportId ?? 0).toString(16)}`).join(',') ?? '';
                log(`Collection page ${cp}: out=[${out}] feat=[${feat}]`);
            }
            const hasFeature06 = dev.collections.some(c => (c.featureReports ?? []).some(r => (r.reportId ?? 0) === 0x06));
            if (!hasFeature06) {
                log('WARNING: no collection exposes feature report 0x06 — pick the vendor interface (the second device entry), not the plain keyboard one.');
                setStatus('⚠ Wrong interface — reconnect and pick the vendor collection');
            }

            try {
                await dev.open();
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                log(`Error: Failed to open ${model} (${vid}:${pid}): ${msg}`);
                log('Hint: on Linux this means the browser cannot access the keyboard\'s /dev/hidraw node.');
                log('  Install the udev rule, reload it, then replug the keyboard:');
                log('    sudo cp udev/99-aula-f75.rules /etc/udev/rules.d/');
                log('    sudo udevadm control --reload-rules && sudo udevadm trigger');
                log('  Also close any other tab/app that has the keyboard open (only one page can hold it).');
                setStatus(`Error: failed to open ${model}`);
                return;
            }

            setDevice(dev);
            setConnected(true);
            log(`Connected: ${model} (${vid}:${pid})`);

            const hasVendor = dev.collections.some(c => (c.usagePage ?? 0) >= 0xff00);
            setStatus(hasVendor
                ? `Connected: ${model} (${vid}:${pid})`
                : '⚠ Wrong interface — no vendor collection'
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (err instanceof DOMException && (err.name === 'NotFoundError' || err.name === 'AbortError')) {
                log('Connect cancelled — no device selected');
                return;
            }
            log(`Error: ${msg}`);
            setStatus(`Error: ${msg}`);
        }
    }, [device, log]);

    useEffect(() => {
        const hid = (navigator as Navigator & { hid?: HID }).hid;
        if (!hid) return;

        const onDisconnect = (ev: HIDConnectionEvent) => {
            const dev = deviceRef.current;
            if (!dev || ev.device !== dev) return;

            stopPreviewKeepalive();
            log(`Disconnected: ${ev.device.productName || 'HID device'} unplugged`);
            void (async () => {
                try {
                    if (ev.device.opened) await ev.device.close();
                } catch {
                    /* already torn down */
                }
            })();
            setDevice(null);
            setConnected(false);
            setStatus('Not connected');
        };

        hid.addEventListener('disconnect', onDisconnect);
        return () => hid.removeEventListener('disconnect', onDisconnect);
    }, [log]);

    useEffect(() => {
        if (!device) return;
        const onAccessLost = () => {
            stopPreviewKeepalive();
            log('Access lost — the device was handed off to another page (close it and reconnect here)');
            setDevice(null);
            setConnected(false);
            setStatus('Device handed off to another page');
        };
        device.addEventListener('accesslost', onAccessLost as EventListener);
        return () => device.removeEventListener('accesslost', onAccessLost as EventListener);
    }, [device, log]);

    const doSetEffect = useCallback(async (effectNum: number, opts: EffectOptions) => {
        if (!device?.opened) { log('Not connected!'); return; }
        try { await setEffect(device, effectNum, opts, log); }
        catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doApplyPerKey = useCallback(async (keyColors: Record<number, [number, number, number]>) => {
        if (!device?.opened) { log('Not connected!'); return; }
        try { await applyPerKey(device, keyColors, log); }
        catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doSetSleep = useCallback(async (minutes: number) => {
        if (!device?.opened) { log('Not connected!'); return; }
        try { await setSleepTimer(device, minutes, log); }
        catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doSetDebounce = useCallback(async (level: number) => {
        if (!device?.opened) { log('Not connected!'); return; }
        try { await setDebounce(device, level, log); }
        catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doFactoryReset = useCallback(async () => {
        if (!device?.opened) { log('Not connected!'); return; }
        try { await factoryReset(device, log); }
        catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doReadConfig = useCallback(async () => {
        if (!device?.opened) { log('Not connected!'); return 0; }
        try {
            const frame = await readConfig(device, log, 3); // now Uint8Array | null on wired
            const n = frame instanceof Uint8Array ? 1 : (frame?.filter(f => f !== null).length ?? 0);
            log(`Config read: ${n}${frame instanceof Uint8Array ? ' region (128 bytes)' : '/10 frames'}`);
            return n;
        } catch (err: unknown) {
            log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
            return 0;
        }
    }, [device, log]);

    const doWriteKeybind = useCallback(async (layer: Layer, blob: Uint8Array) => {
        if (!device?.opened) { log('Not connected!'); return; }
        try { await writeKeybindBlob(device, layer, blob, log); log('Keybind layer written to flash'); }
        catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doDumpConfig = useCallback(async () => {
        if (!device?.opened) { log("Not connected!"); return; }
        try {
            if (!isFeatureTransport(device.productId)) { log("Dump config is wired-only."); return; }
            const r = await readConfigRegion(device, log);
            log(r ? `Config region (128B): ${Array.from(r).map(b => b.toString(16).padStart(2, "0")).join(" ")}` : "Dump failed");
        } catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doDumpColors = useCallback(async () => {
        if (!device?.opened) { log("Not connected!"); return; }
        try {
            if (!isFeatureTransport(device.productId)) { log("Dump color table is wired-only."); return; }
            const t = await readColorTable(device, log);
            log(t ? `Color table (512B): ${Array.from(t).map(b => b.toString(16).padStart(2, "0")).join(" ")}` : "Dump failed");
        } catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doCalibrate = useCallback(async () => {
        if (!device?.opened) { log("Not connected!"); return; }
        try {
            if (!isFeatureTransport(device.productId)) { log("Calibration is wired-only."); return; }
            await calibrate(device, log);
        } catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doClearLayout = useCallback(() => {
        clearLayout();
        log("Calibrated layout map cleared.");
    }, [log]);

    const doProbeSelect = useCallback(async () => {
        if (!device?.opened) { log("Not connected!"); return; }
        try {
            if (!isFeatureTransport(device.productId)) { log("Probe is wired-only."); return; }
            await probeSelectViaKnob(device, log);
        } catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doSnapshotDefaults = useCallback(async () => {
        if (!device?.opened) { log("Not connected!"); return; }
        try {
            if (!isFeatureTransport(device.productId)) { log("Snapshot is wired-only."); return; }
            await snapshotConfig(device, log);
        } catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doRestoreDefaults = useCallback(async () => {
        if (!device?.opened) { log("Not connected!"); return; }
        try {
            if (!isFeatureTransport(device.productId)) { log("Restore is wired-only."); return; }
            await restoreSnapshot(device, log);
        } catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doPerKeyLab = useCallback(async () => {
        if (!device?.opened) { log("Not connected!"); return; }
        try {
            if (!isFeatureTransport(device.productId)) { log("Lab is wired-only."); return; }
            await probeSelfDefineSlots(device, log);
        } catch (err: unknown) { log(`ERROR: ${err instanceof Error ? err.message : String(err)}`); }
    }, [device, log]);

    const doSaveTrace = useCallback(() => {
        const content = buildTrace({
            status,
            connected,
            logs: logsRef.current,
            device: deviceRef.current,
            env: collectEnv(),
        });
        downloadTrace(content);
        log(`Trace saved (${logsRef.current.length} log entries) — attach it when reporting an issue.`);
    }, [status, connected, log]);

    return {
        device, connected, status, logs, log,
        connect, doSetEffect, doApplyPerKey, doSetSleep, doSetDebounce, doFactoryReset, doReadConfig, doWriteKeybind,
        doDumpConfig, doDumpColors, doCalibrate, doClearLayout, doProbeSelect, doSnapshotDefaults, doRestoreDefaults,
        doPerKeyLab, doSaveTrace,
    };
}
