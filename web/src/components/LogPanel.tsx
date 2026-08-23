'use client';
import { useEffect, useRef } from 'react';

interface LogPanelProps {
    logs: string[];
    onSaveTrace?: () => void;
}

export function LogPanel({ logs, onSaveTrace }: LogPanelProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    }, [logs]);

    return (
        <div className="w-full max-w-[920px] space-y-1.5">
            <div className="flex items-center justify-between px-1">
                <p className="text-[0.7rem] uppercase tracking-wider text-zinc-600 font-medium">Console</p>
                {onSaveTrace && (
                    <button
                        onClick={onSaveTrace}
                        className="text-[0.7rem] text-zinc-500 hover:text-zinc-200 transition-colors"
                        title="Download everything in this console plus device info as a .trace file"
                    >
                        save trace
                    </button>
                )}
            </div>
            <div
                ref={ref}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 font-mono text-[0.7rem] leading-relaxed text-zinc-500 max-h-44 overflow-y-auto whitespace-pre-wrap break-all"
                role="log"
            >
                {logs.length === 0
                    ? 'Ready. Connect keyboard to start.'
                    : logs.join('\n')
                }
            </div>
        </div>
    );
}
