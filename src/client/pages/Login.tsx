import React, { useState, useEffect } from 'react';
import { Employee } from '../App';

interface LoginProps {
  onLogin: (employee: Employee) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('ระบบ Check In/Out');
  const [companyLogo, setCompanyLogo] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.company_name) setCompanyName(data.company_name);
      if (data.company_logo) setCompanyLogo(data.company_logo);
    } catch {
      // Use defaults
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_code: employeeCode, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      onLogin(data.employee);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-gradient flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 w-full max-w-md border border-white/50">
        <div className="text-center mb-8">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt="Company Logo"
              className="w-28 h-28 mx-auto mb-4 object-contain drop-shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-500 to-yellow-400 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-4xl">⏰</span>
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{companyName}</h1>
          <p className="text-gray-500 mt-1 text-sm">ระบบบันทึกเวลา & การลา</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสพนักงาน
            </label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="เช่น EMP001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="รหัสผ่าน"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 font-medium mb-2">ข้อมูลทดสอบ:</p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>EMP001 / 1234 (Admin)</p>
            <p>EMP002 / 1234 (Manager - ฝ่ายไอที)</p>
            <p>EMP003 / 1234 (Employee - ฝ่ายไอที)</p>
            <p>EMP004 / 1234 (Manager - ฝ่ายบัญชี)</p>
          </div>
        </div>
      </div>
    </div>
  );
}


