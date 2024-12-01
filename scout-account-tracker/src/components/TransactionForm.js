import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

const CATEGORIES = [
  'Dues',
  'Popcorn Sales',
  'Camp Fees',
  'Equipment',
  'Fundraising',
  'Other'
];

function TransactionForm({ onAddTransaction, initialData, isEditing }) {
  const [transaction, setTransaction] = useState(
    initialData || {
      description: '',
      amount: '',
      type: 'deposit',
      category: '',
      date: new Date().toISOString().split('T')[0]
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (transaction.description && transaction.amount && transaction.category) {
      onAddTransaction({
        ...transaction,
        amount: transaction.type === 'deposit' ? 
          parseFloat(transaction.amount) : 
          -parseFloat(transaction.amount)
      });
      if (!isEditing) {
        setTransaction({ 
          description: '', 
          amount: '', 
          type: 'deposit',
          category: '',
          date: new Date().toISOString().split('T')[0]
        });
      }
    }
  };

  return (
    <div className="mb-4">
      <h3>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</h3>
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                value={transaction.description}
                onChange={(e) => setTransaction({...transaction, description: e.target.value})}
                placeholder="e.g., Popcorn Sales, Dues Payment"
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={transaction.category}
                onChange={(e) => setTransaction({...transaction, category: e.target.value})}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Amount ($)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={transaction.amount}
                onChange={(e) => setTransaction({...transaction, amount: e.target.value})}
                placeholder="0.00"
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={transaction.type}
                onChange={(e) => setTransaction({...transaction, type: e.target.value})}
              >
                <option value="deposit">Deposit</option>
                <option value="payment">Payment</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={transaction.date}
                onChange={(e) => setTransaction({...transaction, date: e.target.value})}
              />
            </Form.Group>
          </Col>
        </Row>
        <Button type="submit">{isEditing ? 'Update' : 'Add'} Transaction</Button>
      </Form>
    </div>
  );
}

export default TransactionForm; 