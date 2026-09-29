import React, { useEffect, useState } from 'react';
import { Employee } from '../App';
import { isAdmin, isManagerOrAdmin, isMD } from '../utils/roles';

interface WorkLogApprovalProps {
  user: Employee;
}

interface WorkLogEntry {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  department_name: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  status: string;
  acknowledged_by: number | null;
  acknowledged_by_name: string | null;
  acknowledged_at: string | null;
}

const STATUS_OPTIONS = [
  { value: 'completed',   label: 'ดำเนินการเสร็จสิ้นทั้งหมด',             color: 'bg-green-100 text-green-700' },
  { value: 'in_progress', label: 'อยู่ระหว่างดำเนินการ',                  color: 'bg-blue-100 text-blue-700' },
  { value: 'waiting',     label: 'รอข้อมูล/การดำเนินการจากหน่วยงานอื่น', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'cannot_do',   label: 'ไม่สามารถดำเนินการได้',                 color: 'bg-red-100 text-red-700' },
];

const getStatusStyle = (status: string) =>
  STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-600';

const getStatusLabel = (status: string) =>
  STATUS_OPTIONS.find(s => s.value === status)?.label || status;

export default function WorkLogApproval({ user }: WorkLogApprovalProps) {
  const [logs, setLogs] = useState<WorkLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [acknowledging, setAcknowledging] = useState(false);

  // Filter
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterAck, setFilterAck] = useState<'all' | 'pending' | 'acknowledged'>('pending');
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchLogs();
    setSelected([]);
  }, [filterStart, filterEnd, filterDept, filterAck]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(data);
    } catch {}
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = '/api/work-logs?';
      if (filterStart) url += `start_date=${filterStart}&`;
      if (filterEnd)   url += `end_date=${filterEnd}&`;

      // admin/MD เห็นทั้งหมด — ถ้าเลือก filter แผนกก็ใช้ตัวกรองนั้น
      // manager เห็นเฉพาะแผนกตัวเอง — ไม่สามารถเปลี่ยนได้
      if (isAdmin(user.role) || isMD(user.role)) {
        if (filterDept) url += `department_id=${filterDept}&`;
      } else {
        // manager: บังคับ filter แผนกตัวเอง
        url += `department_id=${user.department_id}&`;
      }

      const res = await fetch(url);
      let data: WorkLogEntry[] = await res.json();

      // filter acknowledged ฝั่ง client
      if (filterAck === 'pending')      data = data.filter(l => !l.acknowledged_by);
      if (filterAck === 'acknowledged') data = data.filter(l => !!l.acknowledged_by);

      setLogs(data);
    } catch {
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      const res = await fetch(`/api/work-logs/${id}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged_by: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('รับทราบแล้ว');
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkAcknowledge = async () => {
    if (!selected.length) return;
    if (!window.confirm(`รับทราบ ${selected.length} รายการที่เลือกใช่ไหม?`)) return;
    setAcknowledging(true);
    try {
      const res = await fetch('/api/work-logs/acknowledge-bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected, acknowledged_by: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message);
      setSelected([]);
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAcknowledging(false);
    }
  };

  const handleExport = () => {
    let url = '/api/work-logs/export/excel?';
    if (filterStart) url += `start_date=${filterStart}&`;
    if (filterEnd)   url += `end_date=${filterEnd}&`;
    if (isAdmin(user.role) || isMD(user.role)) {
      if (filterDept) url += `department_id=${filterDept}&`;
    } else {
      url += `department_id=${user.department_id}&`;
    }
    window.open(url, '_blank');
  };

  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pending = logs.filter(l => !l.acknowledged_by).map(l => l.id);
    if (selected.length === pending.length) {
      setSelected([]);
    } else {
      setSelected(pending);
    }
  };

  const pendingLogs = logs.filter(l => !l.acknowledged_by);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

  // Group by employee
  const grouped = logs.reduce<Record<string, WorkLogEntry[]>>((acc, log) => {
    const key = `${log.employee_id}_${log.employee_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">✅ รับทราบบันทึกการทำงาน</h1>
          <p className="text-sm text-gray-500 mt-1">ตรวจสอบและรับทราบรายการของพนักงาน</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1">
            📥 Export Excel
          </button>
          {selected.length > 0 && (
            <button onClick={handleBulkAcknowledge} disabled={acknowledging}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
              {acknowledging ? 'กำลังรับทราบ...' : `✓ รับทราบ ${selected.length} รายการ`}
            </button>
          )}
        </div>
      </div>

      {/* Alert */}
      {error   && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}<button onClick={() => setError('')} className="ml-2 font-bold">×</button></div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">✓ {success}<button onClick={() => setSuccess('')} className="ml-2 font-bold">×</button></div>}

      {/* Filter */}
      <div className="mb-5 bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">ตั้งแต่วันที่</label>
          <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ถึงวันที่</label>
          <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {isAdmin(user.role) || isMD(user.role) ? (
          <div>
            <label className="block text-xs text-gray-500 mb-1">แผนก</label>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">ทุกแผนก</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-500 mb-1">แผนก</label>
            <div className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-1.5 text-sm text-gray-600">
              {user.department_name} (แผนกของคุณ)
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">สถานะการรับทราบ</label>
          <select value={filterAck} onChange={e => setFilterAck(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">ทั้งหมด</option>
            <option value="pending">รอรับทราบ</option>
            <option value="acknowledged">รับทราบแล้ว</option>
          </select>
        </div>
        {(filterStart || filterEnd || filterDept) && (
          <button onClick={() => { setFilterStart(''); setFilterEnd(''); setFilterDept(''); }}
            className="text-xs text-gray-500 underline mt-4">ล้างตัวกรอง</button>
        )}
      </div>

      {/* Select all bar */}
      {filterAck !== 'acknowledged' && pendingLogs.length > 0 && (
        <div className="mb-3 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
          <input type="checkbox"
            checked={selected.length === pendingLogs.length && pendingLogs.length > 0}
            onChange={toggleSelectAll}
            className="w-4 h-4 accent-purple-600" />
          <span className="text-sm text-purple-700">
            เลือกทั้งหมด ({pendingLogs.length} รายการที่รอรับทราบ)
          </span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
      ) : logs.length === 0 ? (
        <div className="text-center bg-white border border-dashed border-gray-300 rounded-xl py-12 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>ไม่มีรายการบันทึกงาน</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([key, empLogs]) => {
            const first = empLogs[0];
            return (
              <div key={key} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Employee header */}
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-800">{first.employee_name}</span>
                    <span className="ml-2 text-xs text-gray-500">{first.employee_code} • {first.department_name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{empLogs.length} รายการ</span>
                </div>

                {/* Log items */}
                <div className="divide-y divide-gray-100">
                  {empLogs.map(log => (
                    <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                      {/* Checkbox (เฉพาะที่ยังไม่รับทราบ) */}
                      <div className="pt-0.5 w-5 shrink-0">
                        {!log.acknowledged_by ? (
                          <input type="checkbox"
                            checked={selected.includes(log.id)}
                            onChange={() => toggleSelect(log.id)}
                            className="w-4 h-4 accent-purple-600" />
                        ) : (
                          <span className="text-green-500 text-sm">✓</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-gray-700">📅 {formatDate(log.date)}</span>
                          <span className="text-xs text-gray-500">⏰ {log.start_time} - {log.end_time}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(log.status)}`}>
                            {getStatusLabel(log.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{log.description}</p>
                        {log.acknowledged_by_name && (
                          <p className="text-xs text-gray-400 mt-1">
                            รับทราบโดย: {log.acknowledged_by_name}
                            {log.acknowledged_at && ` • ${new Date(log.acknowledged_at).toLocaleDateString('th-TH')}`}
                          </p>
                        )}
                      </div>

                      {/* ปุ่มรับทราบรายการเดียว */}
                      {!log.acknowledged_by && (
                        <button onClick={() => handleAcknowledge(log.id)}
                          className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium whitespace-nowrap">
                          รับทราบ
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
