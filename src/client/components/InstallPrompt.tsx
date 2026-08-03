import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (within 24 hours)
    const dismissedAt = localStorage.getItem('install_dismissed_at');
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) {
      setDismissed(true);
      return;
    }

    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // For Chrome/Edge - listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show prompt immediately
    setShowPrompt(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Edge - use native install prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('install_dismissed_at', String(Date.now()));
  };

  if (isInstalled || !showPrompt || dismissed) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-yellow-500 p-6 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-3">
            <span className="text-3xl">⏰</span>
          </div>
          <h2 className="text-xl font-bold">ติดตั้งแอป</h2>
          <p className="text-sm opacity-90 mt-1">Check In/Out & ระบบลา</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-sm text-center mb-4">
            ติดตั้งแอปลงหน้าจอหลักเพื่อ:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 mb-6">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> เปิดใช้งานได้เร็วขึ้น
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> ไม่ต้องพิมพ์ URL ทุกครั้ง
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> ใช้งานเหมือนแอปจริง (ไม่มี address bar)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> รับแจ้งเตือนได้
            </li>
          </ul>

          {/* Instructions based on browser */}
          {isIOS ? (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-800 mb-2">วิธีติดตั้ง (Safari):</p>
              <ol className="text-xs text-gray-600 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-500">1.</span>
                  กดปุ่ม <span className="inline-block bg-gray-200 px-1.5 py-0.5 rounded text-[10px]">⬆️ Share</span> ด้านล่าง
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-500">2.</span>
                  เลื่อนหา <strong>"Add to Home Screen"</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-500">3.</span>
                  กด <strong>"Add"</strong>
                </li>
              </ol>
            </div>
          ) : !deferredPrompt ? (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-800 mb-2">วิธีติดตั้ง:</p>
              <ol className="text-xs text-gray-600 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-500">1.</span>
                  กดเมนู <span className="inline-block bg-gray-200 px-1.5 py-0.5 rounded text-[10px]">⋮</span> มุมขวาบน
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-500">2.</span>
                  เลือก <strong>"Install app"</strong> หรือ <strong>"Add to Home screen"</strong>
                </li>
              </ol>
            </div>
          ) : null}

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors"
              >
                📲 ติดตั้งเลย
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="w-full text-gray-500 hover:text-gray-700 py-2 px-4 text-sm"
            >
              ไว้ทีหลัง (ไม่แสดงอีก 24 ชม.)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
