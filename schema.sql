DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS scouts;
DROP TABLE IF EXISTS transactions;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_details TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE scouts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  balance REAL DEFAULT 0,
  is_unit_account INTEGER DEFAULT 0
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  scout_id INTEGER,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  transfer_id TEXT,
  FOREIGN KEY (scout_id) REFERENCES scouts(id)
);

-- Create default admin user (password: admin123)
INSERT INTO users (username, password, role) 
VALUES ('admin', 'admin123', 'admin');

-- Create Unit Account
INSERT INTO scouts (name, balance, is_unit_account)
VALUES ('Unit Account', 0, 1); 