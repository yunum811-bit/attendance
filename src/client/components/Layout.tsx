import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Employee } from '../App';
import NotificationBell from './NotificationBell';
import { isAdmin, isManagerOrAdmin, getRoleShortLabel } from '../utils/roles';

interface LayoutProps {
  user: Employee;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, onLogout, children }: LayoutProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const navItems = [
    { path: '/', label: 'หน้าหลัก', icon: '🏠' },
    { path: '/checkinout', label: 'Check In/Out', icon: '⏰' },
    { path: '/leave', label: 'ขอลา', icon: '📋' },
    ...(isManagerOrAdmin(user.role)
      ? [{ path: '/approval', label: 'อนุมัติ', icon: '✅' }]
      : []),
    { path: '/reports', label: 'รายงาน', icon: '📊' },
    ...(isAdmin(user.role)
      ? [{ path: '/employees', label: 'พนักงาน', icon: '👥' }]
      : []),
    ...(isAdmin(user.role)
      ? [{ path: '/leave-quotas', label: 'กำหนดวันลา', icon: '📅' }]
      : []),
    ...(isAdmin(user.role)
      ? [{ path: '/settings', label: 'ตั้งค่า', icon: '⚙️' }]
      : []),
    { path: '/change-password', label: 'เปลี่ยนรหัสผ่าน', icon: '🔑' },
  ];

  // Bottom nav shows max 5 items on mobile
  const bottomNavItems = navItems.slice(0, 5);
  const moreItems = navItems.slice(5);

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {/* Header */}
      <header className="header-gradient text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 min-w-0">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Logo"
                className="w-10 h-10 rounded-lg bg-white p-1 object-contain flex-shrink-0 shadow"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⏰</span>
              </div>
            )}
            <h1 className="text-lg md:text-2xl font-bold truncate drop-shadow">{companyName}</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <NotificationBell employeeId={user.id} />
            {user.avatar && (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/50 hidden md:block" />
            )}
            <span className="hidden md:inline text-sm font-medium opacity-90">
              {user.first_name} {user.last_name}
            </span>
            <span className="text-xs bg-white/25 backdrop-blur px-2.5 py-1 rounded-full font-semibold whitespace-nowrap">
              {getRoleShortLabel(user.role)}
            </span>
            <button
              onClick={onLogout}
              className="bg-white/20 hover:bg-red-500 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-5 py-3.5 text-sm font-semibold border-b-3 transition-colors whitespace-nowrap ${
                  location.pathname === item.path
                    ? 'border-green-600 text-green-700 bg-green-50/50'
                    : 'border-transparent text-gray-500 hover:text-green-600 hover:bg-green-50/30'
                }`}
                style={{ borderBottomWidth: '3px' }}
              >
                <span className="mr-1.5">{item.icon}</span>{item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="flex justify-around items-center">
          {bottomNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2 px-1 min-w-0 flex-1 ${
                location.pathname === item.path
                  ? 'text-green-600'
                  : 'text-gray-500'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] mt-0.5 truncate w-full text-center">{item.label}</span>
            </Link>
          ))}
          {moreItems.length > 0 && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex flex-col items-center py-2 px-1 min-w-0 flex-1 ${
                menuOpen ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              <span className="text-lg">⋯</span>
              <span className="text-[10px] mt-0.5">เพิ่มเติม</span>
            </button>
          )}
        </div>

        {/* More menu popup */}
        {menuOpen && moreItems.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            {moreItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 ${
                  location.pathname === item.path
                    ? 'text-green-600 bg-green-50'
                    : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}

