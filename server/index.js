const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'scouts.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Add these near the top of your file
const JWT_SECRET = 'your-secret-key'; // Change this in production

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Log audit trail
const logAction = (userId, actionType, actionDetails) => {
  db.run(
    'INSERT INTO audit_logs (user_id, action_type, action_details) VALUES (?, ?, ?)',
    [userId, actionType, JSON.stringify(actionDetails)]
  );
};

function initializeDatabase() {
  db.serialize(() => {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit_logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        action_details TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create default admin user if none exists
    db.get('SELECT id FROM users WHERE role = "admin"', [], (err, row) => {
      if (err) {
        console.error('Error checking for admin:', err);
        return;
      }
      
      if (!row) {
        // In production, use proper password hashing (e.g., bcrypt)
        const defaultPassword = 'admin123'; // Change this in production
        db.run(
          'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
          ['admin', defaultPassword, 'admin'],
          function(err) {
            if (err) {
              console.error('Error creating admin user:', err);
              return;
            }
            console.log('Default admin user created');
          }
        );
      }
    });

    // Create scouts table
    db.run(`
      CREATE TABLE IF NOT EXISTS scouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL DEFAULT 0,
        is_unit_account BOOLEAN DEFAULT 0
      )
    `);

    // Create transactions table with transfer_id
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scout_id INTEGER,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        transfer_id TEXT,
        FOREIGN KEY (scout_id) REFERENCES scouts(id)
      )
    `);

    // Create Unit Account if it doesn't exist
    db.get('SELECT id FROM scouts WHERE is_unit_account = 1', [], (err, row) => {
      if (err) {
        console.error('Error checking for Unit Account:', err);
        return;
      }
      
      if (!row) {
        db.run(
          'INSERT INTO scouts (name, balance, is_unit_account) VALUES (?, 0, 1)',
          ['Unit Account'],
          function(err) {
            if (err) {
              console.error('Error creating Unit Account:', err);
              return;
            }
            console.log('Unit Account created with ID:', this.lastID);
          }
        );
      }
    });
  });
}

// Routes
app.get('/api/scouts', authenticateToken, (req, res) => {
  db.all('SELECT * FROM scouts', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/scouts', authenticateToken, authorize(['admin', 'editor']), (req, res) => {
  console.log('Received POST request to /api/scouts');
  console.log('Request body:', req.body);
  
  const { name } = req.body;
  db.run('INSERT INTO scouts (name) VALUES (?)', [name], function(err) {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name, balance: 0 });
  });
});

app.get('/api/scouts/:id/transactions', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM transactions WHERE scout_id = ? ORDER BY date DESC',
    [req.params.id],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.post('/api/scouts/:id/transactions', authenticateToken, authorize(['admin', 'editor']), (req, res) => {
  const { description, amount, category, date } = req.body;
  const scout_id = req.params.id;

  db.serialize(() => {
    db.run(
      'INSERT INTO transactions (scout_id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
      [scout_id, description, amount, category, date],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        // Update scout balance
        db.run(
          'UPDATE scouts SET balance = balance + ? WHERE id = ?',
          [amount, scout_id],
          (err) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({ id: this.lastID, scout_id, description, amount, category, date });
          }
        );
      }
    );
  });
});

// Add routes for updating and deleting transactions
app.put('/api/transactions/:id', authenticateToken, authorize(['admin', 'editor']), (req, res) => {
  const { description, amount, category, date } = req.body;
  const transactionId = req.params.id;

  db.serialize(() => {
    // First get the old transaction amount
    db.get(
      'SELECT amount, scout_id FROM transactions WHERE id = ?',
      [transactionId],
      (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        const amountDiff = amount - row.amount;

        // Update the transaction
        db.run(
          'UPDATE transactions SET description = ?, amount = ?, category = ?, date = ? WHERE id = ?',
          [description, amount, category, date, transactionId],
          (err) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }

            // Update scout balance
            db.run(
              'UPDATE scouts SET balance = balance + ? WHERE id = ?',
              [amountDiff, row.scout_id],
              (err) => {
                if (err) {
                  res.status(500).json({ error: err.message });
                  return;
                }
                res.json({ id: transactionId, description, amount, category, date });
              }
            );
          }
        );
      }
    );
  });
});

app.delete('/api/transactions/:id', authenticateToken, authorize(['admin', 'editor']), (req, res) => {
  const transactionId = req.params.id;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    try {
      // First get the transaction details
      db.get(
        'SELECT amount, scout_id, category, transfer_id FROM transactions WHERE id = ?',
        [transactionId],
        (err, transaction) => {
          if (err) {
            console.error('Error getting transaction:', err);
            db.run('ROLLBACK');
            res.status(500).json({ error: err.message });
            return;
          }

          console.log('Original transaction:', transaction);

          // If this is a transfer, find and delete the corresponding transaction
          if (transaction.category === 'Transfer' && transaction.transfer_id) {
            // Find the linked transaction using transfer_id
            db.get(
              'SELECT id, scout_id, amount FROM transactions WHERE transfer_id = ? AND id != ?',
              [transaction.transfer_id, transactionId],
              (err, linkedTransaction) => {
                if (err) {
                  console.error('Error finding linked transaction:', err);
                  db.run('ROLLBACK');
                  res.status(500).json({ error: err.message });
                  return;
                }

                console.log('Found linked transaction:', linkedTransaction);

                if (linkedTransaction) {
                  // Delete both transactions and update both balances
                  db.run(
                    'DELETE FROM transactions WHERE transfer_id = ?',
                    [transaction.transfer_id],
                    (err) => {
                      if (err) {
                        console.error('Error deleting transactions:', err);
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err.message });
                        return;
                      }

                      // Update balances for both accounts
                      db.run(
                        'UPDATE scouts SET balance = balance - ? WHERE id = ?',
                        [transaction.amount, transaction.scout_id],
                        (err) => {
                          if (err) {
                            console.error('Error updating first balance:', err);
                            db.run('ROLLBACK');
                            res.status(500).json({ error: err.message });
                            return;
                          }

                          db.run(
                            'UPDATE scouts SET balance = balance - ? WHERE id = ?',
                            [linkedTransaction.amount, linkedTransaction.scout_id],
                            (err) => {
                              if (err) {
                                console.error('Error updating second balance:', err);
                                db.run('ROLLBACK');
                                res.status(500).json({ error: err.message });
                                return;
                              }

                              db.run('COMMIT', (err) => {
                                if (err) {
                                  console.error('Error committing transaction:', err);
                                  db.run('ROLLBACK');
                                  res.status(500).json({ error: err.message });
                                  return;
                                }
                                console.log('Successfully deleted transfer and updated balances');
                                res.json({ success: true });
                              });
                            }
                          );
                        }
                      );
                    }
                  );
                } else {
                  console.error('No linked transaction found for transfer ID:', transaction.transfer_id);
                  db.run('ROLLBACK');
                  res.status(400).json({ error: 'Linked transfer transaction not found' });
                }
              }
            );
          } else {
            // For non-transfer transactions, just delete normally
            db.run(
              'DELETE FROM transactions WHERE id = ?',
              [transactionId],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  res.status(500).json({ error: err.message });
                  return;
                }

                // Update scout balance
                db.run(
                  'UPDATE scouts SET balance = balance - ? WHERE id = ?',
                  [transaction.amount, transaction.scout_id],
                  (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      res.status(500).json({ error: err.message });
                      return;
                    }

                    db.run('COMMIT', (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err.message });
                        return;
                      }
                      res.json({ success: true });
                    });
                  }
                );
              }
            );
          }
        }
      );
    } catch (err) {
      console.error('Unexpected error:', err);
      db.run('ROLLBACK');
      res.status(500).json({ error: err.message });
    }
  });
});

app.post('/api/transfers', authenticateToken, authorize(['admin', 'editor']), (req, res) => {
  const { fromScoutId, toScoutId, amount, description } = req.body;
  const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Get Unit Account ID
  db.get('SELECT id FROM scouts WHERE is_unit_account = 1', [], (err, unitAccount) => {
    if (err) {
      res.status(500).json({ error: 'Failed to get Unit Account' });
      return;
    }

    const fromId = fromScoutId === 'unit' ? unitAccount.id : fromScoutId;
    const toId = toScoutId === 'unit' ? unitAccount.id : toScoutId;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      try {
        // Create withdrawal transaction for source account
        db.run(
          'INSERT INTO transactions (scout_id, description, amount, category, date, transfer_id) VALUES (?, ?, ?, ?, ?, ?)',
          [fromId, description, -amount, 'Transfer', new Date().toISOString(), transferId]
        );
        
        db.run(
          'UPDATE scouts SET balance = balance - ? WHERE id = ?',
          [amount, fromId]
        );

        // Create deposit transaction for destination account
        db.run(
          'INSERT INTO transactions (scout_id, description, amount, category, date, transfer_id) VALUES (?, ?, ?, ?, ?, ?)',
          [toId, description, amount, 'Transfer', new Date().toISOString(), transferId]
        );
        
        db.run(
          'UPDATE scouts SET balance = balance + ? WHERE id = ?',
          [amount, toId]
        );

        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error during transfer:', err);
            res.status(500).json({ error: 'Failed to process transfer' });
            return;
          }
          res.json({ success: true });
        });
      } catch (err) {
        db.run('ROLLBACK');
        console.error('Error during transfer:', err);
        res.status(500).json({ error: 'Failed to process transfer' });
      }
    });
  });
});

// Make sure this endpoint is defined before app.listen()
app.put('/api/scouts/:id', authenticateToken, authorize(['admin', 'editor']), (req, res) => {
  const { name } = req.body;
  const scoutId = parseInt(req.params.id, 10); // Convert ID to number

  console.log('Updating scout:', { scoutId, name });

  db.run(
    'UPDATE scouts SET name = ? WHERE id = ? AND is_unit_account = 0',
    [name, scoutId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        console.log('No scout updated:', { scoutId, changes: this.changes });
        res.status(404).json({ error: 'Scout not found or cannot edit Unit Account' });
        return;
      }
      console.log('Scout updated successfully:', { scoutId, name });
      res.json({ id: scoutId, name });
    }
  );
});

// Add this after your other routes but before app.listen()
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get(
    'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, user) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    }
  );
});

// Add these endpoints before app.listen()

// Get all users (admin only)
app.get('/api/users', authenticateToken, authorize(['admin']), (req, res) => {
  db.all(
    'SELECT id, username, role, created_at FROM users',
    [],
    (err, users) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(users);
    }
  );
});

// Create new user (admin only)
app.post('/api/users', authenticateToken, authorize(['admin']), (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  if (!['editor', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be either editor or viewer' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    try {
      db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, password, role],
        function(err) {
          if (err) {
            console.error('Error creating user:', err);
            if (err.message.includes('UNIQUE constraint failed')) {
              db.run('ROLLBACK');
              res.status(400).json({ error: 'Username already exists' });
            } else {
              db.run('ROLLBACK');
              res.status(500).json({ error: err.message });
            }
            return;
          }

          const userId = this.lastID;
          
          // Log the action
          db.run(
            'INSERT INTO audit_logs (user_id, action_type, action_details) VALUES (?, ?, ?)',
            [req.user.id, 'create_user', JSON.stringify({ username, role })],
            (err) => {
              if (err) {
                console.error('Error logging action:', err);
                db.run('ROLLBACK');
                res.status(500).json({ error: 'Failed to log action' });
                return;
              }

              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction:', err);
                  db.run('ROLLBACK');
                  res.status(500).json({ error: 'Failed to create user' });
                  return;
                }

                res.json({
                  id: userId,
                  username,
                  role,
                  created_at: new Date().toISOString()
                });
              });
            }
          );
        }
      );
    } catch (err) {
      console.error('Unexpected error:', err);
      db.run('ROLLBACK');
      res.status(500).json({ error: 'Failed to create user' });
    }
  });
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, authorize(['admin']), (req, res) => {
  const userId = req.params.id;
  const adminId = req.user.id;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // First check if user exists and is not admin
    db.get('SELECT role FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
        return;
      }

      if (!user) {
        db.run('ROLLBACK');
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.role === 'admin') {
        db.run('ROLLBACK');
        res.status(403).json({ error: 'Cannot delete admin user' });
        return;
      }

      // Delete user's audit logs
      db.run('DELETE FROM audit_logs WHERE user_id = ?', [userId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }

        // Delete the user
        db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            res.status(500).json({ error: err.message });
            return;
          }

          // Log the deletion
          db.run(
            'INSERT INTO audit_logs (user_id, action_type, action_details) VALUES (?, ?, ?)',
            [adminId, 'delete_user', JSON.stringify({ deletedUserId: userId })],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
              }

              db.run('COMMIT', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  res.status(500).json({ error: err.message });
                  return;
                }
                res.json({ success: true });
              });
            }
          );
        });
      });
    });
  });
});

// Add this with the other endpoints
app.get('/api/audit-logs', authenticateToken, authorize(['admin']), (req, res) => {
  db.all(
    `SELECT audit_logs.*, users.username 
     FROM audit_logs 
     JOIN users ON audit_logs.user_id = users.id 
     ORDER BY timestamp DESC`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Change password (any authenticated user can change their own password)
app.put('/api/users/password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // First verify current password
  db.get(
    'SELECT id FROM users WHERE id = ? AND password = ?',
    [userId, currentPassword],
    (err, user) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!user) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      // Update password
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [newPassword, userId],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          logAction(userId, 'change_password', { userId });
          res.json({ success: true });
        }
      );
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 