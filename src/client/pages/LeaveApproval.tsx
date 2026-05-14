import React, { useEffect, useState } from 'react';
import { Employee } from '../App';
import { isAdmin, isManagerOrAdmin, isMD } from '../utils/roles';
import { formatDate } from '../utils/date';

interface LeaveApprovalProps {
  user: Employee;
}

interface PendingRequest {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  requester_role: string;
  department_name?: string;
  created_at: string;
}

export default function LeaveApproval({ user }: LeaveApprovalProps) {
  const [employeeRequests, setEmployeeRequests] = useState<PendingRequest[]>([]);
  const [managerRequests, setManagerRequests] = useState<PendingRequest[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    if (isAdmin(user.role) || isMD(user.role)) {
      // Admin/MD: ดึงคำขอจากพนักงานทุกแผนก (รวมแผนกที่ไม่มีหัวหน้า)
      const res = await fetch('/api/leave/pending-all-employees');
      const data = await res.json();
      setEmployeeRequests(data);
    } else if (isManagerOrAdmin(user.role)) {
      // Manager: ดึงเฉพาะพนักงานในแผนกตัวเอง
      const res = await fetch(`/api/leave/pending-for-manager/${user.department_id}`);
      const data = await res.json();
      setEmployeeRequests(data);
    }

    // MD/Admin: fetch pending from managers
    if (isAdmin(user.role) || isMD(user.role)) {
      const res = await fetch('/api/leave/pending-for-admin');
      const data = await res.json();
      setManagerRequests(data);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`/api/leave/approve/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage('❌ ' + data.error);
        return;
      }
      setMessage('✅ ' + data.message);
      fetchPending();
    } catch {
      setMessage('เกิดข้อผิดพลาด');
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      setMessage('กรุณาระบุเหตุผลที่ปฏิเสธ');
      return;
    }
    try {
      const res = await fetch(`/api/leave/reject/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: user.id, reject_reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage('❌ ' + data.error);
        return;
      }
      setMessage('✅ ' + data.message);
      setRejectingId(null);
      setRejectReason('');
      fetchPending();
    } catch {
      setMessage('เกิดข้อผิดพลาด');
    }
  };

  const renderRequestCard = (req: PendingRequest, showDepartment: boolean = false) => (
    <div key={req.id} className="border rounded-lg p-4">
      <div className="flex flex-col md:flex-row justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-800">
              {req.first_name} {req.last_name} ({req.employee_code})
            </p>
            <span className={`text-xs px-2 py-0.5 rounded ${
              req.requester_role === 'manager' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {req.requester_role === 'manager' ? 'หัวหน้าแผนก' : 'พนักงาน'}
            </span>
          </div>
          {showDepartment && req.department_name && (
            <p className="text-xs text-green-700 mt-1">แผนก: {req.department_name}</p>
          )}
          {!showDepartment && req.department_name && req.department_name !== user.department_name && (
            <p className="text-xs text-orange-600 mt-1">แผนก: {req.department_name} (ไม่มีหัวหน้าแผนก)</p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">{req.leave_type_name}</span> |{' '}
            {formatDate(req.start_date)} ถึง {formatDate(req.end_date)} ({req.days} วัน)
          </p>
          {req.reason && (
            <p className="text-sm text-gray-500 mt-1">เหตุผล: {req.reason}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            ส่งเมื่อ: {new Date(req.created_at).toLocaleString('th-TH')}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => handleApprove(req.id)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
          >
            ✅ อนุมัติ
          </button>
          <button
            onClick={() => setRejectingId(req.id)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
          >
            ❌ ปฏิเสธ
          </button>
        </div>
      </div>

      {rejectingId === req.id && (
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="ระบุเหตุผลที่ปฏิเสธ"
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <button
            onClick={() => handleReject(req.id)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm whitespace-nowrap"
          >
            ยืนยันปฏิเสธ
          </button>
          <button
            onClick={() => {
              setRejectingId(null);
              setRejectReason('');
            }}
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm whitespace-nowrap"
          >
            ยกเลิก
          </button>
        </div>
      )}
    </div>
  );

  const totalPending = employeeRequests.length + managerRequests.length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">อนุมัติการลา</h2>

      {/* Approval hierarchy info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
        <p className="font-medium mb-1">📋 ลำดับการอนุมัติ</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>พนักงาน (Employee) ขอลา → <strong>หัวหน้าแผนก (Manager)</strong> อนุมัติ</li>
          <li>พนักงานที่ไม่มีหัวหน้าแผนก → <strong>MD / Admin</strong> อนุมัติ</li>
          <li>หัวหน้าแผนก (Manager) ขอลา → <strong>MD / ผู้ดูแลระบบ (Admin)</strong> อนุมัติ</li>
        </ul>
      </div>

      {message && (
        <div className="bg-green-50 text-green-800 p-3 rounded-lg">{message}</div>
      )}

      {/* Section: Employee requests (for Manager/Admin) */}
      {(isManagerOrAdmin(user.role)) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-1">
            คำขอลาจากพนักงาน ({employeeRequests.length})
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {isAdmin(user.role) || isMD(user.role)
              ? 'คำขอลาจากพนักงานทุกแผนก'
              : `แผนก: ${user.department_name}`
            }
          </p>

          {employeeRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-6">ไม่มีคำขอลาจากพนักงานที่รออนุมัติ</p>
          ) : (
            <div className="space-y-4">
              {employeeRequests.map((req) => renderRequestCard(req))}
            </div>
          )}
        </div>
      )}

      {/* Section: Manager requests (for MD/Admin) */}
      {(isAdmin(user.role) || isMD(user.role)) && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold">
              คำขอลาจากหัวหน้าแผนก ({managerRequests.length})
            </h3>
            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">
              MD / Admin Only
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            เฉพาะ MD หรือ Admin เท่านั้นที่อนุมัติการลาของหัวหน้าแผนกได้
          </p>

          {managerRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-6">ไม่มีคำขอลาจากหัวหน้าแผนกที่รออนุมัติ</p>
          ) : (
            <div className="space-y-4">
              {managerRequests.map((req) => renderRequestCard(req, true))}
            </div>
          )}
        </div>
      )}

      {totalPending === 0 && (
        <div className="text-center py-4 text-gray-500">
          🎉 ไม่มีคำขอลาที่รออนุมัติ
        </div>
      )}
    </div>
  );
}

