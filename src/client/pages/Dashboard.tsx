import React, { useEffect, useState } from 'react';
import { Employee } from '../App';
import { formatDate } from '../utils/date';

interface DashboardProps {
  user: Employee;
  onUserUpdate: (updates: Partial<Employee>) => void;
}

interface LeaveSummary {
  id: number;
  name: string;
  max_days: number;
  used_days: number;
}

interface RecentLeave {
  id: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  approver_name: string | null;
  approved_at: string | null;
}

export default function Dashboard({ user, onUserUpdate }: DashboardProps) {
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<RecentLeave[]>([]);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTodayAttendance();
    fetchLeaveSummary();
    fetchRecentLeaves();
  }, []);

  const fetchTodayAttendance = async () => {
    const res = await fetch(`/api/attendance/today/${user.id}`);
    const data = await res.json();
    setTodayAttendance(data);
  };

  const fetchLeaveSummary = async () => {
    const res = await fetch(`/api/leave/summary/${user.id}`);
    const data = await res.json();
    setLeaveSummary(data);
  };

  const fetchRecentLeaves = async () => {
    const res = await fetch(`/api/leave/my-requests/${user.id}`);
    const data = await res.json();
    // Show only recent 5 that have been processed (approved/rejected)
    setRecentLeaves(data.filter((r: any) => r.status !== 'pending').slice(0, 5));
  };

  const getStatusInfo = (status: string) => {
    if (status === 'approved') return { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-700', icon: '✅' };
    if (status === 'rejected') return { label: 'ไม่อนุมัติ', color: 'bg-red-100 text-red-700', icon: '❌' };
    return { label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' };
  };

  // Count pending leaves
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    fetch(`/api/leave/my-requests/${user.id}`)
      .then(r => r.json())
      .then(data => setPendingCount(data.filter((r: any) => r.status === 'pending').length))
      .catch(() => {});
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('ไฟล์ใหญ่เกินไป (สูงสุด 2MB)'); return; }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        const res = await fetch(`/api/employees/${user.id}/avatar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: base64 }),
        });
        const data = await res.json();
        if (res.ok) {
          setAvatar(data.avatar);
          onUserUpdate({ avatar: data.avatar });
        }
      } catch {}
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {/* Avatar with edit */}
        <label className="relative cursor-pointer group">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-3 border-green-300 shadow-lg group-hover:opacity-80 transition" />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-yellow-400 rounded-full flex items-center justify-center shadow-lg group-hover:opacity-80 transition">
              <span className="text-3xl">👋</span>
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center border-2 border-white">
            <span className="text-xs text-white">📷</span>
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </label>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            สวัสดี, {user.first_name}
          </h2>
          <p className="text-sm text-gray-500">{user.department_name}</p>
        </div>
        {uploading && <span className="text-xs text-gray-400">กำลังอัปโหลด...</span>}
      </div>

      {/* Notifications */}
      {recentLeaves.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🔔 สถานะการลาล่าสุด</h3>
          <div className="space-y-2">
            {recentLeaves.map((leave) => {
              const info = getStatusInfo(leave.status);
              return (
                <div key={leave.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span>{info.icon}</span>
                    <div>
                      <p className="text-sm text-gray-800">
                        {leave.leave_type_name} ({leave.days} วัน)
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(leave.start_date)} ถึง {formatDate(leave.end_date)}
                        {leave.approver_name && ` • โดย ${leave.approver_name}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${info.color}`}>
                    {info.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending count */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
          ⏳ คุณมีคำขอลาที่รออนุมัติ <strong>{pendingCount}</strong> รายการ
        </div>
      )}

      {/* Today's Status */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">📊</span>
          สถานะวันนี้
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <p className="text-sm text-green-600 font-medium flex items-center gap-1">⏰ Check In</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {todayAttendance?.check_in || '-'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
            <p className="text-sm text-orange-600 font-medium flex items-center gap-1">🏠 Check Out</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">
              {todayAttendance?.check_out || '-'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-600 font-medium flex items-center gap-1">📋 สถานะ</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {todayAttendance ? '✅ มาทำงาน' : '❌ ยังไม่ Check In'}
            </p>
          </div>
        </div>
      </div>

      {/* Leave Summary */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">📅</span>
          สรุปวันลาประจำปี
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {leaveSummary.map((item) => (
            <div key={item.id} className="border rounded-lg p-4">
              <p className="text-sm text-gray-600 font-medium">{item.name}</p>
              <p className="text-xl font-bold text-gray-800">
                {item.used_days} / {item.max_days} วัน
              </p>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 rounded-full h-2"
                  style={{
                    width: `${Math.min((item.used_days / item.max_days) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                คงเหลือ {item.max_days - item.used_days} วัน
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
