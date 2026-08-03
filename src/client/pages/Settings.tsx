import React, { useEffect, useState, useRef } from 'react';

export default function Settings() {
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [workStart, setWorkStart] = useState('08:30');
  const [workEnd, setWorkEnd] = useState('17:30');
  const [breakStart, setBreakStart] = useState('12:00');
  const [breakEnd, setBreakEnd] = useState('13:00');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setCompanyName(data.company_name || '');
      setLogoUrl(data.company_logo || '');
      setLogoPreview(data.company_logo || '');
      setWorkStart(data.work_start || '08:30');
      setWorkEnd(data.work_end || '17:30');
      setBreakStart(data.break_start || '12:00');
      setBreakEnd(data.break_end || '13:00');
    } catch {
      setError('ไม่สามารถโหลดการตั้งค่าได้');
    }
  };

  const handleSaveName = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/settings/company_name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: companyName }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('ไฟล์ใหญ่เกินไป (สูงสุด 2MB)');
      return;
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('รองรับเฉพาะไฟล์ PNG, JPG, GIF, SVG');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!logoPreview || logoPreview === logoUrl) {
      setError('กรุณาเลือกไฟล์โลโก้ใหม่');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: logoPreview }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setLogoUrl(data.logo_url);
        setLogoPreview(data.logo_url);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!logoUrl) return;

    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/settings/logo', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setLogoUrl('');
        setLogoPreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">ตั้งค่าบริษัท</h2>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg">{error}</div>
      )}

      {/* Company Name */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">ชื่อบริษัท</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="ระบุชื่อบริษัท"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            onClick={handleSaveName}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg whitespace-nowrap"
          >
            {saving ? 'กำลังบันทึก...' : '💾 บันทึกชื่อ'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          ชื่อบริษัทจะแสดงที่ส่วนหัวของระบบและหน้า Login
        </p>
      </div>

      {/* Company Logo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">โลโก้บริษัท</h3>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Preview */}
          <div className="flex-shrink-0">
            <p className="text-sm text-gray-600 mb-2">ตัวอย่าง:</p>
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company Logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-gray-400 text-sm text-center px-2">ยังไม่มีโลโก้</span>
              )}
            </div>
          </div>

          {/* Upload */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เลือกไฟล์โลโก้
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/svg+xml"
                onChange={handleLogoSelect}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-800 hover:file:bg-yellow-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                รองรับ PNG, JPG, GIF, SVG (สูงสุด 2MB) แนะนำขนาด 200x200px
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUploadLogo}
                disabled={saving || (!logoPreview || logoPreview === logoUrl)}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm"
              >
                📤 อัปโหลดโลโก้
              </button>
              {logoUrl && (
                <button
                  onClick={handleDeleteLogo}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm"
                >
                  🗑️ ลบโลโก้
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview how it looks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">ตัวอย่างการแสดงผล</h3>
        <div className="bg-green-600 text-white rounded-lg p-4">
          <div className="flex items-center gap-3">
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Logo"
                className="w-10 h-10 rounded bg-white p-1 object-contain"
              />
            )}
            <div>
              <h4 className="font-bold">{companyName || 'ชื่อบริษัท'}</h4>
              <p className="text-xs text-green-200">ระบบ Check In/Out & ลา</p>
            </div>
          </div>
        </div>
      </div>

      {/* Work Hours */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🕐 เวลาทำงาน</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเข้างาน</label>
            <input
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเลิกงาน</label>
            <input
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">พักเที่ยงเริ่ม</label>
            <input
              type="time"
              value={breakStart}
              onChange={(e) => setBreakStart(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">พักเที่ยงสิ้นสุด</label>
            <input
              type="time"
              value={breakEnd}
              onChange={(e) => setBreakEnd(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          ปัจจุบัน: <strong>{workStart} - {workEnd} น.</strong> (พัก {breakStart} - {breakEnd})
        </p>
        <button
          onClick={async () => {
            setSaving(true); setMessage('');
            await fetch('/api/settings/work_start', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: workStart }) });
            await fetch('/api/settings/work_end', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: workEnd }) });
            await fetch('/api/settings/break_start', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: breakStart }) });
            await fetch('/api/settings/break_end', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: breakEnd }) });
            setMessage('บันทึกเวลาทำงานสำเร็จ'); setSaving(false);
          }}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
        >
          💾 บันทึกเวลาทำงาน
        </button>
      </div>
    </div>
  );
}


