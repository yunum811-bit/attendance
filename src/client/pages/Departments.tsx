import React, { useEffect, useState } from 'react';

interface Department {
  id: number;
  name: string;
  employee_count: number;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const data = await res.json();
    setDepartments(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!name.trim()) { setError('กรุณาระบุชื่อแผนก'); return; }

    const url = editId ? `/api/departments/${editId}` : '/api/departments';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMessage(data.message);
      setShowForm(false);
      setEditId(null);
      setName('');
      fetchDepartments();
    } catch {
      setError('เกิดข้อผิดพลาด');
    }
  };

  const startEdit = (dept: Department) => {
    setEditId(dept.id);
    setName(dept.name);
    setShowForm(true);
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`ยืนยันลบแผนก "${dept.name}"?`)) return;
    const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setError(data.error); } else { setMessage(data.message); fetchDepartments(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">จัดการแผนก</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setName(''); }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
        >
          {showForm ? 'ยกเลิก' : '+ เพิ่มแผนก'}
        </button>
      </div>

      {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg">{message}</div>}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg">{error}</div>}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">{editId ? '✏️ แก้ไข' : '+ เพิ่ม'}แผนก</h3>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อแผนก เช่น ฝ่ายบัญชี"
              className="flex-1 px-4 py-2 border rounded-lg"
              autoFocus
              required
            />
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg whitespace-nowrap">
              💾 {editId ? 'บันทึก' : 'เพิ่ม'}
            </button>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">แผนกทั้งหมด ({departments.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">ชื่อแผนก</th>
                <th className="px-4 py-3 text-center">จำนวนพนักงาน</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{dept.name}</td>
                  <td className="px-4 py-3 text-center">{dept.employee_count} คน</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => startEdit(dept)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                      >
                        ✏️ แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(dept)}
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
