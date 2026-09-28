import React, { useEffect, useState } from 'react';
import { Employee } from '../App';

interface WorkLogProps {
  user: Employee;
}

interface WorkLogEntry {
  id: number;
  employee_id: number;
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  status: string;
  acknowledged_by: number | null;
  acknowledged_by_name: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'completed',   label: 'ดำเนินการเสร็จสิ้นทั้งหมด',                    color: 'bg-green-100 text-green-700' },
  { value: 'in_progress', label: 'อยู่ระหว่างดำเนินการ',                         color: 'bg-blue-100 text-blue-700' },
  { value: 'waiting',     label: 'รอข้อมูล/การดำเนินการจากหน่วยงานอื่น',        color: 'bg-yellow-100 text-yellow-700' },
  { value: 'cannot_do',   label: 'ไม่สามารถดำเนินการได้',                        color: 'bg-red-100 text-red-700' },
];

const getStatusStyle = (status: string) =>
  STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-600';

const getStatusLabel = (status: string) =>
  STATUS_OPTIONS.find(s => s.value === status)?.label || status;

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({
  date: today(),
  start_time: '08:30',
  end_time: '17:30',
  description: '',
  status: 'completed',
});

export default function WorkLog({ user }: WorkLogProps) {
  const [logs, setLogs] = useState<WorkLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [filterStart, filterEnd]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/work-logs?employee_id=${user.id}`;
      if (filterStart) url += `&start_date=${filterStart}`;
      if (filterEnd)   url += `&end_date=${filterEnd}`;
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data);
    } catch {
      setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const url    = editId ? `/api/work-logs/${editId}` : '/api/work-logs';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, employee_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      setSuccess(editId ? 'แก้ไขสำเร็จ' : 'บันทึกสำเร็จ');
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm());
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (log: WorkLogEntry) => {
    if (log.acknowledged_by) {
      setError('ไม่สามารถแก้ไขได้ เนื่องจากผู้บังคับบัญชารับทราบแล้ว');
      return;
    }
    setEditId(log.id);
    setForm({
      date: log.date,
      start_time: log.start_time,
      end_time: log.end_time,
      description: log.description,
      status: log.status,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('ลบรายการนี้ใช่ไหม?')) return;
    try {
      const res = await fetch(`/api/work-logs/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('ลบสำเร็จ');
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExport = () => {
    let url = `/api/work-logs/export/excel?employee_id=${user.id}`;
    if (filterStart) url += `&start_date=${filterStart}`;
    if (filterEnd)   url += `&end_date=${filterEnd}`;
    window.open(url, '_blank');
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📋 บันทึกการทำงาน</h1>
          <p className="text-sm text-gray-500 mt-1">{user.first_name} {user.last_name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
          >
            📥 Export Excel
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm()); setError(''); setSuccess(''); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
          >
            + บันทึกงานใหม่
          </button>
        </div>
      </div>

      {/* Alert */}
      {error   && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">✓ {success}</div>}

      {/* Form */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">{editId ? 'แก้ไขรายการ' : 'บันทึกงานใหม่'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">วันที่ <span className="text-red-500">*</span></label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">เวลาเริ่ม <span className="text-red-500">*</span></label>
                <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">เวลาสิ้นสุด <span className="text-red-500">*</span></label>
                <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">รายละเอียดงาน <span className="text-red-500">*</span></label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                rows={3} placeholder="อธิบายงานที่ทำ..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">สถานะงาน</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'บันทึก'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setError(''); }}
                className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-200">
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
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
        {(filterStart || filterEnd) && (
          <button onClick={() => { setFilterStart(''); setFilterEnd(''); }}
            className="text-xs text-gray-500 underline mt-4">ล้างตัวกรอง</button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
      ) : logs.length === 0 ? (
        <div className="text-center bg-white border border-dashed border-gray-300 rounded-xl py-12 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>ยังไม่มีรายการบันทึกงาน</p>
          <p className="text-sm mt-1">กด "บันทึกงานใหม่" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-800">📅 {formatDate(log.date)}</span>
                    <span className="text-sm text-gray-500">⏰ {log.start_time} - {log.end_time}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(log.status)}`}>
                      {getStatusLabel(log.status)}
                    </span>
                    {log.acknowledged_by && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                        ✓ รับทราบแล้ว
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{log.description}</p>
                  {log.acknowledged_by_name && (
                    <p className="text-xs text-gray-400 mt-1">
                      รับทราบโดย: {log.acknowledged_by_name}
                      {log.acknowledged_at && ` • ${new Date(log.acknowledged_at).toLocaleDateString('th-TH')}`}
                    </p>
                  )}
                </div>
                {!log.acknowledged_by && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEdit(log)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">
                      แก้ไข
                    </button>
                    <button onClick={() => handleDelete(log.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium">
                      ลบ
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
