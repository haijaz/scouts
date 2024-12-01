const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

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

function initializeDatabase() {
  db.serialize(() => {
    // Create scouts table
    db.run(`
      CREATE TABLE IF NOT EXISTS scouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL DEFAULT 0,
        is_unit_account BOOLEAN DEFAULT 0
      )
    `);

    // Create transactions table
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scout_id INTEGER,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
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
app.get('/api/scouts', (req, res) => {
  db.all('SELECT * FROM scouts', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/scouts', (req, res) => {
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

app.get('/api/scouts/:id/transactions', (req, res) => {
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

app.post('/api/scouts/:id/transactions', (req, res) => {
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
app.put('/api/transactions/:id', (req, res) => {
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

app.delete('/api/transactions/:id', (req, res) => {
  const transactionId = req.params.id;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    try {
      // First get the transaction details
      db.get(
        'SELECT amount, scout_id, category, date, description FROM transactions WHERE id = ?',
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
          if (transaction.category === 'Transfer') {
            const isOutgoing = transaction.amount < 0;
            const linkedAmount = isOutgoing ? -transaction.amount : -transaction.amount;
            
            // Modified query to find the linked transaction with more specific conditions
            db.get(
              `SELECT id, scout_id, amount, date 
               FROM transactions 
               WHERE category = 'Transfer' 
               AND amount = ? 
               AND date = ?
               AND description = ?
               AND id != ?
               AND scout_id != ?`,
              [linkedAmount, transaction.date, transaction.description, transactionId, transaction.scout_id],
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
                    'DELETE FROM transactions WHERE id IN (?, ?)',
                    [transactionId, linkedTransaction.id],
                    (err) => {
                      if (err) {
                        console.error('Error deleting transactions:', err);
                        db.run('ROLLBACK');
                        res.status(500).json({ error: err.message });
                        return;
                      }

                      console.log('Deleted transactions:', transactionId, linkedTransaction.id);

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
                            [linkedAmount, linkedTransaction.scout_id],
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
                  console.error('No linked transaction found for transfer:', {
                    amount: linkedAmount,
                    date: transaction.date,
                    description: transaction.description,
                    transactionId,
                    scoutId: transaction.scout_id
                  });
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

app.post('/api/transfers', (req, res) => {
  const { fromScoutId, toScoutId, amount, description } = req.body;
  
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
          'INSERT INTO transactions (scout_id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
          [fromId, description, -amount, 'Transfer', new Date().toISOString()]
        );
        
        db.run(
          'UPDATE scouts SET balance = balance - ? WHERE id = ?',
          [amount, fromId]
        );

        // Create deposit transaction for destination account
        db.run(
          'INSERT INTO transactions (scout_id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)',
          [toId, description, amount, 'Transfer', new Date().toISOString()]
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 