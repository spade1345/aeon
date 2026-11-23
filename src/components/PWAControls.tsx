import { useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/utils/cn';

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        title="Install Aeon as an offline desktop or mobile app"
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/20 font-semibold text-violet-200 transition-colors hover:bg-violet-500/30 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400',
          compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs',
        )}
      >
        <DownloadIcon />
        <span>{compact ? 'Install' : 'Install app'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Install Aeon on iOS"
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400',
            compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs',
          )}
        >
          <DownloadIcon />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-slate-700/80 bg-slate-900 p-5 text-slate-200 shadow-2xl shadow-black/70"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/90">
                  <img src="/assets/aistudio/logo_2f208861.png" alt="" className="h-full w-full scale-[1.28] object-contain" />
                </div>
                <div>
                  <h3 id="ios-install-title" className="text-sm font-semibold text-white">
                    Install Aeon on iPhone / iPad
                  </h3>
                  <p className="text-xs text-slate-400">Runs offline directly from your Home Screen</p>
                </div>
              </div>
              <ol className="mt-4 space-y-2 text-xs leading-relaxed text-slate-300">
                <li>
                  1. Tap the <span className="font-semibold text-white">Share</span> button in Safari&apos;s toolbar.
                </li>
                <li>
                  2. Scroll down and choose <span className="font-semibold text-white">Add to Home Screen</span>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator({ isPianoRoll = false }: { isPianoRoll?: boolean }) {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed left-3 z-40 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-slate-900/95 px-3 py-1.5 text-xs font-medium text-amber-200 shadow-xl shadow-black/50 backdrop-blur-md',
        isPianoRoll ? 'bottom-14' : 'bottom-4',
      )}
    >
      <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
      <span>Offline Mode — Synth runs locally from cache</span>
    </div>
  );
}
