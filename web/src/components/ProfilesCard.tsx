'use client';

import { useState } from 'react';
import {
    deleteProfile, listProfiles, profileFromBase64, profileToBase64,
    saveProfile, type Profile,
} from '@/lib/profiles';
import type { Layer } from '@/lib/keybind';

const REMAP_KEY = 'aula-f75.remap';

function currentLayers(): { base: Uint8Array; fn: Uint8Array } {
    const empty = () => new Uint8Array(520).fill(0);
    try {
        const raw = localStorage.getItem(REMAP_KEY);
        if (!raw) return { base: empty(), fn: empty() };
        const o = JSON.parse(raw) as Record<string, number[]>;
        return { base: new Uint8Array(o['0'] ?? []), fn: new Uint8Array(o['1'] ?? []) };
    } catch {
        return { base: empty(), fn: empty() };
    }
}

export function ProfilesCard({ onWriteKeybind }: {
    onWriteKeybind: (layer: Layer, blob: Uint8Array) => Promise<void>;
}) {
    const [profiles, setProfiles] = useState<Profile[]>(listProfiles);
    const [name, setName] = useState('');
    const [status, setStatus] = useState('');

    const refresh = () => setProfiles(listProfiles());

    function capture() {
        if (!name.trim()) { setStatus('Name the profile first'); return; }
        saveProfile({
            id: `p${Date.now()}`, name: name.trim(), createdAt: Date.now(),
            layers: currentLayers(), colors: {},
            effect: { num: 3, speed: null, brightness: null, colorful: true, color: null },
            sleepMinutes: 0, debounceMs: 3, raw: '',
        });
        refresh();
        setName('');
        setStatus('Saved');
    }

    async function apply(p: Profile) {
        try {
            await onWriteKeybind(0, p.layers.base);
            await onWriteKeybind(1, p.layers.fn);
            setStatus(`Applied "${p.name}"`);
        } catch (e) {
            setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    function remove(id: string) { deleteProfile(id); refresh(); }

    async function doExport(p: Profile) {
        try { await navigator.clipboard.writeText(profileToBase64(p)); setStatus(`Exported "${p.name}" to clipboard`); }
        catch { setStatus('Clipboard unavailable'); }
    }

    async function doImport(raw: string) {
        try { saveProfile(profileFromBase64(raw)); refresh(); setStatus('Imported'); }
        catch (e) { setStatus(`Import failed: ${e instanceof Error ? e.message : String(e)}`); }
    }

    return (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm space-y-3 sm:col-span-2">
            <h3 className="text-sm font-medium text-zinc-300">Keybind Profiles</h3>
            <p className="text-xs text-zinc-600">Captures the current Default/FN1 remaps from the Remap tab.</p>
            <div className="flex gap-2">
                <input
                    value={name} onChange={(e) => setName(e.target.value)} placeholder="Profile name"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-violet-500"
                />
                <button onClick={capture} className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500">Save current</button>
            </div>
            <div className="space-y-2">
                {profiles.length === 0 && <p className="text-xs text-zinc-600">No profiles yet.</p>}
                {profiles.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border border-zinc-800 rounded-lg px-3 py-2">
                        <span className="text-sm text-zinc-300">{p.name}</span>
                        <span className="flex gap-2">
                            <button onClick={() => apply(p)} className="text-xs px-2 py-1 rounded bg-violet-600/20 border border-violet-500/40 text-violet-300">Apply</button>
                            <button onClick={() => doExport(p)} className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-400">Export</button>
                            <button onClick={() => remove(p.id)} className="text-xs px-2 py-1 rounded border border-red-500/40 text-red-400">Delete</button>
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 items-center">
                <input id="profile-import" type="file" accept=".txt,.json,text/plain,application/json" className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        f.text().then(doImport).catch(() => setStatus('Read failed'));
                    }} />
                <label htmlFor="profile-import" className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 cursor-pointer hover:border-zinc-500">Import…</label>
            </div>
            <p className="text-xs text-zinc-500">{status}</p>
        </div>
    );
}