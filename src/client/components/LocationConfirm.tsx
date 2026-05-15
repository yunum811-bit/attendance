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

    // ใช้ watchPosition ตั้งแต่แรก เพื่อได้ GPS จริง (ไม่ใช่ WiFi/cached)
    let bestAccuracy = Infinity;
    let updateCount = 0;

    // Timeout: หยุดหลัง 20 วินาที
    timeoutRef.current = setTimeout(() => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (!location && mountedRef.current) {
        setLocationStatus('⚠️ ไม่สามารถหาตำแหน่งได้');
        setErrorDetail('กรุณาเปิด GPS/Location Services แล้วลองใหม่');
      }
    }, 20000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!mountedRef.current) return;
        const { latitude, longitude, accuracy } = position.coords;
        updateCount++;

        // เอาค่าที่ดีที่สุด (accuracy ต่ำสุด)
        if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy;
          const loc = { lat: latitude, lng: longitude, accuracy };
          setLocation(loc);

          if (accuracy <= 30) {
            setLocationStatus(`✅ ตำแหน่งแม่นยำ (±${Math.round(accuracy)}m)`);
            // ดีมาก หยุดได้
            stopWatching();
          } else if (accuracy <= 100) {
            setLocationStatus(`✅ พบตำแหน่ง (±${Math.round(accuracy)}m)`);
            // ยังพอรับได้ แต่ยังหาต่อ
          } else {
            setLocationStatus(`📍 กำลังปรับตำแหน่ง... (±${Math.round(accuracy)}m)`);
          }
        }

        // หลังได้ 5 ค่าแล้ว หยุดได้ (ใช้ค่าที่ดีที่สุด)
        if (updateCount >= 5 && bestAccuracy <= 200) {
          stopWatching();
        }
      },
      (err) => {
        if (!mountedRef.current) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (err.code === 1) {
          setLocationStatus('❌ ไม่ได้รับอนุญาตเข้าถึงตำแหน่ง');
          setErrorDetail('กรุณาเปิดการอนุญาต Location ในการตั้งค่าเบราว์เซอร์');
        } else if (err.code === 2) {
          setLocationStatus('❌ ไม่สามารถหาตำแหน่งได้');
          setErrorDetail('กรุณาเปิด GPS/Location Services ในการตั้งค่ามือถือ');
        } else {
          setLocationStatus('⏱️ หาตำแหน่งไม่ทัน');
          setErrorDetail('กรุณาลองใหม่ในที่โล่ง');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0, // ไม่ใช้ค่า cached เลย — ต้องหาใหม่ทุกครั้ง
      }
    );
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
              {/* ปุ่มหาตำแหน่งใหม่ */}
              <button
                onClick={handleRetry}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg text-sm font-medium"
              >
                📍 ตำแหน่งไม่ตรง? กดที่นี่เพื่อหาตำแหน่งใหม่
              </button>
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
