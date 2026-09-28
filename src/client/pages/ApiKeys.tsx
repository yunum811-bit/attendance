import React, { useEffect, useState } from 'react';

interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  permissions: string;
  is_active: number;
  last_used_at: string | null;
  created_by_name: string;
  created_at: string;
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form สร้าง key ใหม่
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState('read');
  const [creating, setCreating] = useState(false);

  // แสดง key ที่เพิ่งสร้าง (แสดงครั้งเดียว)
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);

  const employee = JSON.parse(localStorage.getItem('employee') || '{}');

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/api-keys');
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
      const data = await res.json();
      setKeys(data);
    } catch {
      setError('ไม่สามารถโหลด API Keys ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), permissions, created_by: employee.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      setNewKey(data.key);
      setName('');
      setPermissions('read');
      setShowForm(false);
      fetchKeys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await fetch(`/api/admin/api-keys/${id}/toggle`, { method: 'PATCH' });
      fetchKeys();
    } catch {
      setError('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const handleDelete = async (id: number, keyName: string) => {
    if (!window.confirm(`ลบ API Key "${keyName}" ใช่ไหม?\nหลังลบแล้วโปรแกรมที่ใช้ key นี้จะหยุดทำงาน`)) return;
    try {
      await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' });
      fetchKeys();
    } catch {
      setError('ไม่สามารถลบได้');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการ key สำหรับเชื่อมต่อโปรแกรมภายนอก</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
        >
          <span>+</span> สร้าง Key ใหม่
        </button>
      </div>

      {/* แสดง key ที่เพิ่งสร้าง */}
      {newKey && (
        <div className="mb-6 bg-green-50 border border-green-300 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-700 font-semibold">✓ สร้าง API Key สำเร็จ</span>
          </div>
          <p className="text-sm text-red-600 font-medium mb-3">
            ⚠️ คัดลอก key นี้ไว้ก่อน จะไม่สามารถดูได้อีก
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 break-all">
              {newKey}
            </code>
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                copied ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
            </button>
          </div>
          <button
            onClick={() => setNewKey('')}
            className="mt-3 text-xs text-gray-500 underline"
          >
            ปิด (ฉันบันทึก key แล้ว)
          </button>
        </div>
      )}

      {/* Form สร้าง key */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">สร้าง API Key ใหม่</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                ชื่อ / วัตถุประสงค์ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="เช่น Power Automate, Google Sheets, ระบบ HR"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">สิทธิ์การใช้งาน</label>
              <select
                value={permissions}
                onChange={e => setPermissions(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="read">Read only — ดูข้อมูลได้อย่างเดียว</option>
                <option value="read_write">Read & Write — ดูและแก้ไขข้อมูลได้</option>
              </select>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'กำลังสร้าง...' : 'สร้าง API Key'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* รายการ keys */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
      ) : keys.length === 0 ? (
        <div className="text-center bg-white border border-dashed border-gray-300 rounded-xl py-12 text-gray-400">
          <p className="text-4xl mb-3">🔑</p>
          <p>ยังไม่มี API Key</p>
          <p className="text-sm mt-1">กด "สร้าง Key ใหม่" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <div
              key={k.id}
              className={`bg-white border rounded-xl p-4 shadow-sm ${!k.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{k.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      k.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {k.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      k.permissions === 'read_write'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {k.permissions === 'read_write' ? 'Read & Write' : 'Read only'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      🔑 Key: <code className="font-mono bg-gray-100 px-1 rounded">{k.key_prefix}••••••••</code>
                    </span>
                    <span>👤 สร้างโดย: {k.created_by_name}</span>
                    <span>📅 สร้าง: {formatDate(k.created_at)}</span>
                    <span>⏱ ใช้ล่าสุด: {formatDate(k.last_used_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(k.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                      k.is_active
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {k.is_active ? 'ปิด' : 'เปิด'}
                  </button>
                  <button
                    onClick={() => handleDelete(k.id, k.name)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* วิธีใช้ */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 mb-3">วิธีใช้งาน API Key</h3>
        <p className="text-sm text-gray-600 mb-3">
          ใส่ key ใน HTTP header ทุก request ที่เรียก <code className="bg-gray-200 px-1 rounded">/api/external/*</code>
        </p>
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ตัวอย่าง</p>
          <div className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-x-auto">
            <p># ดูข้อมูลการเช็คอิน</p>
            <p>GET /api/external/attendance?start_date=2026-08-01&end_date=2026-08-31</p>
            <p>X-API-Key: atd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>
            <br />
            <p># ดูข้อมูลการลา</p>
            <p>GET /api/external/leave?status=approved</p>
            <p>X-API-Key: atd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="bg-white border rounded-lg p-2">
            <p className="font-medium text-gray-700 mb-1">Endpoints ที่ใช้ได้</p>
            <p>• GET /api/external/attendance</p>
            <p>• GET /api/external/leave</p>
          </div>
          <div className="bg-white border rounded-lg p-2">
            <p className="font-medium text-gray-700 mb-1">Query Parameters</p>
            <p>• employee_id, department_id</p>
            <p>• start_date, end_date (YYYY-MM-DD)</p>
            <p>• status (approved/pending/rejected)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
