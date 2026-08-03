import React, { useEffect, useState } from 'react';
import { Employee } from '../App';
import { isAdmin, isManager, isEmployee, isMD } from '../utils/roles';

interface ReportsProps {
  user: Employee;
}

interface Department {
  id: number;
  name: string;
}

export default function Reports({ user }: ReportsProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reportType, setReportType] = useState<'attendance' | 'leave' | 'summary'>('attendance');
  const [filters, setFilters] = useState({
    department_id: '',
    employee_id: '',
    start_date: '',
    end_date: '',
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    year: new Date().getFullYear().toString(),
    status: '',
  });
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const _isAdmin = isAdmin(user.role) || isMD(user.role);
  const _isManager = isManager(user.role) && !_isAdmin;
  const _isEmployee = isEmployee(user.role);

  useEffect(() => {
    if (_isAdmin) {
      fetchDepartments();
    }
  }, []);

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const data = await res.json();
    setDepartments(data);
  };

  const buildParams = (): URLSearchParams => {
    const params = new URLSearchParams();

    // Role-based filtering
    if (_isEmployee) {
      params.append('employee_id', String(user.id));
    } else if (_isManager) {
      params.append('department_id', String(user.department_id));
    } else if (_isAdmin && filters.department_id) {
      params.append('department_id', filters.department_id);
    }

    // Date filters
    if (reportType === 'summary') {
      params.append('month', filters.month);
      params.append('year', filters.year);
    } else {
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
    }

    if (reportType === 'leave' && filters.status) {
      params.append('status', filters.status);
    }

    return params;
  };

  const fetchReport = async () => {
    setLoading(true);
    const params = buildParams();

    try {
      const res = await fetch(`/api/reports/${reportType}?${params.toString()}`);
      const result = await res.json();
      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'csv' | 'xlsx') => {
    const params = buildParams();
    params.append('format', format);
    window.open(`/api/reports/${reportType}?${params.toString()}`, '_blank');
  };

  const getRoleLabel = () => {
    if (_isEmployee) return `ข้อมูลของ: ${user.first_name} ${user.last_name}`;
    if (_isManager) return `แผนก: ${user.department_name}`;
    return 'ทุกแผนก (Admin)';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-2xl font-bold text-gray-800">รายงาน</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
          📋 {getRoleLabel()}
        </span>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setReportType('attendance')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              reportType === 'attendance'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 รายงานการเข้างาน
          </button>
          <button
            onClick={() => setReportType('leave')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              reportType === 'leave'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 รายงานการลา
          </button>
          <button
            onClick={() => setReportType('summary')}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              reportType === 'summary'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📈 สรุปรายเดือน
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Department filter - only for Admin */}
          {_isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">แผนก</label>
              <select
                value={filters.department_id}
                onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">ทุกแผนก</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'summary' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เดือน</label>
                <select
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                      {new Date(2000, i).toLocaleString('th-TH', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ปี</label>
                <input
                  type="number"
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่ม</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </>
          )}

          {reportType === 'leave' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">ทั้งหมด</option>
                <option value="pending">รออนุมัติ</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="rejected">ไม่อนุมัติ</option>
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchReport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            🔍 ดูรายงาน
          </button>
          <button
            onClick={() => exportReport('csv')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            📄 Export CSV
          </button>
          <button
            onClick={() => exportReport('xlsx')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            📊 Export XLSX
          </button>
        </div>
      </div>

      {/* Report Data */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
      ) : data.length > 0 ? (
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          <p className="text-sm text-gray-500 mb-3">พบ {data.length} รายการ</p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(data[0]).map((key) => (
                  <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-600 whitespace-nowrap">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {Object.values(row).map((val, i) => (
                    <td key={i} className="px-3 py-2 whitespace-nowrap">
                      {val as string || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            กดปุ่ม "ดูรายงาน" เพื่อแสดงข้อมูล
          </div>
        )
      )}
    </div>
  );
}

