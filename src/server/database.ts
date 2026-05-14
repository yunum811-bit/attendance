import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: SqlJsDatabase;

// ใช้ environment variable DATA_DIR สำหรับ persistent storage (Railway/Render)
// ถ้าไม่มีจะใช้ ./data ตามปกติ
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../public/uploads');
const dbPath = path.join(dataDir, 'attendance.db');

// Export ให้ไฟล์อื่นใช้
export { uploadsDir };

export async function initDatabase(): Promise<SqlJsDatabase> {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      department_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      password TEXT NOT NULL DEFAULT '1234',
      avatar TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      photo_checkin TEXT,
      photo_checkout TEXT,
      location_checkin TEXT,
      location_checkout TEXT,
      status TEXT DEFAULT 'present',
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leave_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      max_days INTEGER NOT NULL DEFAULT 0,
      description TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employee_leave_quotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type_id INTEGER NOT NULL,
      max_days INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
      UNIQUE(employee_id, leave_type_id, year)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL DEFAULT ''
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      attachment TEXT,
      attachment_name TEXT,
      created_by INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES employees(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days INTEGER NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by INTEGER,
      approved_at DATETIME,
      reject_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
      FOREIGN KEY (approved_by) REFERENCES employees(id)
    );
  `);

  // Seed default data
  const [{ values: [[deptCount]] }] = db.exec('SELECT COUNT(*) FROM departments');
  if (deptCount === 0) {
    // Company settings defaults
    db.run("INSERT OR IGNORE INTO company_settings (key, value) VALUES ('company_name', 'บริษัท ตัวอย่าง จำกัด')");
    db.run("INSERT OR IGNORE INTO company_settings (key, value) VALUES ('company_logo', '')");

    db.run("INSERT INTO departments (name) VALUES ('ฝ่ายบริหาร')");
    db.run("INSERT INTO departments (name) VALUES ('ฝ่ายไอที')");
    db.run("INSERT INTO departments (name) VALUES ('ฝ่ายบัญชี')");
    db.run("INSERT INTO departments (name) VALUES ('ฝ่ายการตลาด')");
    db.run("INSERT INTO departments (name) VALUES ('ฝ่ายบุคคล')");

    db.run("INSERT INTO leave_types (name, max_days, description) VALUES ('ลาป่วย', 30, 'ลาป่วยตามกฎหมายแรงงาน')");
    db.run("INSERT INTO leave_types (name, max_days, description) VALUES ('ลากิจ', 5, 'ลากิจส่วนตัว')");
    db.run("INSERT INTO leave_types (name, max_days, description) VALUES ('ลาพักร้อน', 10, 'ลาพักร้อนประจำปี')");
    db.run("INSERT INTO leave_types (name, max_days, description) VALUES ('ลาคลอด', 98, 'ลาคลอดบุตร')");

    db.run("INSERT INTO employees (employee_code, first_name, last_name, email, department_id, role, password) VALUES ('EMP001', 'สมชาย', 'ใจดี', 'somchai@company.com', 1, 'admin', '1234')");
    db.run("INSERT INTO employees (employee_code, first_name, last_name, email, department_id, role, password) VALUES ('EMP002', 'สมหญิง', 'รักงาน', 'somying@company.com', 2, 'manager', '1234')");
    db.run("INSERT INTO employees (employee_code, first_name, last_name, email, department_id, role, password) VALUES ('EMP003', 'สมศักดิ์', 'มั่นคง', 'somsak@company.com', 2, 'employee', '1234')");
    db.run("INSERT INTO employees (employee_code, first_name, last_name, email, department_id, role, password) VALUES ('EMP004', 'สมใจ', 'สุขสันต์', 'somjai@company.com', 3, 'manager', '1234')");
    db.run("INSERT INTO employees (employee_code, first_name, last_name, email, department_id, role, password) VALUES ('EMP005', 'สมปอง', 'ดีใจ', 'sompong@company.com', 3, 'employee', '1234')");
  }

  saveDatabase();
  return db;
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export function getDb(): SqlJsDatabase {
  return db;
}

// Helper to run a query and return results as array of objects
export function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper to run a query and return first result
export function queryOne(sql: string, params: any[] = []): any | null {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Helper to run an insert/update/delete
export function execute(sql: string, params: any[] = []): { lastId: number; changes: number } {
  db.run(sql, params);
  const lastId = (db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] as number) || 0;
  const changes = db.getRowsModified();
  saveDatabase();
  return { lastId, changes };
}

export default { queryAll, queryOne, execute, getDb, saveDatabase };
