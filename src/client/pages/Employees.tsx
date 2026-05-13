import React, { useEffect, useState } from 'react';

interface EmployeeData {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: number;
  department_name: string;
  role: string;
}

interface Department {
  id: number;
  name: string;
}

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employee_code: '',
    first_name: '',
    last_name: '',
    email: '',
    department_id: '',
    role: 'employee',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordModal, setPasswordModal] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(data);
  };

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const data = await res.json();
    setDepartments(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          department_id: parseInt(form.department_id),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      // If password was set, update it
      if (form.password && data.id) {
        await fetch(`/api/employees/${data.id}/set-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: form.password }),
        });
      }

      setMessage(data.message);
      setShowForm(false);
      setForm({
        employee_code: '',
        first_name: '',
        last_name: '',
        email: '',
        department_id: '',
        role: 'employee',
        password: '',
      });
      fetchEmployees();
    } catch {
      setError('เกิดข้อผิดพลาด');
    }
  };

  const handleSetPassword = async () => {
    if (!passwordModal) return;
    if (!newPassword || newPassword.length < 4) {
      setError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    try {
      const res = await fetch(`/api/employees/${passwordModal.id}/set-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setMessage(`ตั้งรหัสผ่านใหม่ให้ ${passwordModal.name} สำเร็จ`);
      setPasswordModal(null);
      setNewPassword('');
    } catch {
      setError('เกิดข้อผิดพลาด');
    }
  };

  const handleResetPassword = async (emp: EmployeeData) => {
    if (!confirm(`ยืนยันรีเซ็ตรหัสผ่านของ ${emp.first_name} ${emp.last_name} เป็น "1234"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/employees/${emp.id}/reset-password`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setMessage(`รีเซ็ตรหัสผ่านของ ${emp.first_name} ${emp.last_name} เป็น "1234" สำเร็จ`);
    } catch {
      setError('เกิดข้อผิดพลาด');
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      md: 'bg-red-100 text-red-700',
      admin: 'bg-purple-100 text-purple-700',
      manager: 'bg-yellow-100 text-yellow-700',
      manager_admin: 'bg-gradient-to-r from-yellow-100 to-purple-100 text-purple-700',
      employee: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      md: 'MD',
      admin: 'ผู้ดูแลระบบ',
      manager: 'หัวหน้าแผนก',
      manager_admin: 'หัวหน้าแผนก+Admin',
      employee: 'พนักงาน',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[role] || ''}`}>
        {labels[role] || role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">จัดการพนักงาน</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
        >
          {showForm ? 'ยกเลิก' : '+ เพิ่มพนักงาน'}
        </button>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg">{message}</div>
      )}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg">{error}</div>}

      {/* Password Modal */}
      {passwordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              🔑 ตั้งรหัสผ่านใหม่
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              พนักงาน: <strong>{passwordModal.name}</strong>
            </p>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="รหัสผ่านใหม่ (อย่างน้อย 4 ตัว)"
              className="w-full px-4 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setPasswordModal(null); setNewPassword(''); }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSetPassword}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
              >
                💾 บันทึกรหัสผ่าน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">เพิ่มพนักงานใหม่</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสพนักงาน
                </label>
                <input
                  type="text"
                  value={form.employee_code}
                  onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="เช่น EMP006"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="email@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">แผนก</label>
                <select
                  value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">-- เลือกแผนก --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">บทบาท</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="employee">พนักงาน</option>
                  <option value="manager">หัวหน้าแผนก</option>
                  <option value="manager_admin">หัวหน้าแผนก+ผู้ดูแลระบบ</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                  <option value="md">กรรมการผู้จัดการ (MD)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่าน
                </label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="ถ้าไม่ระบุจะใช้ 1234"
                />
                <p className="text-xs text-gray-500 mt-1">ค่าเริ่มต้น: 1234</p>
              </div>
            </div>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
            >
              บันทึก
            </button>
          </form>
        </div>
      )}

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">รายชื่อพนักงาน ({employees.length} คน)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">รหัส</th>
                <th className="px-4 py-3 text-left">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 text-left">อีเมล</th>
                <th className="px-4 py-3 text-left">แผนก</th>
                <th className="px-4 py-3 text-left">บทบาท</th>
                <th className="px-4 py-3 text-center">รหัสผ่าน</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{emp.employee_code}</td>
                  <td className="px-4 py-3">
                    {emp.first_name} {emp.last_name}
                  </td>
                  <td className="px-4 py-3">{emp.email || '-'}</td>
                  <td className="px-4 py-3">{emp.department_name}</td>
                  <td className="px-4 py-3">{getRoleBadge(emp.role)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => setPasswordModal({ id: emp.id, name: `${emp.first_name} ${emp.last_name}` })}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                        title="ตั้งรหัสผ่านใหม่"
                      >
                        🔑 ตั้งค่า
                      </button>
                      <button
                        onClick={() => handleResetPassword(emp)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs"
                        title="รีเซ็ตเป็น 1234"
                      >
                        🔄 Reset
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
