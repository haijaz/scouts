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
        balance REAL DEFAULT 0
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
  const { name } = req.body;
  db.run('INSERT INTO scouts (name) VALUES (?)', [name], function(err) {
    if (err) {
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
    // First get the transaction amount
    db.get(
      'SELECT amount, scout_id FROM transactions WHERE id = ?',
      [transactionId],
      (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        // Delete the transaction
        db.run(
          'DELETE FROM transactions WHERE id = ?',
          [transactionId],
          (err) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }

            // Update scout balance
            db.run(
              'UPDATE scouts SET balance = balance - ? WHERE id = ?',
              [row.amount, row.scout_id],
              (err) => {
                if (err) {
                  res.status(500).json({ error: err.message });
                  return;
                }
                res.json({ success: true });
              }
            );
          }
        );
      }
    );
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 