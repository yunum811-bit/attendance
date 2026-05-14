import React, { useEffect, useState, useRef } from 'react';

interface LocationConfirmProps {
  photo: string | null;
  action: 'checkin' | 'checkout';
  onConfirm: (photo: string | null, location: { lat: number; lng: number; accuracy: number } | null) => void;
  onCancel: () => void;
}

export default function LocationConfirm({ photo, action, onConfirm, onCancel }: LocationConfirmProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState('📍 กำลังหาตำแหน่ง...');
  const [errorDetail, setErrorDetail] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    startLocation();
    return () => {
      mountedRef.current = false;
      stopWatching();
    };
  }, [retryCount]);

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('❌ อุปกรณ์ไม่รองรับ GPS');
      setErrorDetail('เบราว์เซอร์นี้ไม่รองรับ Geolocation API');
      return;
    }

    // Check if HTTPS (required for geolocation on mobile)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setLocationStatus('⚠️ ต้องใช้ HTTPS เพื่อเข้าถึง GPS');
      setErrorDetail('กรุณาเปิดเว็บผ่าน https:// เพื่อใช้งาน GPS บนมือถือ');
      return;
    }

    setLocationStatus('📍 กำลังหาตำแหน่ง...');
    setErrorDetail('');

    // Strategy: Try getCurrentPosition first (faster), then watchPosition for better accuracy
    // Step 1: Quick position (low accuracy OK)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        const { latitude, longitude, accuracy } = position.coords;
        const loc = { lat: latitude, lng: longitude, accuracy };
        setLocation(loc);

        if (accuracy <= 50) {
          setLocationStatus(`✅ ตำแหน่งพร้อม (±${Math.round(accuracy)}m)`);
        } else {
          setLocationStatus(`📍 ความแม่นยำ ±${Math.round(accuracy)}m (ต้อง ≤ 50m) กำลังปรับ...`);
        }
        improveAccuracy(loc);
      },
      (err) => {
        if (!mountedRef.current) return;
        tryWatchFallback(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Accept cached only if < 5 seconds old
      }
    );
  };

  const improveAccuracy = (initialLoc: { lat: number; lng: number; accuracy: number }) => {
    let bestAccuracy = initialLoc.accuracy;

    // Stop after 25 seconds of improvement
    timeoutRef.current = setTimeout(() => {
      stopWatching();
      if (mountedRef.current && bestAccuracy > 50) {
        setLocationStatus(`⚠️ ความแม่นยำ ±${Math.round(bestAccuracy)}m (ไม่ถึง 50m)`);
      }
    }, 25000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!mountedRef.current) return;
        const { latitude, longitude, accuracy } = position.coords;

        if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy;
          const loc = { lat: latitude, lng: longitude, accuracy };
          setLocation(loc);

          if (accuracy <= 50) {
            setLocationStatus(`✅ ตำแหน่งพร้อม (±${Math.round(accuracy)}m)`);
            // Good enough, stop watching
            stopWatching();
          } else {
            setLocationStatus(`📍 ความแม่นยำ ±${Math.round(accuracy)}m (ต้อง ≤ 50m) กำลังปรับ...`);
          }
        }
      },
      () => {
        // Ignore errors during improvement - we already have a position
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const tryWatchFallback = (originalError: GeolocationPositionError) => {
    // Try with enableHighAccuracy: false (uses WiFi/Cell tower)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        const { latitude, longitude, accuracy } = position.coords;
        const loc = { lat: latitude, lng: longitude, accuracy };
        setLocation(loc);
        setLocationStatus(`✅ พบตำแหน่ง (±${Math.round(accuracy)}m) — ใช้ WiFi/เครือข่าย`);
      },
      (err) => {
        if (!mountedRef.current) return;
        // Both methods failed
        handleLocationError(originalError);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000, // Accept cached up to 1 minute
      }
    );
  };

  const handleLocationError = (err: GeolocationPositionError) => {
    switch (err.code) {
      case 1: // PERMISSION_DENIED
        setLocationStatus('❌ ไม่ได้รับอนุญาตเข้าถึงตำแหน่ง');
        setErrorDetail('กรุณาเปิดการอนุญาต Location ในการตั้งค่าเบราว์เซอร์\n\n• Android Chrome: กดไอคอนแม่กุญแจ → Site settings → Location → Allow\n• iOS Safari: Settings → Safari → Location → Allow');
        break;
      case 2: // POSITION_UNAVAILABLE
        setLocationStatus('❌ ไม่สามารถหาตำแหน่งได้');
        setErrorDetail('กรุณาตรวจสอบ:\n• เปิด GPS/Location Services ในการตั้งค่ามือถือ\n• อยู่ในที่ที่มีสัญญาณ GPS (กลางแจ้ง)\n• ลองปิด-เปิด GPS แล้วกดลองใหม่');
        break;
      case 3: // TIMEOUT
        setLocationStatus('⏱️ หาตำแหน่งไม่ทันเวลา');
        setErrorDetail('GPS ใช้เวลานานเกินไป กรุณา:\n• ย้ายไปที่โล่ง/ใกล้หน้าต่าง\n• รอสักครู่แล้วกดลองใหม่');
        break;
    }
  };

  const handleRetry = () => {
    stopWatching();
    setLocation(null);
    setErrorDetail('');
    setRetryCount((c) => c + 1);
  };

  const handleConfirm = () => {
    stopWatching();
    onConfirm(photo, location);
  };

  const handleCancel = () => {
    stopWatching();
    onCancel();
  };

  const mapUrl = location
    ? `https://maps.google.com/maps?q=${location.lat},${location.lng}&z=17&output=embed`
    : '';

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 text-white px-4 py-3 flex justify-between items-center safe-area-top">
        <button onClick={handleCancel} className="text-white text-sm px-3 py-1 min-h-[44px]">
          ✕ ยกเลิก
        </button>
        <span className="text-sm font-medium">
          {action === 'checkin' ? '📍 ยืนยัน Check In' : '📍 ยืนยัน Check Out'}
        </span>
        <span className="w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Photo preview */}
        {photo && (
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700 mb-2">📷 รูปถ่าย</p>
            <img src={photo} alt="Captured" className="w-full max-h-40 object-contain rounded-lg" />
          </div>
        )}

        {/* Map / Location */}
        <div className="bg-white rounded-lg p-3">
          <p className="text-sm font-medium text-gray-700 mb-2">📍 ตำแหน่งปัจจุบัน</p>
          <p className={`text-sm mb-2 font-medium ${location ? 'text-green-600' : errorDetail ? 'text-red-600' : 'text-yellow-600'}`}>
            {locationStatus}
          </p>

          {/* Error detail */}
          {errorDetail && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-red-700 whitespace-pre-line">{errorDetail}</p>
              <button
                onClick={handleRetry}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                🔄 ลองใหม่
              </button>
            </div>
          )}

          {/* Map display */}
          {location ? (
            <div className="space-y-2">
              <div className="w-full h-48 md:h-64 rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  src={mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Location Map"
                />
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 rounded p-2">
                <span>Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</span>
                <span className={`font-semibold ${location.accuracy <= 50 ? 'text-green-600' : 'text-yellow-600'}`}>±{Math.round(location.accuracy)}m</span>
              </div>
            </div>
          ) : !errorDetail ? (
            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full mx-auto mb-3" style={{ borderWidth: '3px' }} />
                <p className="text-sm text-gray-600 font-medium">กำลังค้นหาตำแหน่ง GPS...</p>
                <p className="text-xs text-gray-400 mt-1">กรุณารอสักครู่</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Confirm buttons */}
      <div className="bg-black/80 px-4 py-4 safe-area-bottom">
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={handleCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-full text-sm font-medium min-h-[48px]"
          >
            ❌ ยกเลิก
          </button>
          <button
            onClick={handleRetry}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-3 rounded-full text-sm font-medium min-h-[48px]"
          >
            🔄 ลองใหม่
          </button>
          <button
            onClick={handleConfirm}
            disabled={!location}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-7 py-3 rounded-full text-sm font-medium min-h-[48px]"
          >
            ✅ ยืนยัน {action === 'checkin' ? 'Check In' : 'Check Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
