import React, { useState, useEffect } from 'react';
import { Employee } from '../App';
import { isAdmin } from '../utils/roles';

interface CalendarProps {
  user: Employee;
}

// วันหยุดราชการไทย 2026
const THAI_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'วันขึ้นปีใหม่',
  '2026-02-12': 'วันมาฆบูชา',
  '2026-04-06': 'วันจักรี',
  '2026-04-13': 'วันสงกรานต์',
  '2026-04-14': 'วันสงกรานต์',
  '2026-04-15': 'วันสงกรานต์',
  '2026-05-01': 'วันแรงงานแห่งชาติ',
  '2026-05-04': 'วันฉัตรมงคล',
  '2026-05-11': 'วันวิสาขบูชา',
  '2026-06-03': 'วันเฉลิมพระชนมพรรษา สมเด็จพระราชินี',
  '2026-07-09': 'วันอาสาฬหบูชา',
  '2026-07-10': 'วันเข้าพรรษา',
  '2026-07-28': 'วันเฉลิมพระชนมพรรษา ร.10',
  '2026-08-12': 'วันแม่แห่งชาติ',
  '2026-10-13': 'วันคล้ายวันสวรรคต ร.9',
  '2026-10-23': 'วันปิยมหาราช',
  '2026-12-05': 'วันพ่อแห่งชาติ',
  '2026-12-10': 'วันรัฐธรรมนูญ',
  '2026-12-31': 'วันสิ้นปี',
};

const THAI_HOLIDAYS_2025: Record<string, string> = {
  '2025-01-01': 'วันขึ้นปีใหม่',
  '2025-02-12': 'วันมาฆบูชา',
  '2025-04-06': 'วันจักรี',
  '2025-04-13': 'วันสงกรานต์',
  '2025-04-14': 'วันสงกรานต์',
  '2025-04-15': 'วันสงกรานต์',
  '2025-05-01': 'วันแรงงานแห่งชาติ',
  '2025-05-04': 'วันฉัตรมงคล',
  '2025-05-12': 'วันวิสาขบูชา',
  '2025-06-03': 'วันเฉลิมพระชนมพรรษา สมเด็จพระราชินี',
  '2025-07-10': 'วันอาสาฬหบูชา',
  '2025-07-11': 'วันเข้าพรรษา',
  '2025-07-28': 'วันเฉลิมพระชนมพรรษา ร.10',
  '2025-08-12': 'วันแม่แห่งชาติ',
  '2025-10-13': 'วันคล้ายวันสวรรคต ร.9',
  '2025-10-23': 'วันปิยมหาราช',
  '2025-12-05': 'วันพ่อแห่งชาติ',
  '2025-12-10': 'วันรัฐธรรมนูญ',
  '2025-12-31': 'วันสิ้นปี',
};

const BUILTIN_HOLIDAYS: Record<string, string> = { ...THAI_HOLIDAYS_2025, ...THAI_HOLIDAYS_2026 };

interface CustomHoliday {
  id: number;
  date: string;
  name: string;
}

interface AttendanceDay {
  date: string;
  check_in: string;
  check_out: string | null;
}

interface LeaveDay {
  start_date: string;
  end_date: string;
  leave_type_name: string;
  status: string;
}

export default function Calendar({ user }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceDay[]>([]);
  const [leaves, setLeaves] = useState<LeaveDay[]>([]);
  const [customHolidays, setCustomHolidays] = useState<CustomHoliday[]>([]);
  const [allHolidays, setAllHolidays] = useState<Record<string, string>>(BUILTIN_HOLIDAYS);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '' });
  const [editHolidayId, setEditHolidayId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchMonthData();
    fetchCustomHolidays();
  }, [year, month]);

  const fetchCustomHolidays = async () => {
    const res = await fetch('/api/holidays');
    const data = await res.json();
    setCustomHolidays(data);
    // Merge with built-in holidays
    const merged = { ...BUILTIN_HOLIDAYS };
    data.forEach((h: CustomHoliday) => { merged[h.date] = h.name; });
    setAllHolidays(merged);
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.date || !holidayForm.name) return;
    const url = editHolidayId ? `/api/holidays/${editHolidayId}` : '/api/holidays';
    const method = editHolidayId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...holidayForm, created_by: user.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message);
      setShowAddHoliday(false);
      setHolidayForm({ date: '', name: '' });
      setEditHolidayId(null);
      fetchCustomHolidays();
    } else {
      setMessage('❌ ' + data.error);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm('ยืนยันลบวันหยุดนี้?')) return;
    await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
    fetchCustomHolidays();
  };

  const startEditHoliday = (h: CustomHoliday) => {
    setEditHolidayId(h.id);
    setHolidayForm({ date: h.date, name: h.name });
    setShowAddHoliday(true);
  };

  const fetchMonthData = async () => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;

    const [attRes, leaveRes] = await Promise.all([
      fetch(`/api/attendance/history/${user.id}?start_date=${startDate}&end_date=${endDate}`),
      fetch(`/api/leave/my-requests/${user.id}`),
    ]);

    const attData = await attRes.json();
    const leaveData = await leaveRes.json();

    setAttendance(attData);
    setLeaves(leaveData.filter((l: any) => l.status === 'approved'));
  };

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatDateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isHoliday = (dateStr: string) => allHolidays[dateStr];
  const isWeekend = (day: number) => {
    const d = new Date(year, month, day).getDay();
    return d === 0 || d === 6;
  };

  const getAttendance = (dateStr: string) => attendance.find(a => a.date === dateStr);
  const getLeave = (dateStr: string) => {
    return leaves.find(l => dateStr >= l.start_date && dateStr <= l.end_date);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  // Selected date info
  const selectedInfo = selectedDate ? {
    holiday: isHoliday(selectedDate),
    attendance: getAttendance(selectedDate),
    leave: getLeave(selectedDate),
  } : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">📅 ปฏิทิน</h2>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full inline-block"></span> มาทำงาน</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded-full inline-block"></span> ลา</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-full inline-block"></span> วันหยุดราชการ</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-300 rounded-full inline-block"></span> วันหยุด (เสาร์-อาทิตย์)</span>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow p-4 md:p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-lg">◀</button>
          <h3 className="text-lg font-bold text-gray-800">
            {monthNames[month]} {year + 543}
          </h3>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-lg">▶</button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d, i) => (
            <div key={i} className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="h-10 md:h-14"></div>
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = formatDateStr(day);
            const holiday = isHoliday(dateStr);
            const weekend = isWeekend(day);
            const att = getAttendance(dateStr);
            const leave = getLeave(dateStr);
            const today = isToday(day);

            let bgColor = '';
            let textColor = 'text-gray-800';
            let dot = '';

            if (holiday) {
              bgColor = 'bg-red-50';
              textColor = 'text-red-600';
              dot = 'bg-red-400';
            } else if (leave) {
              bgColor = 'bg-yellow-50';
              dot = 'bg-yellow-400';
            } else if (att) {
              bgColor = 'bg-green-50';
              dot = 'bg-green-500';
            } else if (weekend) {
              bgColor = 'bg-gray-50';
              textColor = 'text-gray-400';
              dot = 'bg-gray-300';
            }

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`h-10 md:h-14 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all hover:ring-2 hover:ring-green-300 relative ${bgColor} ${today ? 'ring-2 ring-green-500 font-bold' : ''} ${selectedDate === dateStr ? 'ring-2 ring-blue-500' : ''}`}
              >
                <span className={`text-sm ${textColor}`}>{day}</span>
                {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot} absolute bottom-1`}></span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Info */}
      {selectedDate && selectedInfo && (
        <div className="bg-white rounded-xl shadow p-4">
          <h4 className="font-semibold text-gray-800 mb-2">
            📅 {parseInt(selectedDate.split('-')[2])}/{parseInt(selectedDate.split('-')[1])}/{parseInt(selectedDate.split('-')[0]) + 543}
          </h4>
          {selectedInfo.holiday && (
            <p className="text-red-600 text-sm mb-1">🔴 {selectedInfo.holiday}</p>
          )}
          {selectedInfo.attendance && (
            <p className="text-green-600 text-sm mb-1">
              ✅ มาทำงาน — เข้า: {selectedInfo.attendance.check_in} | ออก: {selectedInfo.attendance.check_out || '-'}
            </p>
          )}
          {selectedInfo.leave && (
            <p className="text-yellow-600 text-sm mb-1">
              📋 {selectedInfo.leave.leave_type_name}
            </p>
          )}
          {!selectedInfo.holiday && !selectedInfo.attendance && !selectedInfo.leave && (
            <p className="text-gray-500 text-sm">ไม่มีข้อมูล</p>
          )}
        </div>
      )}

      {/* Holidays this month */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold text-gray-800">🔴 วันหยุด เดือน{monthNames[month]}</h4>
          {isAdmin(user.role) && (
            <button
              onClick={() => { setShowAddHoliday(!showAddHoliday); setEditHolidayId(null); setHolidayForm({ date: '', name: '' }); }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs"
            >
              {showAddHoliday ? 'ยกเลิก' : '+ เพิ่มวันหยุด'}
            </button>
          )}
        </div>

        {message && <p className="text-sm text-green-600 mb-2">{message}</p>}

        {/* Add/Edit Holiday Form */}
        {showAddHoliday && isAdmin(user.role) && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
            <input
              type="date"
              value={holidayForm.date}
              onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="text"
              value={holidayForm.name}
              onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
              placeholder="ชื่อวันหยุด เช่น วันหยุดชดเชย"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <button
              onClick={handleAddHoliday}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm w-full"
            >
              💾 {editHolidayId ? 'บันทึกการแก้ไข' : 'เพิ่มวันหยุด'}
            </button>
          </div>
        )}

        {/* Holiday list */}
        <div className="space-y-2">
          {Object.entries(allHolidays)
            .filter(([date]) => date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
            .map(([date, name]) => {
              const customHoliday = customHolidays.find(h => h.date === date);
              return (
                <div key={date} className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
                  <div>
                    <span className="text-gray-700">{name}</span>
                    {customHoliday && <span className="text-xs text-blue-500 ml-2">(กำหนดเอง)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 text-xs font-medium">
                      {parseInt(date.split('-')[2])}/{parseInt(date.split('-')[1])}/{parseInt(date.split('-')[0]) + 543}
                    </span>
                    {customHoliday && isAdmin(user.role) && (
                      <div className="flex gap-1">
                        <button onClick={() => startEditHoliday(customHoliday)} className="text-blue-500 text-xs">✏️</button>
                        <button onClick={() => handleDeleteHoliday(customHoliday.id)} className="text-red-500 text-xs">🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          {Object.entries(allHolidays)
            .filter(([date]) => date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
            .length === 0 && (
            <p className="text-gray-400 text-sm text-center py-2">ไม่มีวันหยุดในเดือนนี้</p>
          )}
        </div>
      </div>
    </div>
  );
}
