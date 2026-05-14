import React, { useEffect, useState } from 'react';

interface LeaveType {
  id: number;
  name: string;
  max_days: number;
  description: string;
}

export default function LeaveTypes() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', max_days: '', description: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    const res = await fetch('/api/leave/types');
    const data = await res.json();
    setTypes(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const url = editId ? `/api/leave/types/${editId}` : '/api/leave/types';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          max_days: parseInt(form.max_days),
          description: form.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setMessage(data.message);
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', max_days: '', description: '' });
      fetchTypes();
    } catch {
      setError('เกิดข้อผิดพลาด');
    }
  };

  const startEdit = (t: LeaveType) => {
    setEditId(t.id);
    setForm({ name: t.name, max_days: String(t.max_days), description: t.description || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`ยืนยันลบประเภท "${name}"?`)) return;
    const res = await fetch(`/api/leave/types/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setMessage(data.message);
      fetchTypes();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">ประเภทการลา</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', max_days: '', description: '' }); }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          {showForm ? 'ยกเลิก' : '+ เพิ่มประเภทการลา'}
        </button>
      </div>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg">{error}</div>}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{editId ? '✏️ แก้ไข' : '+ เพิ่ม'}ประเภทการลา</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อประเภท</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="เช่น ลาป่วย"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนวันสูงสุด/ปี</label>
                <input
                  type="number"
                  value={form.max_days}
                  onChange={(e) => setForm({ ...form, max_days: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="เช่น 30"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="รายละเอียดเพิ่มเติม"
                />
              </div>
            </div>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">
              💾 {editId ? 'บันทึกการแก้ไข' : 'เพิ่มประเภทการลา'}
            </button>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">ประเภทการลาทั้งหมด ({types.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">ชื่อ</th>
                <th className="px-4 py-3 text-center">วันสูงสุด/ปี</th>
                <th className="px-4 py-3 text-left">คำอธิบาย</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {types.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-center">{t.max_days} วัน</td>
                  <td className="px-4 py-3 text-gray-500">{t.description || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => startEdit(t)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                      >
                        ✏️ แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                      >
                        🗑️ ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
