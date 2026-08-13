import React, { useEffect, useState } from 'react';
import { Download, Share2, Plus } from 'lucide-react';

type Platform = 'ios' | 'android' | 'desktop';

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
};

const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  // iOS Safari's own flag for "already added to home screen"
  (window.navigator as any).standalone === true;

/**
 * Shows an "Install App" control appropriate to the visitor's platform:
 * - Android / desktop Chrome/Edge: captures the native `beforeinstallprompt`
 *   event and triggers it on click.
 * - iOS Safari: that event never fires there, so we show the manual
 *   "Share → Add to Home Screen" steps instead.
 * Renders nothing once the app is already running standalone (installed).
 */
const InstallAppButton: React.FC<{ className?: string; variant?: 'button' | 'inline' }> = ({
  className = '',
  variant = 'button',
}) => {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (platform === 'ios') {
      setShowIosSteps(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    // Android/desktop but the browser hasn't offered the native prompt yet
    // (e.g. criteria not met, or already dismissed once this session) —
    // fall back to pointing them at the dedicated install instructions page.
    window.open('/install.html', '_blank');
  };

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        className={
          variant === 'button'
            ? 'w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-zinc-100 text-zinc-950 hover:bg-white rounded-xl font-medium uppercase tracking-widest text-[10px] transition-colors'
            : 'flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-zinc-300 hover:text-zinc-100 transition-colors'
        }
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>

      {showIosSteps && (
        <div className="mt-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-left space-y-2">
          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">
            Add ARX to your Home Screen
          </p>
          <p className="text-xs text-zinc-300 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-zinc-500 shrink-0" /> 1. Tap the Share icon in Safari
          </p>
          <p className="text-xs text-zinc-300 flex items-center gap-2">
            <Plus className="w-4 h-4 text-zinc-500 shrink-0" /> 2. Tap "Add to Home Screen"
          </p>
          <button
            onClick={() => setShowIosSteps(false)}
            className="text-[9px] font-medium uppercase tracking-widest text-zinc-500 hover:text-zinc-300 mt-2"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
};

export default InstallAppButton;
