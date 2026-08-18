'use client';

import { useState } from 'react';
import { connectionLabel } from '@/lib/deviceinfo';

export function DeviceInfoCard({ device, onReadConfig }: {
    device: HIDDevice | null;
    onReadConfig: () => Promise<number>;
}) {
    const [frames, setFrames] = useState<number | null>(null);
    const [reading, setReading] = useState(false);

    const read = async () => {
        setReading(true);
        try { setFrames(await onReadConfig()); }
        finally { setReading(false); }
    };

    return (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-3 sm:col-span-2">
            <h3 className="text-sm font-medium text-zinc-300">Device Info</h3>
            <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-zinc-500">Model</dt><dd className="text-zinc-300">{device?.productName || 'AULA F75'}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Connection</dt><dd className="text-zinc-300">{device ? connectionLabel(device.productId) : 'Not connected'}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">VID:PID</dt><dd className="text-zinc-300 font-mono">{device ? `${device.vendorId.toString(16).padStart(4, '0')}:${device.productId.toString(16).padStart(4, '0')}` : '—'}</dd></div>
            </dl>
            <button
                onClick={read}
                disabled={!device || reading}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600/30 disabled:opacity-40 disabled:cursor-default"
            >
                {reading ? 'Reading…' : frames !== null ? `Config read: ${frames}/10 frames` : 'Read config frames'}
            </button>
        </div>
    );
}