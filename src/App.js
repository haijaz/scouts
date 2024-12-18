import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import ScoutList from './components/ScoutList';
import TransactionForm from './components/TransactionForm';
import AccountDetails from './components/AccountDetails';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [scouts, setScouts] = useState([]);
  const [selectedScout, setSelectedScout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch scouts on component mount
  useEffect(() => {
    fetchScouts();
  }, []);

  // Fetch transactions when a scout is selected
  useEffect(() => {
    if (selectedScout) {
      fetchTransactions(selectedScout.id);
    }
  }, [selectedScout]);

  const fetchScouts = async () => {
    try {
      const response = await fetch(`${API_URL}/scouts`);
      if (!response.ok) throw new Error('Failed to fetch scouts');
      const data = await response.json();
      setScouts(data);
      setError(null);
    } catch (err) {
      setError('Failed to load scouts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (scoutId) => {
    try {
      const response = await fetch(`${API_URL}/scouts/${scoutId}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const transactions = await response.json();
      
      setScouts(prevScouts => 
        prevScouts.map(scout => 
          scout.id === scoutId 
            ? { ...scout, transactions } 
            : scout
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to load transactions. Please try again later.');
    }
  };

  const addScout = async (name) => {
    try {
      const response = await fetch(`${API_URL}/scouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!response.ok) throw new Error('Failed to add scout');
      const newScout = await response.json();
      setScouts(prev => [...prev, { ...newScout, transactions: [] }]);
      setError(null);
    } catch (err) {
      setError('Failed to add scout. Please try again.');
    }
  };

  const addTransaction = async (scoutId, transaction) => {
    try {
      const response = await fetch(`${API_URL}/scouts/${scoutId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
      if (!response.ok) throw new Error('Failed to add transaction');
      await fetchScouts(); // Refresh all scouts to get updated balance
      await fetchTransactions(scoutId);
      setError(null);
    } catch (err) {
      setError('Failed to add transaction. Please try again.');
    }
  };

  const editTransaction = async (scoutId, transactionId, updatedTransaction) => {
    try {
      const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTransaction)
      });
      if (!response.ok) throw new Error('Failed to update transaction');
      await fetchScouts(); // Refresh all scouts to get updated balance
      await fetchTransactions(scoutId);
      setError(null);
    } catch (err) {
      setError('Failed to update transaction. Please try again.');
    }
  };

  const deleteTransaction = async (scoutId, transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete transaction');
      await fetchScouts(); // Refresh all scouts to get updated balance
      await fetchTransactions(scoutId);
      setError(null);
    } catch (err) {
      setError('Failed to delete transaction. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h1>Scout Troop Account Tracker</h1>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Row className="mt-4">
        <Col md={4}>
          <ScoutList 
            scouts={scouts} 
            onAddScout={addScout}
            onSelectScout={setSelectedScout}
            selectedScout={selectedScout}
          />
        </Col>
        <Col md={8}>
          {selectedScout && (
            <>
              <TransactionForm 
                onAddTransaction={(transaction) => addTransaction(selectedScout.id, transaction)}
              />
              <AccountDetails 
                scout={scouts.find(s => s.id === selectedScout.id)}
                onEditTransaction={editTransaction}
                onDeleteTransaction={deleteTransaction}
              />
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default App; 