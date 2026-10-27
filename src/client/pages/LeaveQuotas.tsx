import React, { useEffect, useState } from 'react';

interface LeaveType {
  leave_type_id: number;
  leave_type_name: string;
  default_max_days: number;
  custom_max_days: number | null;
  effective_max_days: number;
}

interface EmployeeQuota {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  department_name: string;
  quotas: LeaveType[];
}

export default function LeaveQuotas() {
  const [employees, setEmployees] = useState<EmployeeQuota[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeQuota | null>(null);
  const [editQuotas, setEditQuotas] = useState<Record<number, string>>({});
  const [year, setYear] = useState(new Date().getFullYear());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Carryover
  const [showCarryover, setShowCarryover] = useState(false);
  const [carryoverYear, setCarryoverYear] = useState(new Date().getFullYear() + 1);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [carryoverRunning, setCarryoverRunning] = useState(false);
  const [carryoverMessage, setCarryoverMessage] = useState('');

  useEffect(() => {
    fetchQuotas();
  }, [year]);

  const fetchQuotas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leave-quotas/all/overview?year=${year}`);
      const data = await res.json();
      setEmployees(data);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    setPreviewLoading(true);
    setCarryoverMessage('');
    try {
      const res = await fetch(`/api/leave-carryover/preview?year=${carryoverYear}`);
      const data = await res.json();
      setPreviewData(data);
    } catch {
      setCarryoverMessage('ไม่สามารถโหลด preview ได้');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRunCarryover = async () => {
    const admin = JSON.parse(localStorage.getItem('user') || '{}');
    if (!window.confirm(`ยืนยันโอนวันลาปี ${carryoverYear} ให้พนักงานทุกคน?\nการดำเนินการนี้จะเขียนทับโควต้าเดิมของปี ${carryoverYear}`)) return;
    setCarryoverRunning(true);
    try {
      const res = await fetch('/api/leave-carryover/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_year: carryoverYear, admin_id: admin.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCarryoverMessage(`✅ ${data.message}`);
      fetchQuotas();
      fetchPreview();
    } catch (err: any) {
      setCarryoverMessage(`❌ ${err.message}`);
    } finally {
      setCarryoverRunning(false);
    }
  };

  const startEdit = (emp: EmployeeQuota) => {
    setEditingEmployee(emp);
    const quotaMap: Record<number, string> = {};
    emp.quotas.forEach((q) => {
      quotaMap[q.leave_type_id] = q.custom_max_days !== null ? String(q.custom_max_days) : '';
    });
    setEditQuotas(quotaMap);
    setMessage('');
  };

  const handleSave = async () => {
    if (!editingEmployee) return;

    const quotas = editingEmployee.quotas.map((q) => ({
      leave_type_id: q.leave_type_id,
      max_days: editQuotas[q.leave_type_id] === '' ? null : Number(editQuotas[q.leave_type_id]),
    }));

    try {
      const res = await fetch('/api/leave-quotas/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: editingEmployee.id,
          quotas,
          year,
        }),
      });
      const data = await res.json();
      setMessage(data.message);
      setEditingEmployee(null);
      fetchQuotas();
    } catch {
      setMessage('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">กำหนดวันลารายบุคคล</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">ปี:</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 px-3 py-1 border rounded-lg text-sm"
          />
        </div>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg">{message}</div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
        <p className="font-medium mb-1">💡 วิธีใช้งาน</p>
        <p>กดปุ่ม "แก้ไข" เพื่อกำหนดวันลาเฉพาะบุคคล ถ้าเว้นว่างจะใช้ค่าเริ่มต้นของระบบ</p>
      </div>

      {/* Carryover Section */}
      <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              🔄 คำนวณโควต้าวันลาอัตโนมัติ
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              คำนวณพักร้อนตามอายุงาน + โอนวันลาปีก่อน (ไม่เกิน 3 วัน) สำหรับพนักงานทุกคน
            </p>
          </div>
          <button
            onClick={() => { setShowCarryover(!showCarryover); if (!showCarryover) fetchPreview(); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {showCarryover ? 'ซ่อน' : '🔄 เปิดใช้งาน'}
          </button>
        </div>

        {showCarryover && (
          <div className="mt-4 space-y-4">
            {/* เงื่อนไขพักร้อน */}
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white rounded p-2 text-center"><p className="font-bold">1 ปี</p><p>6 วัน</p></div>
              <div className="bg-white rounded p-2 text-center"><p className="font-bold">2 ปี</p><p>7 วัน</p></div>
              <div className="bg-white rounded p-2 text-center"><p className="font-bold">3 ปี</p><p>8 วัน</p></div>
              <div className="bg-white rounded p-2 text-center"><p className="font-bold">4 ปี</p><p>9 วัน</p></div>
              <div className="bg-white rounded p-2 text-center col-span-2 sm:col-span-4"><p className="font-bold">5 ปีขึ้นไป</p><p>12 วัน + โอนจากปีก่อน ≤ 3 วัน</p></div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 mb-1">โอนเข้าปี (ค.ศ.)</label>
                <input
                  type="number"
                  value={carryoverYear}
                  onChange={e => { setCarryoverYear(Number(e.target.value)); }}
                  className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <button
                onClick={fetchPreview}
                disabled={previewLoading}
                className="mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-sm"
              >
                {previewLoading ? 'กำลังโหลด...' : '👁 ดูตัวอย่าง'}
              </button>
              <button
                onClick={handleRunCarryover}
                disabled={carryoverRunning || previewData.length === 0}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {carryoverRunning ? 'กำลังโอน...' : `✅ ยืนยันโอนวันลาปี ${carryoverYear}`}
              </button>
            </div>

            {carryoverMessage && (
              <div className={`rounded-lg px-4 py-2 text-sm ${carryoverMessage.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {carryoverMessage}
              </div>
            )}

            {/* Preview Table */}
            {previewData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border rounded-lg overflow-hidden">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-3 py-2 text-left">รหัส</th>
                      <th className="px-3 py-2 text-left">ชื่อ</th>
                      <th className="px-3 py-2 text-center">พักร้อน (อายุงาน)</th>
                      <th className="px-3 py-2 text-center">โอนจากปีก่อน</th>
                      <th className="px-3 py-2 text-center">รวมพักร้อน</th>
                      <th className="px-3 py-2 text-center">ลาป่วย</th>
                      <th className="px-3 py-2 text-center">ลากิจ</th>
                      <th className="px-3 py-2 text-center">ลาคลอด</th>
                      <th className="px-3 py-2 text-center">ลาฌาปนกิจ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.map((emp: any) => {
                      const vacation = emp.quotas.find((q: any) => q.leave_type_name === 'ลาพักร้อน');
                      const sick = emp.quotas.find((q: any) => q.leave_type_name === 'ลาป่วย');
                      const personal = emp.quotas.find((q: any) => q.leave_type_name === 'ลากิจ');
                      const maternity = emp.quotas.find((q: any) => q.leave_type_name === 'ลาคลอด');
                      const funeral = emp.quotas.find((q: any) => q.leave_type_name === 'ลาเพื่อฌาปนกิจ');
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono">{emp.employee_code}</td>
                          <td className="px-3 py-2">{emp.first_name} {emp.last_name}</td>
                          <td className="px-3 py-2 text-center text-blue-700 font-medium">{emp.vacation_days} วัน</td>
                          <td className="px-3 py-2 text-center text-orange-600 font-medium">+{emp.carryover_days} วัน</td>
                          <td className="px-3 py-2 text-center bg-blue-50 font-bold text-blue-800">{vacation?.new_days ?? '-'} วัน</td>
                          <td className="px-3 py-2 text-center">{sick?.new_days ?? '-'}</td>
                          <td className="px-3 py-2 text-center">{personal?.new_days ?? '-'}</td>
                          <td className="px-3 py-2 text-center">{maternity?.new_days ?? '-'}</td>
                          <td className="px-3 py-2 text-center">{funeral?.new_days ?? '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingEmployee && (
        <div className="bg-white rounded-lg shadow-lg border-2 border-green-500 p-6">
          <h3 className="text-lg font-semibold mb-4">
            แก้ไขวันลา: {editingEmployee.first_name} {editingEmployee.last_name} ({editingEmployee.employee_code})
          </h3>
          <p className="text-sm text-gray-500 mb-4">แผนก: {editingEmployee.department_name} | ปี: {year}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {editingEmployee.quotas.map((q) => (
              <div key={q.leave_type_id} className="border rounded-lg p-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {q.leave_type_name}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editQuotas[q.leave_type_id] ?? ''}
                    onChange={(e) =>
                      setEditQuotas({ ...editQuotas, [q.leave_type_id]: e.target.value })
                    }
                    placeholder={`ค่าเริ่มต้น: ${q.default_max_days} วัน`}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-xs text-gray-500">วัน</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  ค่าเริ่มต้น: {q.default_max_days} วัน
                  {editQuotas[q.leave_type_id] === '' && ' (ใช้ค่านี้)'}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
            >
              💾 บันทึก
            </button>
            <button
              onClick={() => setEditingEmployee(null)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Employee List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">รหัส</th>
                <th className="px-4 py-3 text-left">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 text-left">แผนก</th>
                {employees[0]?.quotas.map((q) => (
                  <th key={q.leave_type_id} className="px-3 py-3 text-center text-xs">
                    {q.leave_type_name}
                  </th>
                ))}
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{emp.employee_code}</td>
                  <td className="px-4 py-3">
                    {emp.first_name} {emp.last_name}
                  </td>
                  <td className="px-4 py-3">{emp.department_name}</td>
                  {emp.quotas.map((q) => (
                    <td key={q.leave_type_id} className="px-3 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          q.custom_max_days !== null
                            ? 'bg-yellow-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {q.effective_max_days} วัน
                      </span>
                      {q.custom_max_days !== null && (
                        <span className="block text-xs text-yellow-600 mt-0.5">กำหนดเอง</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => startEdit(emp)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                    >
                      ✏️ แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


