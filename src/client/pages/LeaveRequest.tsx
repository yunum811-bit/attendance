import React, { useEffect, useState } from 'react';
import { Employee } from '../App';

interface LeaveRequestProps {
  user: Employee;
}

interface LeaveType {
  id: number;
  name: string;
  max_days: number;
}

interface LeaveRecord {
  id: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  approver_name: string | null;
  reject_reason: string | null;
  created_at: string;
}

export default function LeaveRequest({ user }: LeaveRequestProps) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaveTypes();
    fetchMyRequests();
  }, []);

  const fetchLeaveTypes = async () => {
    const res = await fetch('/api/leave/types');
    const data = await res.json();
    setLeaveTypes(data);
  };

  const fetchMyRequests = async () => {
    const res = await fetch(`/api/leave/my-requests/${user.id}`);
    const data = await res.json();
    setRequests(data);
  };

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const days = calculateDays(form.start_date, form.end_date);
    if (days <= 0) {
      setError('วันที่ไม่ถูกต้อง');
      return;
    }

    try {
      const res = await fetch('/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: user.id,
          leave_type_id: parseInt(form.leave_type_id),
          start_date: form.start_date,
          end_date: form.end_date,
          days,
          reason: form.reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setMessage(data.message);
      setShowForm(false);
      setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
      fetchMyRequests();
    } catch {
      setError('เกิดข้อผิดพลาด');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      pending: 'รออนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ไม่อนุมัติ',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">ขอลา</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
        >
          {showForm ? 'ยกเลิก' : '+ ขอลาใหม่'}
        </button>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg">{message}</div>
      )}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg">{error}</div>}

      {/* Leave Request Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">แบบฟอร์มขอลา</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภทการลา
                </label>
                <select
                  value={form.leave_type_id}
                  onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">-- เลือกประเภท --</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} (สูงสุด {type.max_days} วัน)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จำนวนวัน
                </label>
                <input
                  type="text"
                  value={calculateDays(form.start_date, form.end_date) || '-'}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันที่เริ่ม
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เหตุผล
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="ระบุเหตุผลการลา"
              />
            </div>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
            >
              ส่งคำขอลา
            </button>
          </form>
        </div>
      )}

      {/* Leave History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">ประวัติการลา</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">ประเภท</th>
                <th className="px-4 py-3 text-left">วันที่</th>
                <th className="px-4 py-3 text-left">จำนวนวัน</th>
                <th className="px-4 py-3 text-left">เหตุผล</th>
                <th className="px-4 py-3 text-left">สถานะ</th>
                <th className="px-4 py-3 text-left">ผู้อนุมัติ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{req.leave_type_name}</td>
                  <td className="px-4 py-3">
                    {req.start_date} ถึง {req.end_date}
                  </td>
                  <td className="px-4 py-3">{req.days}</td>
                  <td className="px-4 py-3">{req.reason || '-'}</td>
                  <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                  <td className="px-4 py-3">
                    {req.approver_name || '-'}
                    {req.reject_reason && (
                      <p className="text-xs text-red-500 mt-1">
                        เหตุผล: {req.reject_reason}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    ยังไม่มีประวัติการลา
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


