import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Spinner, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import ScoutList from './components/ScoutList';
import TransactionForm from './components/TransactionForm';
import AccountDetails from './components/AccountDetails';
import TransferForm from './components/TransferForm';
import ExportButton from './components/ExportButton';
import LoginPage from './components/LoginPage';
import UserManagement from './components/UserManagement';

const API_URL = 'https://your-worker-url.workers.dev/api';

function App() {
  const [scouts, setScouts] = useState([]);
  const [selectedScout, setSelectedScout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Fetch scouts on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchScouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch transactions when a scout is selected
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedScout) {
      fetchTransactions(selectedScout.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScout]);

  const fetchScouts = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/scouts`);
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
      const response = await fetchWithAuth(`${API_URL}/scouts/${scoutId}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const transactions = await response.json();
      
      setScouts(prevScouts => 
        prevScouts.map(scout => 
          scout.id === scoutId 
            ? { ...scout, transactions: transactions || [] }
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
      console.log('Sending request to:', `${API_URL}/scouts`);
      console.log('Request payload:', { name });
      
      const response = await fetchWithAuth(`${API_URL}/scouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Failed to add scout:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url
        });
        throw new Error('Failed to add scout');
      }
      
      const newScout = await response.json();
      setScouts(prev => [...prev, { ...newScout, transactions: [] }]);
      setError(null);
    } catch (err) {
      console.error('Error details:', err);
      setError('Failed to add scout. Please try again.');
    }
  };

  const addTransaction = async (scoutId, transaction) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/scouts/${scoutId}/transactions`, {
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
      const response = await fetchWithAuth(`${API_URL}/transactions/${transactionId}`, {
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
      const response = await fetchWithAuth(`${API_URL}/transactions/${transactionId}`, {
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

  const handleTransfer = async (transferData) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData)
      });
      
      if (!response.ok) throw new Error('Failed to process transfer');
      
      // Refresh data
      await fetchScouts();
      if (selectedScout) {
        await fetchTransactions(selectedScout.id);
      }
      setError(null);
    } catch (err) {
      setError('Failed to process transfer. Please try again.');
    }
  };

  const editScout = async (scoutId, name) => {
    try {
      console.log('Attempting to update scout:', { scoutId, name });
      
      // Convert scoutId to string and ensure it's a valid format
      const url = `${API_URL}/scouts/${String(scoutId)}`;
      console.log('Request URL:', url);
      
      const response = await fetchWithAuth(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Failed to update scout:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url
        });
        throw new Error(errorData?.error || 'Failed to update scout name');
      }

      const updatedScout = await response.json();
      console.log('Scout updated successfully:', updatedScout);

      setScouts(prevScouts =>
        prevScouts.map(scout =>
          scout.id === scoutId
            ? { ...scout, name: updatedScout.name }
            : scout
        )
      );
      setError(null);
    } catch (err) {
      console.error('Error updating scout:', err);
      setError(err.message || 'Failed to update scout name. Please try again.');
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setToken(localStorage.getItem('token'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  const fetchWithAuth = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };

  if (!user || !token) {
    return <LoginPage onLogin={handleLogin} />;
  }

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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Scout Troop Account Tracker</h1>
        <div>
          <span className="me-3">
            Logged in as: {user.username} ({user.role})
          </span>
          <Button variant="outline-danger" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
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
            onEditScout={editScout}
          />
        </Col>
        <Col md={8}>
          <ExportButton scouts={scouts} />
          <TransferForm 
            scouts={scouts}
            onTransfer={handleTransfer}
          />
          {selectedScout && (
            <>
              <TransactionForm 
                onAddTransaction={(transaction) => addTransaction(selectedScout.id, transaction)}
              />
              <AccountDetails 
                scout={{
                  ...scouts.find(s => s.id === selectedScout.id) || selectedScout,
                  transactions: scouts.find(s => s.id === selectedScout.id)?.transactions || []
                }}
                onEditTransaction={editTransaction}
                onDeleteTransaction={deleteTransaction}
              />
            </>
          )}
        </Col>
      </Row>
      {user.role === 'admin' && (
        <Row className="mt-4">
          <Col>
            <UserManagement token={token} />
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default App; 