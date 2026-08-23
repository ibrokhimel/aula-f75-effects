'use client';

interface ConnectionBarProps {
    connected: boolean;
    status: string;
    onConnect: (vendorFilter: boolean) => void;
}

export function ConnectionBar({ connected, status, onConnect }: ConnectionBarProps) {
    return (
        <div className="w-full max-w-[920px] flex flex-col items-center gap-3 mb-5">
            <div className="flex gap-2 items-center">
                <button
                    onClick={() => onConnect(true)}
                    className={[
                        'px-5 py-2 rounded-lg font-medium text-sm transition-colors duration-150',
                        connected
                            ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-zinc-100 text-zinc-900 hover:bg-white'
                    ].join(' ')}
                >
                    {connected ? 'Disconnect' : 'Connect keyboard'}
                </button>
                <button
                    onClick={() => onConnect(false)}
                    className="px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
                    title="Show every HID device instead of filtering for the F75"
                >
                    other devices…
                </button>
            </div>
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : status.startsWith('⚠') ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                {status}
            </p>
        </div>
    );
}
