// Role helper functions
// Roles: employee, manager, admin, manager_admin, md

export function isAdmin(role: string): boolean {
  return role === 'admin' || role === 'manager_admin';
}

export function isMD(role: string): boolean {
  return role === 'md';
}

export function isManager(role: string): boolean {
  return role === 'manager' || role === 'manager_admin';
}

export function isEmployee(role: string): boolean {
  return role === 'employee';
}

// Can approve employee leave requests
export function canApproveEmployee(role: string): boolean {
  return isManager(role) || isAdmin(role) || isMD(role);
}

// Can approve manager/manager_admin leave requests
export function canApproveManager(role: string): boolean {
  return isMD(role) || isAdmin(role);
}

export function isManagerOrAdmin(role: string): boolean {
  return isManager(role) || isAdmin(role) || isMD(role);
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    md: 'กรรมการผู้จัดการ (MD)',
    admin: 'ผู้ดูแลระบบ',
    manager: 'หัวหน้าแผนก',
    manager_admin: 'หัวหน้าแผนก+ผู้ดูแลระบบ',
    employee: 'พนักงาน',
  };
  return labels[role] || role;
}

export function getRoleShortLabel(role: string): string {
  const labels: Record<string, string> = {
    md: 'MD',
    admin: 'Admin',
    manager: 'Manager',
    manager_admin: 'Manager+Admin',
    employee: 'Employee',
  };
  return labels[role] || role;
}
