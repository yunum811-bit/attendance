import React, { useEffect, useState } from 'react';
import { Employee } from '../App';
import Camera from '../components/Camera';
import LocationConfirm from '../components/LocationConfirm';
import { formatDate } from '../utils/date';

interface CheckInOutProps {
  user: Employee;
}

interface AttendanceRecord {
  id: number;
  date: string;
  check_in: string;
  check_out: string | null;
  photo_checkin: string | null;
  photo_checkout: string | null;
  location_checkin: string | null;
  location_checkout: string | null;
  status: string;
}

export default function CheckInOut({ user }: CheckInOutProps) {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraAction, setCameraAction] = useState<'checkin' | 'checkout'>('checkin');
  const [submitting, setSubmitting] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetchToday();
    fetchHistory();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchToday = async () => {
    const res = await fetch(`/api/attendance/today/${user.id}`);
    const data = await res.json();
    setTodayRecord(data);
  };

  const fetchHistory = async () => {
    const res = await fetch(`/api/attendance/history/${user.id}`);
    const data = await res.json();
    setHistory(data);
  };

  const openCamera = (action: 'checkin' | 'checkout') => {
    setMessage('');
    setError('');
    setCameraAction(action);
    if (action === 'checkin') {
      // Check In: ต้องถ่ายรูป
      setShowCamera(true);
    } else {
      // Check Out: ไม่ต้องถ่ายรูป ไปหน้ายืนยันตำแหน่งเลย
      setCapturedPhoto(null);
      setShowLocationConfirm(true);
    }
  };

  // Step 1: Camera captures photo (Check In only)
  const handleCameraCapture = (photoData: string) => {
    setShowCamera(false);
    setCapturedPhoto(photoData);
    // Step 2: Show location confirmation
    setShowLocationConfirm(true);
  };

  const handleCameraCancel = () => {
    setShowCamera(false);
  };

  // Step 3: User confirms location + photo
  const handleLocationConfirm = async (photo: string | null, location: { lat: number; lng: number; accuracy: number } | null) => {
    setShowLocationConfirm(false);
    setCapturedPhoto(null);
    setSubmitting(true);
    setMessage('');
    setError('');

    const endpoint = cameraAction === 'checkin' ? '/api/attendance/checkin' : '/api/attendance/checkout';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: user.id, photo: photo || null, location }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setMessage(data.message + ' เวลา: ' + data.time);
      fetchToday();
      fetchHistory();
    } catch {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationCancel = () => {
    setShowLocationConfirm(false);
    setCapturedPhoto(null);
  };

  const formatLocation = (loc: string | null) => {
    if (!loc) return null;
    const parts = loc.split(',');
    if (parts.length < 2) return null;
    return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]), accuracy: parts[2] ? parseFloat(parts[2]) : 0 };
  };

  const openMap = (loc: string | null) => {
    const coords = formatLocation(loc);
    if (coords) {
      window.open(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`, '_blank');
    }
  };

  const getLocationLabel = (loc: string | null) => {
    const coords = formatLocation(loc);
    if (!coords) return '';
    return coords.accuracy > 0 ? `±${Math.round(coords.accuracy)}m` : '';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Check In / Check Out</h2>

      {/* Step 1: Camera */}
      {showCamera && (
        <Camera onCapture={handleCameraCapture} onCancel={handleCameraCancel} />
      )}

      {/* Step 2: Location Confirmation with Map */}
      {showLocationConfirm && (
        <LocationConfirm
          photo={capturedPhoto}
          action={cameraAction}
          onConfirm={handleLocationConfirm}
          onCancel={handleLocationCancel}
        />
      )}

      {/* Photo Viewer */}
      {viewPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setViewPhoto(null)}
        >
          <div className="relative max-w-lg w-full">
            <img src={viewPhoto} alt="Photo" className="w-full rounded-lg" />
            <button
              onClick={() => setViewPhoto(null)}
              className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Clock & Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10 text-center">
        <p className="text-5xl md:text-6xl font-mono font-bold text-gray-800 mb-2 tracking-tight">
          {currentTime.toLocaleTimeString('th-TH', { hour12: false })}
        </p>
        <p className="text-gray-500 mb-8 text-base md:text-lg">
          {currentTime.toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        {/* Info box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-sm text-yellow-700">
          📷 ถ่ายรูป → 📍 ยืนยันตำแหน่งบนแผนที่ → ✅ กดยืนยัน
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => openCamera('checkin')}
            disabled={!!todayRecord?.check_in || submitting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-5 px-10 rounded-xl text-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            📷 Check In
          </button>
          <button
            onClick={() => openCamera('checkout')}
            disabled={!todayRecord?.check_in || !!todayRecord?.check_out || submitting}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-5 px-10 rounded-xl text-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            📍 Check Out
          </button>
        </div>

        {submitting && (
          <div className="mt-4 text-gray-500">กำลังบันทึก...</div>
        )}

        {message && (
          <div className="mt-4 bg-green-50 text-green-700 p-3 rounded-lg">{message}</div>
        )}
        {error && (
          <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-lg">{error}</div>
        )}

        {/* Today's record with photos & location */}
        {todayRecord && (
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-6">
            <div className="text-center">
              <p className="text-sm text-green-600 font-medium mb-1">เข้างาน: <strong>{todayRecord.check_in}</strong></p>
              {todayRecord.photo_checkin && (
                <img
                  src={todayRecord.photo_checkin}
                  alt="Check In Photo"
                  className="w-24 h-24 object-cover rounded-lg border-2 border-green-200 mx-auto cursor-pointer hover:opacity-80"
                  onClick={() => setViewPhoto(todayRecord.photo_checkin!)}
                />
              )}
              {todayRecord.location_checkin && (
                <button
                  onClick={() => openMap(todayRecord.location_checkin)}
                  className="mt-1 text-xs text-green-600 hover:text-green-800 underline flex items-center justify-center gap-1"
                >
                  📍 ดูตำแหน่ง {getLocationLabel(todayRecord.location_checkin)}
                </button>
              )}
            </div>
            {todayRecord.check_out && (
              <div className="text-center">
                <p className="text-sm text-orange-600 font-medium mb-1">ออกงาน: <strong>{todayRecord.check_out}</strong></p>
                {todayRecord.photo_checkout && (
                  <img
                    src={todayRecord.photo_checkout}
                    alt="Check Out Photo"
                    className="w-24 h-24 object-cover rounded-lg border-2 border-orange-200 mx-auto cursor-pointer hover:opacity-80"
                    onClick={() => setViewPhoto(todayRecord.photo_checkout!)}
                  />
                )}
                {todayRecord.location_checkout && (
                  <button
                    onClick={() => openMap(todayRecord.location_checkout)}
                    className="mt-1 text-xs text-orange-600 hover:text-orange-800 underline flex items-center justify-center gap-1"
                  >
                    📍 ดูตำแหน่ง {getLocationLabel(todayRecord.location_checkout)}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">ประวัติการเข้างาน</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left">วันที่</th>
                <th className="px-3 py-3 text-left">เวลาเข้า</th>
                <th className="px-3 py-3 text-left">เวลาออก</th>
                <th className="px-3 py-3 text-center">รูป</th>
                <th className="px-3 py-3 text-center">📍</th>
                <th className="px-3 py-3 text-left">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">{formatDate(record.date)}</td>
                  <td className="px-3 py-3 text-green-600">{record.check_in}</td>
                  <td className="px-3 py-3 text-orange-600">{record.check_out || '-'}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-center gap-1">
                      {record.photo_checkin && (
                        <img
                          src={record.photo_checkin}
                          alt="In"
                          className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 border border-green-200"
                          onClick={() => setViewPhoto(record.photo_checkin!)}
                        />
                      )}
                      {record.photo_checkout && (
                        <img
                          src={record.photo_checkout}
                          alt="Out"
                          className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 border border-orange-200"
                          onClick={() => setViewPhoto(record.photo_checkout!)}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      {record.location_checkin && (
                        <button
                          onClick={() => openMap(record.location_checkin)}
                          className="text-green-600 hover:text-green-800 text-xs"
                          title="ตำแหน่ง Check In"
                        >
                          🟢
                        </button>
                      )}
                      {record.location_checkout && (
                        <button
                          onClick={() => openMap(record.location_checkout)}
                          className="text-orange-600 hover:text-orange-800 text-xs"
                          title="ตำแหน่ง Check Out"
                        >
                          🟠
                        </button>
                      )}
                      {!record.location_checkin && !record.location_checkout && '-'}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                      {record.status === 'present' ? 'มาทำงาน' : record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    ยังไม่มีประวัติการเข้างาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
